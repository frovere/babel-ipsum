# Vibed Ipsum

Generate Spanish placeholder text from Baldomero Lillo’s _Sub terra_ in Raycast. The extension works entirely offline on macOS and includes all thirteen stories indexed by [Wikisource](https://es.wikisource.org/wiki/Sub_terra).

Open **Generate Sub Terra Paragraphs** (1–10) or **Generate Sub Terra Sentences** (1–20) to see a split preview with an empty count field. Open **Raycast Settings → Extensions → Vibed Ipsum** to set **Default Paragraph Count** (1–10), **Default Sentence Count** (1–20), and **Primary Action**. Defaults are **3 paragraphs**, **3 sentences**, and **Copy to Clipboard**. Each command uses its configured default when the field is empty, and the placeholder shows that value. Edit the search bar to change the count immediately; clearing it restores the configured default without filling the field. Counts must be whole numbers within the command’s range; surrounding whitespace is ignored. Invalid input keeps the last valid preview visible with validation feedback, and hides Copy, Paste, and Regenerate until the input is valid.

The configured primary action comes first (`Enter`); both **Copy to Clipboard** and **Paste** remain available for valid previews. Paste is labeled **Paste to <app>** using the frontmost app’s name captured when the command opens, or **Paste to Active App** if no usable name is available. This label identifies the captured app; it does not check whether the app can accept pasted text. Copy and paste dismiss Raycast and clear Root Search. **Regenerate** (`⌘R`) selects a fresh pool. Reopening a command starts with an empty field, its configured default count, and a new pool. The extension does not persist count input or generated text; Raycast manages its own history and clipboard behavior.

Preferences are optional, so commands open directly with defaults and no setup screen. Use **Actions → Open Extension Preferences** to change default counts and the primary action in the native Raycast settings panel. Settings apply when you next launch a generation command. Raycast manages these preferences; there is no separate configuration command or custom settings store. Its extension API does not support adding a custom reset button to this native panel.

Each command session selects an ordered random pool of up to 10 paragraphs or 20 sentences, without repeated source units. The preview displays the requested prefix: increasing the count preserves existing text, and shrinking then growing restores the same sequence. Only Regenerate or reopening the command selects another pool. Separate generations may overlap. Sentence output is joined with spaces; paragraphs are separated by blank lines. Attribution and source links are available through **Information** and are not appended to copied text.

**Total characters** and **Total words** appear as a compact summary beneath a divider after the generated text. The summary is an inline SVG with smaller text, left-aligned labels, right-aligned values, theme-aware colors, and a text alternative containing both totals. It scrolls with the preview instead of reserving a separate metadata panel. Totals update with count edits and regeneration; invalid input retains the last valid preview’s totals. Totals are hidden while loading or when no preview is available. They measure the exact raw text copied or pasted, including spaces and paragraph separators, and exclude Markdown escaping and attribution. The totals themselves are never copied or pasted.

Counting uses the standard [`Intl.Segmenter`](https://tc39.es/ecma402/#segmenter-objects) with Spanish word and grapheme segmentation, supported by [Node’s default full ICU build](https://nodejs.org/download/release/v22.14.0/docs/api/intl.html). Words are word-like segments: punctuation alone contributes none, and `Hola—mundo` counts as two. Characters are grapheme clusters: precomposed and decomposed accents, ZWJ emoji, and flags each count as one character. Whitespace counts too; the two LF characters between paragraphs count as two, while a CRLF pair counts as one grapheme. Segmenter predates 2023; it is an existing standard API available on the target runtime.

The implementation was informed by a review of [Alfaaz’s bitmap scanner at revision a132fdb](https://github.com/thecodrr/alfaaz/blob/a132fdbda844bf83a7f5fdd6ebc9f7d3ed14fb04/src/index.ts). Our implementation is independently written, uses no Alfaaz dependency or copied source, and intentionally follows Intl’s Spanish segmentation rather than promising Alfaaz’s counts or performance.

## Run locally

Use Node.js **22.14.0 or newer**, npm, and Raycast on macOS. Python 3 is needed only to rebuild the source extraction or run its tests. The prepared SQLite database is checked in; launching the extension needs no database setup or network requests.

```sh
npm ci
npm run dev
```

Open **Generate Sub Terra Paragraphs** or **Generate Sub Terra Sentences** in Raycast. Launching opens the preview directly; edit its search bar to choose how much text to generate. Development mode registers the extension with your local Raycast installation. To compile without registering it, run `npm run build`; output stays in this repository’s `dist/` directory.

## Checks

```sh
npm run build # generates Raycast types before typechecking
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:extraction
npm run build
```

Tests exercise primary action ordering, count defaults and validation, stable pool prefixes and displayed attribution, bounded random selection against SQLite, paste-label fallbacks, plain-text formatting, Unicode word and character statistics on raw previews, source extraction, sentence boundaries, spelling corrections, corpus relationships, and rebuilding the bundled database from its inputs.

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
