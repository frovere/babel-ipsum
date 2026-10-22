import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { buildCorpus, modernizeParagraph, segmentSentences } from "../scripts/build-corpus.mjs";

test("segments Spanish questions, dialogue, abbreviations, ellipses and decimal values", () => {
  assert.deepEqual(segmentSentences("El Sr. Pérez llegó. ¿Qué pasó? —Nada. «Buenas noches.»"), [
    "El Sr. Pérez llegó.",
    "¿Qué pasó?",
    "—Nada.",
    "«Buenas noches.»",
  ]);
  assert.deepEqual(segmentSentences("—¿Vienes? —preguntó Juan. —Sí, señor."), [
    "—¿Vienes? —preguntó Juan.",
    "—Sí, señor.",
  ]);
  assert.deepEqual(segmentSentences("Se detuvo... Luego siguió. El Dr. Díaz pagó 2.50 pesos."), [
    "Se detuvo...",
    "Luego siguió.",
    "El Dr. Díaz pagó 2.50 pesos.",
  ]);
  assert.deepEqual(segmentSentences("Llegó. Y dijo:"), ["Llegó."]);
  assert.deepEqual(segmentSentences("Y dijo:"), []);
  assert.deepEqual(segmentSentences("...¡Con qué desesperados clamores! Luego calló."), [
    "...¡Con qué desesperados clamores!",
    "Luego calló.",
  ]);
});

test("modernizes whole words and applies only exact contextual corrections", () => {
  const corrections = { i: "y", mui: "muy", habia: "había", fué: "fue" };
  const edits = [{ story: "sample", paragraph: 1, find: "mas luz", replace: "más luz" }];
  assert.equal(
    modernizeParagraph("I habia mui poca luz; pidió mas luz. Fué así.", "sample", 1, corrections, edits),
    "Y había muy poca luz; pidió más luz. Fue así.",
  );
  assert.equal(modernizeParagraph("I HABIA MINA.", "sample", 2, corrections, edits), "Y HABÍA MINA.");
  assert.throws(() => modernizeParagraph("Otro texto.", "sample", 1, corrections, edits), /match exactly once/);
  assert.throws(() => modernizeParagraph("mas luz, mas luz.", "sample", 1, corrections, edits), /match exactly once/);
});

test("rebuilds a complete, relational, immutable corpus from the checked-in sources", () => {
  const directory = mkdtempSync(join(process.cwd(), ".corpus-test-"));
  const database = join(directory, "corpus.sqlite");
  try {
    const stats = buildCorpus(database);
    assert.equal(stats.length, 13);
    const db = new DatabaseSync(database, { readOnly: true });
    try {
      assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
      assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
      assert.equal(db.prepare("SELECT count(*) AS total FROM stories WHERE edition = 1904").get().total, 8);
      assert.equal(db.prepare("SELECT count(*) AS total FROM stories WHERE edition = 1917").get().total, 5);
      assert.ok(stats.every((story) => story.paragraphs >= 10 && story.sentences >= 20));
      const original = JSON.parse(readFileSync("corpus/original.json", "utf8"));
      assert.equal(
        db.prepare("SELECT count(*) AS total FROM paragraphs").get().total,
        original.stories.reduce((total, story) => total + story.paragraphs.length, 0),
      );
      assert.match(
        db.prepare("SELECT text FROM paragraphs WHERE id = 1").get().text,
        /^La extracción de un caballo en la mina, acontecimiento no muy frecuente, había agrupado/,
      );
      const storyParagraph = db.prepare(
        "SELECT p.text FROM paragraphs p JOIN stories s ON s.id = p.story_id WHERE s.title = ? AND p.position = ?",
      );
      assert.match(storyParagraph.get("Cañuela y Petaca", 7).text, /emprendiendo en seguida/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 36).text, /pólvora estuviera chueca/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /le señaló entonces la boca del cañón/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /silbidos surcaron el aire/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /se fabricaría un trabuco/);
      assert.throws(() => db.exec("DELETE FROM stories"), /readonly/i);
      for (const table of ["paragraphs", "sentences"]) {
        const rows = db.prepare(`SELECT id, text FROM ${table} ORDER BY RANDOM() LIMIT 20`).all();
        assert.equal(rows.length, 20);
        assert.equal(new Set(rows.map((row) => row.id)).size, 20);
        assert.ok(rows.every((row) => row.text.trim() && !/[\n<>]/u.test(row.text)));
      }
      const sentences = db
        .prepare("SELECT u.text, p.text AS paragraph FROM sentences u JOIN paragraphs p ON u.paragraph_id = p.id")
        .all();
      assert.ok(sentences.every((row) => row.paragraph.includes(row.text)));
      assert.ok(sentences.every((row) => /[.!?…][»”"')\]]*$/u.test(row.text)));
    } finally {
      db.close();
    }
    // Catch stale packaged content without depending on SQLite's file-header
    // version, which can differ across supported Node.js releases.
    const rebuilt = new DatabaseSync(database, { readOnly: true });
    const packaged = new DatabaseSync("assets/subterra.sqlite", { readOnly: true });
    try {
      for (const table of ["stories", "paragraphs", "sentences", "metadata"]) {
        const order = table === "metadata" ? "key" : "id";
        assert.deepEqual(
          packaged.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all(),
          rebuilt.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all(),
        );
      }
    } finally {
      rebuilt.close();
      packaged.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
