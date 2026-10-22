import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import {
  formatGeneratedText,
  generationQuery,
  parseCountInput,
  validateGenerationRequest,
  selectPreview,
  updateCountInput,
  pasteActionTitle,
  orderedActions,
  type CountInput,
  type GeneratedUnit,
  type GenerationRequest,
} from "../src/generator.ts";

test("validates strict positive counts and unit-specific limits", () => {
  for (const [unit, maximum] of [
    ["sentences", 20],
    ["paragraphs", 10],
  ] as const) {
    assert.deepEqual(validateGenerationRequest(unit, "1"), { unit, count: 1 });
    assert.deepEqual(validateGenerationRequest(unit, maximum), { unit, count: maximum });
    for (const invalid of [
      "",
      " ",
      " 3",
      "3 ",
      "03",
      "1.0",
      "1e1",
      "+1",
      "-1",
      "0",
      "1.5",
      "3x",
      "1; DROP TABLE stories",
      maximum + 1,
      NaN,
      Infinity,
      null,
      true,
    ]) {
      assert.throws(() => validateGenerationRequest(unit, invalid), /whole number/);
    }
  }
  assert.throws(() => validateGenerationRequest("words", 3), /Choose sentences or paragraphs/);
});

test("defaults omitted or blank count inputs to three for either unit", () => {
  for (const unit of ["paragraphs", "sentences"] as const) {
    for (const count of [undefined, "", " ", "\t\n"]) {
      assert.deepEqual(parseCountInput(unit, count), { unit, count: 3 });
    }
    assert.deepEqual(parseCountInput(unit, "  4\t"), { unit, count: 4 });
  }
});

test("rejects invalid nonblank count inputs", () => {
  for (const [unit, maximum] of [
    ["paragraphs", 10],
    ["sentences", 20],
  ] as const) {
    for (const count of ["1", String(maximum)]) {
      assert.deepEqual(parseCountInput(unit, count), { unit, count: Number(count) });
    }
    for (const count of [
      "03",
      "1.0",
      "1e1",
      "+1",
      "-1",
      "0",
      "1.5",
      "3x",
      " 0 ",
      "1; DROP TABLE stories",
      String(maximum + 1),
      "9007199254740993",
      null,
      true,
    ]) {
      assert.throws(() => parseCountInput(unit, count), new RegExp(`whole number from 1 to ${maximum}`));
    }
  }
});

test("uses the configured default for an empty field and when clearing edited input", () => {
  for (const [unit, defaultCount] of [
    ["paragraphs", 7],
    ["sentences", 14],
  ] as const) {
    let state: CountInput = { input: "", request: parseCountInput(unit, "", defaultCount) };
    assert.equal(state.input, "");
    assert.deepEqual(state.request, { unit, count: defaultCount });
    state = updateCountInput(state, "2", defaultCount);
    assert.equal(state.request.count, 2);
    state = updateCountInput(state, "invalid", defaultCount);
    assert.equal(state.request.count, 2);
    assert.match(state.error ?? "", /whole number/);
    for (const input of ["", " ", "\t\n"]) {
      state = updateCountInput(state, input, defaultCount);
      assert.equal(state.input, input);
      assert.deepEqual(state.request, { unit, count: defaultCount });
      assert.equal(state.error, undefined);
    }
    assert.throws(() => parseCountInput(unit, "0", defaultCount), /whole number/);
    assert.throws(() => parseCountInput(unit, "", 21), /whole number/);
  }
});

