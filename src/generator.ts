export type Unit = "sentences" | "paragraphs";
export type Settings = { unit: Unit; count: number };
export type SourceStory = {
  story_id: number;
  title: string;
  edition: number;
  source_url: string;
  revision_url: string;
};
export type GeneratedUnit = SourceStory & { id: number; text: string };

export const DEFAULT_SETTINGS: Settings = { unit: "paragraphs", count: 3 };
export const SOURCE_URL = "https://es.wikisource.org/wiki/Sub_terra";

export function validateSettings(unit: unknown, count: unknown): Settings {
  if (unit !== "sentences" && unit !== "paragraphs") throw new Error("Choose sentences or paragraphs.");
  const maximum = unit === "sentences" ? 20 : 10;
  if (
    (typeof count !== "string" && typeof count !== "number") ||
    !/^[1-9]\d*$/.test(String(count)) ||
    !Number.isSafeInteger(Number(count)) ||
    Number(count) > maximum
  ) {
    throw new Error(`Enter a whole number from 1 to ${maximum}.`);
  }
  return { unit, count: Number(count) };
}

export function restoreSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null || !("unit" in value) || !("count" in value)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    return validateSettings(value.unit, value.count);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function generationQuery(settings: Settings): string {
  const { unit, count } = validateSettings(settings.unit, settings.count);
  const from =
    unit === "sentences"
      ? "sentences AS u JOIN paragraphs AS p ON p.id = u.paragraph_id JOIN stories AS s ON s.id = p.story_id"
      : "paragraphs AS u JOIN stories AS s ON s.id = u.story_id";
  return `SELECT u.id, u.text, s.id AS story_id, s.title, s.edition, s.source_url, s.revision_url
FROM ${from}
ORDER BY RANDOM() LIMIT ${count}`;
}

export function formatGeneratedText(settings: Settings, rows: GeneratedUnit[]): string {
  const { unit, count } = validateSettings(settings.unit, settings.count);
  if (
    rows.length !== count ||
    rows.some((row) => !row.text.trim()) ||
    new Set(rows.map((row) => row.id)).size !== count
  ) {
    throw new Error("Not enough source text is available. Try again or choose a smaller count.");
  }
  return rows.map((row) => row.text.trim()).join(unit === "sentences" ? " " : "\n\n");
}
