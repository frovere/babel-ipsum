# Text sources and attribution

**Sub terra**, by **Baldomero Lillo**, is the literary source. The corpus includes the eight stories indexed under the 1904 edition and the five additions indexed under the 1917 edition on [Spanish Wikisource](https://es.wikisource.org/wiki/Sub_terra). The edition column records this inclusion grouping, not a claim that every linked transcription reproduces the 1917 printing.

The original literary work is identified as public domain on the source pages. Transcriptions are credited to **Wikisource contributors**. Wikisource's site notice identifies [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/); any protectable transcription contributions and this project's edited corpus are made available under that license. This notice concerns the corpus; the extension code uses the manifest's MIT license.

`stories.json` lists the thirteen source URLs. `original.json` records each retrieved page revision URL and a SHA-256 digest of its HTML snapshot. The HTML snapshots in `sources/` are retained so the source text and extraction can be audited without a network connection. Transcluded Wikisource pages can change independently of a parent page revision; the checked-in snapshots are the exact build inputs.

The extraction excludes navigation, titles, editorial notes, footnotes, and page numbers. Orthography, accents, and documented transcription errors are corrected according to `MODERNIZATION.md`, `corrections.json`, and `edits.json`. The result is a modernized placeholder-text corpus, not a facsimile or a critical edition.

Generated text contains only the selected passages. Source and revision links and the modernization notice are available through the extension's Information action.

The project's copyrightable editorial adaptations follow [CC BY-SA 4.0](LICENSE.md), separately from the extension's [MIT software license](../LICENSE).