function fixture(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE stories(id INTEGER PRIMARY KEY, title TEXT, edition INTEGER, source_url TEXT, revision_url TEXT);
    CREATE TABLE paragraphs(id INTEGER PRIMARY KEY, story_id INTEGER REFERENCES stories, position INTEGER, text TEXT);
    CREATE TABLE sentences(id INTEGER PRIMARY KEY, paragraph_id INTEGER REFERENCES paragraphs, position INTEGER, text TEXT);
    INSERT INTO stories VALUES (1, 'Story A', 1904, 'https://example.com/a', 'https://example.com/a?oldid=1'), (2, 'Story B', 1917, 'https://example.com/b', 'https://example.com/b?oldid=2');
  `);
  for (let id = 1; id <= 12; id++) {
    db.prepare("INSERT INTO paragraphs VALUES (?, ?, ?, ?)").run(id, (id % 2) + 1, id, `Párrafo ${id}. Otra oración.`);
    for (let position = 1; position <= 2; position++) {
      db.prepare("INSERT INTO sentences VALUES (?, ?, ?, ?)").run(
        (id - 1) * 2 + position,
        id,
        position,
        `Oración ${id}-${position}.`,
      );
    }
  }
  return db;
}

test("selects complete independent units with correct story context and no repeated source rows", () => {
  const db = fixture();
  try {
    for (const settings of [
      { unit: "sentences", count: 20 },
      { unit: "paragraphs", count: 10 },
    ] satisfies GenerationRequest[]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rows = db.prepare(generationQuery(settings.unit)).all() as GeneratedUnit[];
        assert.equal(rows.length, settings.count);
        assert.equal(new Set(rows.map((row) => row.id)).size, settings.count);
        for (const row of rows) {
          const expected =
            settings.unit === "paragraphs"
              ? db
                  .prepare(
                    "SELECT p.text, s.id AS story_id, s.title, s.edition, s.source_url, s.revision_url FROM paragraphs p JOIN stories s ON p.story_id = s.id WHERE p.id = ?",
                  )
                  .get(row.id)
              : db
                  .prepare(
                    "SELECT u.text, s.id AS story_id, s.title, s.edition, s.source_url, s.revision_url FROM sentences u JOIN paragraphs p ON u.paragraph_id = p.id JOIN stories s ON p.story_id = s.id WHERE u.id = ?",
                  )
                  .get(row.id);
          assert.deepEqual({ ...row, id: undefined }, { ...expected, id: undefined });
        }
        const text = formatGeneratedText(settings, rows);
        assert.equal(text, rows.map((row) => row.text).join(settings.unit === "sentences" ? " " : "\n\n"));
      }
    }
    assert.equal(db.prepare("SELECT count(*) AS total FROM sentences").get()?.total, 24);
  } finally {
    db.close();
  }
});

test("formats plain Spanish text and rejects incomplete, blank, or duplicate results", () => {
  const db = fixture();
  try {
    const settings: GenerationRequest = { unit: "paragraphs", count: 2 };
    const rows = (db.prepare(generationQuery(settings.unit)).all() as GeneratedUnit[]).slice(0, 2);
    rows[0].text = "  ¿Qué pasó? —Nada.  ";
    rows[1].text = "¡Aquí está!";
    assert.equal(formatGeneratedText(settings, rows), "¿Qué pasó? —Nada.\n\n¡Aquí está!");
    assert.equal(formatGeneratedText({ unit: "sentences", count: 2 }, rows), "¿Qué pasó? —Nada. ¡Aquí está!");
    assert.throws(() => formatGeneratedText(settings, []), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, rows.slice(0, 1)), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, [rows[0], rows[0]]), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, [{ ...rows[0], text: " " }, rows[1]]), /Not enough source text/);
  } finally {
    db.close();
  }
});

test("count edits preserve ordered prefixes, formatting, and only displayed attribution", () => {
  const db = fixture();
  try {
    for (const unit of ["paragraphs", "sentences"] as const) {
      const pool = db.prepare(generationQuery(unit)).all() as GeneratedUnit[];
      const original = JSON.stringify(pool);
      let state: CountInput = { input: "3", request: parseCountInput(unit, "3") };
      const initial = selectPreview(state.request, pool);
      state = updateCountInput(state, "5");
      const grown = selectPreview(state.request, pool);
      assert.deepEqual(grown.selected.slice(0, 3), initial.selected);
      state = updateCountInput(state, "2");
      const shrunk = selectPreview(state.request, pool);
      assert.deepEqual(shrunk.selected, grown.selected.slice(0, 2));
      assert.equal(shrunk.text, shrunk.selected.map((row) => row.text).join(unit === "sentences" ? " " : "\n\n"));
      state = updateCountInput(state, "5");
      assert.deepEqual(selectPreview(state.request, pool), grown);
      for (const input of ["bad", "0", "03", "1.5", "21"]) {
        state = updateCountInput(state, input);
        assert.equal(state.input, input);
        assert.match(state.error ?? "", /whole number/);
        assert.deepEqual(selectPreview(state.request, pool), grown);
      }
      for (const input of ["", " ", "\t\n"]) {
        state = updateCountInput(state, input);
        assert.equal(state.input, input);
        assert.equal(state.error, undefined);
        assert.deepEqual(selectPreview(state.request, pool), initial);
      }
      state = updateCountInput(state, "1");
      assert.equal(selectPreview(state.request, pool).selected.length, 1);
      assert.equal(JSON.stringify(pool), original);
    }
  } finally {
    db.close();
  }
});

test("rejects incomplete or corrupt pools even if the requested prefix would be usable", () => {
  const db = fixture();
  try {
    const pool = db.prepare(generationQuery("paragraphs")).all() as GeneratedUnit[];
    const request = { unit: "paragraphs", count: 1 } as const;
    for (const broken of [
      [],
      pool.slice(0, 3),
      [...pool.slice(0, 9), pool[0]],
      [...pool.slice(0, 9), { ...pool[9], text: " " }],
    ]) {
      assert.throws(() => selectPreview(request, broken), /Not enough source text/);
    }
    assert.throws(() => selectPreview({ unit: "paragraphs", count: 11 }, pool), /whole number/);
    assert.throws(() => generationQuery("words" as never), /Choose sentences or paragraphs/);
  } finally {
    db.close();
  }
});

test("paste label uses a usable captured application name or the authorized fallback", () => {
  assert.equal(pasteActionTitle("  Visual Studio Code  "), "Paste to Visual Studio Code");
  for (const name of [undefined, null, "", "  ", "Raycast", "raycast", "App\nName", 42]) {
    assert.equal(pasteActionTitle(name), "Paste to Active App");
  }
});

test("the configured primary action comes first while both actions remain available", () => {
  assert.deepEqual(orderedActions("copy"), ["copy", "paste"]);
  assert.deepEqual(orderedActions("paste"), ["paste", "copy"]);
});
