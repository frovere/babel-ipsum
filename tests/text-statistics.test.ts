import assert from "node:assert/strict";
import { test } from "node:test";
import { selectPreview, updateCountInput, type CountInput, type GeneratedUnit } from "../src/generator.ts";
import { textStatistics } from "../src/text-statistics.ts";

test("counts empty, whitespace, and punctuation without inventing words", () => {
  assert.deepEqual(textStatistics(""), { characters: 0, words: 0 });
  assert.deepEqual(textStatistics("\t \n"), { characters: 3, words: 0 });
  assert.deepEqual(textStatistics("— ¡¿! —"), { characters: 7, words: 0 });
});

test("recognizes Spanish words across punctuation and Unicode spaces", () => {
  assert.deepEqual(textStatistics("Hola—mundo"), { characters: 10, words: 2 });
  assert.deepEqual(textStatistics("¡Hola!¿Cómo estás?"), { characters: 18, words: 3 });
  assert.deepEqual(textStatistics("uno\u00a0dos"), { characters: 7, words: 2 });
  assert.deepEqual(textStatistics("uno\u200bdos"), { characters: 7, words: 2 });
});

test("counts graphemes for accents, surrogate pairs, emoji sequences, and flags", () => {
  assert.deepEqual(textStatistics("café cafe\u0301"), { characters: 9, words: 2 });
  assert.deepEqual(textStatistics("😀"), { characters: 1, words: 0 });
  assert.deepEqual(textStatistics("👩🏽‍💻 🇨🇱"), { characters: 3, words: 0 });
});

test("includes paragraph separators and treats CRLF as one grapheme", () => {
  assert.deepEqual(textStatistics("uno\n\ndos"), { characters: 8, words: 2 });
  assert.deepEqual(textStatistics("uno\r\n\r\ndos"), { characters: 8, words: 2 });
});

test("statistics follow the exact formatted preview and retained pool prefixes", () => {
  for (const unit of ["paragraphs", "sentences"] as const) {
    const pool: GeneratedUnit[] = Array.from({ length: unit === "paragraphs" ? 10 : 20 }, (_, index) => ({
      id: index + 1,
      text: ["  ¡Hola!  ", "¿Qué tal?", "café."][index] ?? "Texto oculto.",
      story_id: 1,
      title: "Attribution is excluded from statistics",
      edition: 1904,
      source_url: "https://example.com/story",
      revision_url: "https://example.com/revision",
    }));
    let state: CountInput = { input: "1", request: { unit, count: 1 } };
    const initial = selectPreview(state.request, pool);
    assert.equal(initial.text, "¡Hola!");
    assert.deepEqual(textStatistics(initial.text), { characters: 6, words: 1 });

    state = updateCountInput(state, "2");
    const expanded = selectPreview(state.request, pool);
    assert.equal(expanded.text, unit === "paragraphs" ? "¡Hola!\n\n¿Qué tal?" : "¡Hola! ¿Qué tal?");
    assert.deepEqual(textStatistics(expanded.text), { characters: unit === "paragraphs" ? 17 : 16, words: 3 });

    state = updateCountInput(state, "invalid");
    assert.ok(state.error);
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), textStatistics(expanded.text));

    state = updateCountInput(state, "1");
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), { characters: 6, words: 1 });
    state = updateCountInput(state, "3");
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), {
      characters: unit === "paragraphs" ? 24 : 22,
      words: 4,
    });

    const regenerated = pool.map((row) => ({ ...row, text: "Otro texto." }));
    assert.deepEqual(textStatistics(selectPreview(state.request, regenerated).text), {
      characters: unit === "paragraphs" ? 37 : 35,
      words: 6,
    });
  }
});
