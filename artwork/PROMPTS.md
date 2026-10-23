# Forest Monochrome — generation prompts

Built-in `image_gen` edits only; no CLI/API fallback. All calls used `transparent_background: false` and omitted `num_last_images_to_include`. Originals were inspected with `view_image` before editing; the new icon was inspected before use as the poster palette reference.

## Icon

`referenced_image_paths`:

```json
["/Users/felipe/code/vibed-ipsum/artwork/babel/risograph/palettes/indigo-mono/icon-master.png"]
```

Exact prompt:

```text
Use case: precise-object-edit.
Asset type: Babel Ipsum risograph icon palette iteration, Forest Monochrome.
Input images: Image 1 is the existing Indigo Monochrome icon EDIT TARGET, the sole authority for geometry and texture.
Change only the indigo ink color to a SINGLE deep forest ink, target #215C48. Keep the existing warm cream paper entirely unchanged. Use 100% forest ink for the left page, 70% screened density of the SAME forest ink for the right page, and 45% screened density of the SAME forest ink for the binding. Retain lighter screened forest shades in the same hue family. Map all edge misregistration to the same forest ink at the corresponding density. No indigo, paprika, ochre, teal, additional accent hue, or gradients.
Preserve exactly the original book silhouette, three shapes, geometry, center fold, cream gaps, placement, margins, square composition, paper texture, grain, halftones, worn ink and misregistration. Preserve the distinction and legibility of both pages and binding. This is a color-only edit, no redesign, no new objects, no text, no cropping. Keep original image dimensions if possible. Hex color and screen densities are target guidance, not claims of pixel-perfect values.
```

Generated source: `/Users/felipe/.codex/generated_images/01a166a5-fe9c-7421-bdb6-d3aee0d5ca41/exec-b1634211-ecbe-450b-b80b-217a621aeb9b.png`.

## Poster

`referenced_image_paths`:

```json
[
  "/Users/felipe/code/vibed-ipsum/artwork/babel/risograph/palettes/indigo-mono/poster.png",
  "/Users/felipe/code/vibed-ipsum/artwork/babel/risograph/palettes/forest-mono/icon-master.png"
]
```

Exact prompt:

```text
Use case: precise-object-edit.
Asset type: Babel Ipsum risograph infographic poster, Forest Monochrome palette iteration.
Input images: Image 1 is the existing Indigo Monochrome poster EDIT TARGET and sole authority for geometry, lettering, layout and paper. Image 2 is the newly recolored Forest Monochrome icon, supporting palette reference only; do not alter poster geometry to match it.
Change only the ink color of Image 1 to a SINGLE deep forest ink, target #215C48, matching Image 2. Keep the existing warm cream paper unchanged. Map dark indigo to 100% forest ink (left book pages and major headings, rules, dark bars); medium screened indigo to 70% density of the SAME forest ink (right book pages and secondary elements originally red); light screened indigo to 45% density of the SAME forest ink (binding, connector arrows and elements originally ochre). Apply consistently to title, numbers, all books, decorative stack, labels, bars, rules and misregistration. No indigo, paprika, ochre, teal, extra accent hue, or gradients. Lighter screened forest shades must retain the same hue.
Preserve exactly the original book geometry, fold, cream gaps, composition, typography, positions, scale, shapes, title, facts, lines, branches, bar counts, whitespace, margins, paper texture, grain, risograph wear, halftones and misregistration. Do not redesign, add objects, crop, reflow, or change wording. Preserve the original 1536 x 1024 landscape canvas and output at 1536 x 1024.
Text (verbatim, in existing positions and lettering): "Babel Ipsum"; "Classic literature. Any layout."; "15"; "books"; "14"; "languages"; "One book"; "Passages"; "Sentences".
Preserve all original wording and facts exactly. Color-only edit. Hex color and screen densities are target guidance, not claims of exact pixel values.
```

