const wordSegmenter = new Intl.Segmenter("es", { granularity: "word" });
const characterSegmenter = new Intl.Segmenter("es", { granularity: "grapheme" });

export type TextStatistics = { characters: number; words: number };

export function textStatistics(text: string): TextStatistics {
  let characters = 0;
  let words = 0;
  const graphemes = characterSegmenter.segment(text)[Symbol.iterator]();
  while (!graphemes.next().done) characters++;
  for (const segment of wordSegmenter.segment(text)) {
    if (segment.isWordLike) words++;
  }
  return { characters, words };
}
