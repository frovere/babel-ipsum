import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

export function modernizeParagraph(text, story, paragraph, corrections, edits) {
  let modernized = text.normalize("NFC").replace(/\p{L}+/gu, (word) => {
    const replacement = corrections[word.toLocaleLowerCase("es")];
    if (replacement === undefined) return word;
    if (word === word.toLocaleUpperCase("es")) return replacement.toLocaleUpperCase("es");
    if (word[0] === word[0].toLocaleUpperCase("es")) {
      return replacement[0].toLocaleUpperCase("es") + replacement.slice(1);
    }
    return replacement;
  });
  for (const edit of edits.filter((edit) => edit.story === story && edit.paragraph === paragraph)) {
    if (!edit.find || modernized.split(edit.find).length !== 2) {
      throw new Error(`${story}, paragraph ${paragraph}: correction must match exactly once: ${edit.find}`);
    }
    modernized = modernized.replace(edit.find, edit.replace);
  }
  return modernized.replace(/\s+/gu, " ").trim();
}

export function segmentSentences(paragraph) {
  const sentences = [];
  let start = 0;
  for (let index = 0; index < paragraph.length; index++) {
    if (!/[.!?…]/u.test(paragraph[index])) continue;
    if (paragraph[index] === ".") {
      if (/\d/u.test(paragraph[index - 1] ?? "") && /\d/u.test(paragraph[index + 1] ?? "")) continue;
      const prefix = paragraph.slice(start, index + 1);
      if (
        /(?<!\p{L})(?:Sr|Sra|Srta|Dr|Dra|D|Dña|Ud|Uds|Vd|Vds|Mr|Mrs|St|etc|pág|págs|núm|vol|cap)\.$/iu.test(prefix) ||
        /(?<!\p{L})\p{Lu}\.$/u.test(prefix)
      )
        continue;
    }
    let end = index + 1;
    while (end < paragraph.length && /[.!?…»”"')\]]/u.test(paragraph[end])) end++;
    const rest = paragraph.slice(end).trimStart();
    const following = rest.replace(/^[—–\-«“"'(\[\s]+/u, "");
    // Keep lowercase dialogue attributions attached to the preceding speech.
    // Split before a new capitalized dialogue turn, which ICU can leave joined.
    if (rest && !/^[¿¡\p{Lu}]/u.test(following)) {
      index = end - 1;
      continue;
    }
    const sentence = paragraph.slice(start, end).trim();
    if (/\p{L}/u.test(sentence)) {
      sentences.push(sentence);
      start = end;
    }
    index = end - 1;
  }
  // Speech introductions ending in a colon remain available as paragraphs,
  // but their incomplete final clause isn't offered as a standalone sentence.
  return sentences;
}

export function buildCorpus(outputPath = join(root, "assets/subterra.sqlite")) {
  const original = readJSON("corpus/original.json");
  const corrections = readJSON("corpus/corrections.json");
  const edits = readJSON("corpus/edits.json");
  if (original.stories.length !== 13 || new Set(original.stories.map((story) => story.id)).size !== 13) {
    throw new Error("The corpus must contain all thirteen distinct stories.");
  }
  for (const edit of edits) {
    const story = original.stories.find((story) => story.slug === edit.story);
    if (!story || !Number.isInteger(edit.paragraph) || !story.paragraphs[edit.paragraph - 1]) {
      throw new Error(`Unknown correction target: ${edit.story}, paragraph ${edit.paragraph}`);
    }
  }
  const temporaryPath = `${outputPath}.building`;
  // Recreate the generated database without ever touching the installed corpus.
  writeFileSync(temporaryPath, "");
  const db = new DatabaseSync(temporaryPath);
  const stats = [];
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA user_version = 1;
      CREATE TABLE stories (
        id INTEGER PRIMARY KEY, title TEXT NOT NULL, edition INTEGER NOT NULL,
        source_url TEXT NOT NULL, revision_url TEXT NOT NULL
      );
      CREATE TABLE paragraphs (
        id INTEGER PRIMARY KEY, story_id INTEGER NOT NULL REFERENCES stories(id),
        position INTEGER NOT NULL, text TEXT NOT NULL CHECK(length(text) > 0),
        UNIQUE(story_id, position)
      );
      CREATE TABLE sentences (
        id INTEGER PRIMARY KEY, paragraph_id INTEGER NOT NULL REFERENCES paragraphs(id),
        position INTEGER NOT NULL, text TEXT NOT NULL CHECK(length(text) > 0),
        UNIQUE(paragraph_id, position)
      );
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      BEGIN;
    `);
    const insertStory = db.prepare("INSERT INTO stories VALUES (?, ?, ?, ?, ?)");
    const insertParagraph = db.prepare("INSERT INTO paragraphs VALUES (?, ?, ?, ?)");
    const insertSentence = db.prepare("INSERT INTO sentences VALUES (?, ?, ?, ?)");
    let paragraphId = 0;
    let sentenceId = 0;
    for (const story of original.stories) {
      insertStory.run(story.id, story.title, story.edition, story.url, story.revisionUrl);
      let storySentences = 0;
      for (const [index, source] of story.paragraphs.entries()) {
        const paragraph = modernizeParagraph(source, story.slug, index + 1, corrections, edits);
        if (!paragraph || /<\/?(?:p|span|div)\b|Obtenido de|Se respeta la ortografía|Descargar como/u.test(paragraph)) {
          throw new Error(`${story.slug}, paragraph ${index + 1}: unexpected source furniture`);
        }
        insertParagraph.run(++paragraphId, story.id, index + 1, paragraph);
        const sentences = segmentSentences(paragraph);
        for (const [position, sentence] of sentences.entries()) {
          insertSentence.run(++sentenceId, paragraphId, position + 1, sentence);
          storySentences++;
        }
      }
      stats.push({ title: story.title, paragraphs: story.paragraphs.length, sentences: storySentences });
      if (storySentences < 20) throw new Error(`${story.slug}: unexpectedly few complete sentences`);
    }
    const inputHash = createHash("sha256").update(JSON.stringify({ original, corrections, edits })).digest("hex");
    const metadata = {
      author: "Baldomero Lillo",
      title: "Sub terra",
      source: original.source,
      retrieved_on: original.retrievedOn,
      input_sha256: inputHash,
      modernization:
        "Spelling and accents modernized; documented transcription errors corrected. See corpus/MODERNIZATION.md.",
      attribution: "Wikisource contributors; source and revision links are recorded per story. See corpus/NOTICE.md.",
      sentence_policy:
        "Terminal-punctuated excerpts; abbreviations and lowercase dialogue attributions stay attached. Incomplete speech introductions remain in paragraph mode only.",
    };
    for (const [key, value] of Object.entries(metadata))
      db.prepare("INSERT INTO metadata VALUES (?, ?)").run(key, value);
    db.exec("COMMIT; VACUUM;");
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Invalid corpus database.");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Broken source relationships.");
  } finally {
    db.close();
  }
  renameSync(temporaryPath, outputPath);
  return stats;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stats = buildCorpus();
  console.table(stats);
  console.log("Built assets/subterra.sqlite from the checked-in source snapshots and spelling corrections.");
}
