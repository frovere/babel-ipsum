# Vibed Ipsum

Generate Spanish placeholder text from Baldomero Lillo’s _Sub terra_ in Raycast. The extension works entirely offline on macOS and includes all thirteen stories indexed by [Wikisource](https://es.wikisource.org/wiki/Sub_terra).

Choose **1–20 sentences** or **1–10 paragraphs**, generate a preview, then copy or paste the result. **Regenerate** (`⌘R`) selects another set. Copy and paste dismiss Raycast. Your unit and count are remembered; the generated text is never saved as history. The first launch defaults to three paragraphs.

Each result selects complete source units at random across the collection, without repeating a source unit within that result. Separate generations may overlap. Sentence output is joined with spaces; paragraphs are separated by blank lines. Attribution and source links are available through **Information** and are not appended to copied text.

## Run locally

Use Node.js **22.13 or newer**, npm, and Raycast on macOS. Python 3 is needed only to rebuild the source extraction or run its tests. The prepared SQLite database is checked in; launching the extension needs no database setup or network requests.

```sh
npm ci
npm run dev
```

Open **Generate Sub Terra Text** in Raycast. Development mode registers the extension with your local Raycast installation. To compile without registering it, run `npm run build`; output stays in this repository’s `dist/` directory.

## Checks

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:extraction
npm run build
```

Tests exercise count validation, saved-setting recovery, random selection against SQLite, plain-text formatting, source extraction, sentence boundaries, spelling corrections, corpus relationships, and rebuilding the bundled database from its inputs.

## Corpus preparation

The runtime reads `assets/subterra.sqlite` through Raycast’s existing `useSQL` utility. The database is read-only and preserves the relationship between stories, paragraphs, and sentences. No additional SQLite package is required.

The development inputs are kept in `corpus/`:

- `stories.json`: canonical story URLs and edition grouping.
- `sources/`: retrieved HTML snapshots, retained for an offline audit trail.
- `original.json`: extracted source paragraphs, revision URLs, and snapshot hashes.
- `corrections.json`: explicit whole-word spelling and accent replacements.
- `edits.json`: contextual transcription and spelling corrections, matched exactly against a story and paragraph.
- [Modernization policy](corpus/MODERNIZATION.md) and [source attribution](corpus/NOTICE.md).

Rebuild from the checked-in snapshots without fetching anything:

```sh
npm run corpus:build
npm test
```

To refresh the sources deliberately, run `npm run corpus:fetch`, review the changed HTML, then run `npm run corpus:extract`. Review spelling corrections and contextual edits before rebuilding. Contextual edits fail the build if their expected source no longer matches exactly once; source updates must be reviewed rather than silently accepted.

Sentence preparation recognizes terminal punctuation, abbreviations, decimal values, ellipses, and dialogue attributions. A final clause introducing speech with a colon is retained in paragraph mode and excluded from standalone sentence selection. This is an edited placeholder-text corpus, not a scholarly edition; preserved wording may contain period vocabulary and grammar.

## Artwork

The extension uses an amber mining-oil-lamp icon. Generated masters and the optional landscape promotional illustration are in [artwork/](artwork/README.md), with the [exact imagegen prompts](artwork/PROMPTS.md). Only the 512-pixel runtime icon is packaged. Promotional art is separate from actual Raycast screenshots.

Code is [MIT licensed](LICENSE); book text follows its [source terms](corpus/LICENSE.md).
