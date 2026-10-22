import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const stories = JSON.parse(readFile("corpus/stories.json"));

function readFile(path) {
  return readFileSync(join(root, path), "utf8");
}

async function fetchPage(url, title) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "VibedIpsumCorpusBuilder/1.0 (personal offline Raycast extension)",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.text();
    if (![429, 503].includes(response.status) || attempt === 2) {
      throw new Error(`${title}: source returned HTTP ${response.status}; existing snapshots have been kept`);
    }
    const retryAfter = response.headers.get("retry-after");
    const requestedDelay =
      retryAfter && /^\d+$/.test(retryAfter)
        ? Number(retryAfter) * 1000
        : retryAfter
          ? Date.parse(retryAfter) - Date.now()
          : 10_000 * (attempt + 1);
    const delay = Math.min(60_000, Math.max(1000, Number.isFinite(requestedDelay) ? requestedDelay : 10_000));
    await response.body?.cancel();
    console.log(`${title}: source is busy; retrying in ${Math.ceil(delay / 1000)} seconds`);
    await setTimeout(delay);
  }
}

// Explicit development operation. Runtime generation never makes network requests.
const snapshots = [];
for (const story of stories) {
  const title = decodeURIComponent(new URL(story.url).pathname.replace("/wiki/", ""));
  const url = `https://es.wikisource.org/w/rest.php/v1/page/${encodeURIComponent(title)}/html`;
  const html = await fetchPage(url, story.title);
  if (!html.includes("mw-parser-output") || !html.includes("revision/")) {
    throw new Error(`${story.title}: unexpected source response; existing snapshots have been kept`);
  }
  snapshots.push({ story, html });
  console.log(`Fetched ${story.title}`);
  await setTimeout(1000);
}
if (process.argv.includes("--check")) {
  console.log("All thirteen sources are reachable; existing snapshots have been kept.");
} else {
  // Fetch every story successfully before replacing any source snapshots.
  for (const { story, html } of snapshots) writeFileSync(join(root, `corpus/sources/${story.slug}.html`), html);
  writeFileSync(
    join(root, "corpus/retrieval.json"),
    JSON.stringify({ retrievedOn: new Date().toISOString().slice(0, 10), method: "Wikimedia REST HTML API" }, null, 2) +
      "\n",
  );
  console.log("Review source changes, re-extract, and check existing contextual corrections before rebuilding.");
}
