import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import {
  DEFAULT_SETTINGS,
  formatGeneratedText,
  generationQuery,
  restoreSettings,
  validateSettings,
  type GeneratedUnit,
  type Settings,
} from "../src/generator.ts";

test("validates strict positive counts and unit-specific limits", () => {
  for (const [unit, maximum] of [
    ["sentences", 20],
    ["paragraphs", 10],
  ] as const) {
    assert.deepEqual(validateSettings(unit, "1"), { unit, count: 1 });
    assert.deepEqual(validateSettings(unit, maximum), { unit, count: maximum });
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
      assert.throws(() => validateSettings(unit, invalid), /whole number/);
    }
  }
  assert.throws(() => validateSettings("words", 3), /Choose sentences or paragraphs/);
});

test("restores valid saved choices and defaults invalid persisted values", () => {
  assert.deepEqual(restoreSettings({ unit: "sentences", count: 20 }), { unit: "sentences", count: 20 });
  for (const invalid of [
    undefined,
    null,
    [],
    "paragraphs",
    { unit: "paragraphs", count: 11 },
    { unit: "words", count: 3 },
    { unit: "sentences" },
  ]) {
    assert.deepEqual(restoreSettings(invalid), DEFAULT_SETTINGS);
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
    ] satisfies Settings[]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rows = db.prepare(generationQuery(settings)).all() as GeneratedUnit[];
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
    const settings: Settings = { unit: "paragraphs", count: 2 };
    const rows = db.prepare(generationQuery(settings)).all() as GeneratedUnit[];
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