Generated source: `/Users/felipe/.codex/generated_images/01a166a5-fe9c-7421-bdb6-d3aee0d5ca41/exec-a09ef910-9b60-4f19-a0ff-43838589e209.png`.

## Poster catalog correction — 13 books / 12 languages

The existing Forest Monochrome poster was edited to match the catalog after excluding Hindi _Godaan_ and Russian _Crime and Punishment_. It contained no Hindi or Russian snippets. Only the two count numerals required changes; the other copy, illustration and art direction were retained.

`referenced_image_paths`:

```json
["/Users/felipe/code/vibed-ipsum/media/poster.webp"]
```

Exact prompt:

```text
Use case: text-localization.
Asset type: Babel Ipsum promotional risograph infographic poster, Forest Monochrome.
Input images: Image 1 is the existing Forest Monochrome poster EDIT TARGET and sole authority for layout, illustration, lettering, texture, palette, hierarchy and paper.
Primary request: Make a focused catalog-count correction. Change the large "15" above "books" to "13". Change the large "14" above "languages" to "12". Match the existing number typography, size, position, screened forest ink, risograph grain and wear.
Text (verbatim, in existing positions and lettering): "Babel Ipsum"; "Classic literature. Any layout."; "13"; "books"; "12"; "languages"; "One book"; "Passages"; "Sentences".
The current catalog has exactly 13 books in 12 languages: Latin, Ancient Greek, Arabic, Chinese, English, French, German, Italian, Japanese, Korean, Portuguese, Spanish. This list is context only: DO NOT add language names or any new text. Hindi Godaan and Russian Crime and Punishment are excluded; do not add Hindi/Devanagari or Russian/Cyrillic snippets. The source poster has no such snippets to remove.
Constraints: Change only those two count numerals. Preserve all other valid wording exactly. Preserve the single forest green ink on warm ivory paper, screened density variation, risograph grain, halftones, worn ink and subtle misregistration. Preserve the original open-book emblems, stacked books, branch arrows, passage/sentence bars, rules, spacing, margins, title hierarchy and entire composition. No redesign, new objects, crop, reflow, new color, gradients or watermark. Preserve the original landscape canvas and output at exactly 1536 x 1024 pixels.
```

Generated source: `/Users/felipe/.codex/generated_images/01a16732-318b-73c2-bb8d-a833e715f5df/exec-a31aca8d-a340-43d4-9772-3b17ee9d9a8f.png`.

The generated output was visually inspected for all copy, exact counts and preserved Forest Monochrome composition. It was converted to `media/poster.webp` at 1536 × 1024 without resizing:

```sh
cwebp -lossless -exact -m 6 /Users/felipe/.codex/generated_images/01a16732-318b-73c2-bb8d-a833e715f5df/exec-a31aca8d-a340-43d4-9772-3b17ee9d9a8f.png -o media/poster.webp
```

## Current locations

Reference paths above record the original generation inputs. The selected master now lives at `artwork/icon-master.webp` (losslessly converted from the generated PNG); earlier concepts are preserved locally under `.artwork-explorations/artwork/`.

## Conversion and runtime asset

The generated icon and poster were converted to lossless WebP with `cwebp` 1.6.0. Decoded pixels were compared against their PNG sources with ImageMagick; both had zero differing pixels. Original generation paths above are historical provenance.

```sh
cwebp -lossless -exact -m 6 artwork/icon-master.png -o artwork/icon-master.webp
cwebp -lossless -exact -m 6 artwork/poster.png -o media/poster.webp
```

The retained poster now lives at `media/poster.webp` for Raycast README support. The PNG masters and duplicate poster have been removed from the working tree. The commands above document the one-time conversion, rather than a recurring build step.

Regenerate the runtime icon from the retained WebP master with ImageMagick:

```sh
npm run artwork:build
```

This runs `magick artwork/icon-master.webp -resize 512x512 -strip assets/extension-icon.png`. Separate 512px and 32px artwork previews are no longer retained; the runtime PNG is the 512px derivative.
