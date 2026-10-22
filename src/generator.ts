export type Unit = "sentences" | "paragraphs";
export type GenerationRequest = { unit: Unit; count: number };
export type SourceStory = {
  story_id: number;
  title: string;
  edition: number;
  source_url: string;
  revision_url: string;
};
export type GeneratedUnit = SourceStory & { id: number; text: string };

export const SOURCE_URL = "https://es.wikisource.org/wiki/Sub_terra";

export function validateGenerationRequest(unit: unknown, count: unknown): GenerationRequest {
  if (unit !== "sentences" && unit !== "paragraphs") throw new Error("Choose sentences or paragraphs.");
  const maximum = maximumCount(unit);
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

export function parseCountInput(unit: Unit, count: unknown): GenerationRequest {
  const normalized = typeof count === "string" ? count.trim() : count;
  return validateGenerationRequest(unit, normalized === undefined || normalized === "" ? 3 : normalized);
}

function maximumCount(unit: Unit): number {
  return unit === "sentences" ? 20 : 10;
}

export type CountInput = { input: string; request: GenerationRequest; error?: string };

export function updateCountInput(previous: CountInput, input: string): CountInput {
  try {
    return { input, request: parseCountInput(previous.request.unit, input) };
  } catch (error) {
    return { input, request: previous.request, error: error instanceof Error ? error.message : "Enter a valid count." };
  }
}

export function generationQuery(unit: Unit): string {
  const { count } = validateGenerationRequest(unit, maximumCount(unit));
  const from =
    unit === "sentences"
      ? "sentences AS u JOIN paragraphs AS p ON p.id = u.paragraph_id JOIN stories AS s ON s.id = p.story_id"
      : "paragraphs AS u JOIN stories AS s ON s.id = u.story_id";
  return `SELECT u.id, u.text, s.id AS story_id, s.title, s.edition, s.source_url, s.revision_url
FROM ${from}
ORDER BY RANDOM() LIMIT ${count}`;
}

export function formatGeneratedText(settings: GenerationRequest, rows: GeneratedUnit[]): string {
  const { unit, count } = validateGenerationRequest(settings.unit, settings.count);
  if (
    rows.length !== count ||
    rows.some((row) => !row.text.trim()) ||
    new Set(rows.map((row) => row.id)).size !== count
  ) {
    throw new Error("Not enough source text is available. Try again or choose a smaller count.");
  }
  return rows.map((row) => row.text.trim()).join(unit === "sentences" ? " " : "\n\n");
}

export function selectPreview(
  request: GenerationRequest,
  pool: GeneratedUnit[],
): { text: string; selected: GeneratedUnit[] } {
  // A generation owns the whole bounded pool, including rows not currently displayed.
  formatGeneratedText({ unit: request.unit, count: maximumCount(request.unit) }, pool);
  const selected = pool.slice(0, request.count);
  return { text: formatGeneratedText(request, selected), selected };
}

export function pasteActionTitle(name: unknown): string {
  const target = typeof name === "string" ? name.trim() : "";
  return target && target.toLowerCase() !== "raycast" && !/[\r\n\t]/.test(target)
    ? `Paste to ${target}`
    : "Paste to Active App";
}
