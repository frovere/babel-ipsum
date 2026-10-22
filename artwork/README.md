# Mining lamp artwork

An antique brass oil reservoir, curved iron hook, and amber flame connect Vibed Ipsum to the coal-mining atmosphere of Baldomero Lillo’s _Sub terra_. This is an evocative illustration, not a documented reconstruction of a particular Chilean lamp or an imitation of a book cover. The charcoal field and bright flame keep the icon recognizable at small sizes.

## Files

- `../assets/extension-icon.png`: final runtime icon, **512 × 512 PNG**, opaque charcoal background; replaces the starter Raycast icon.
- `originals/mining-lamp-icon.png`: final generated master, **1254 × 1254 PNG**. Retained at native resolution for later raster editing.
- `previews/icon-32.png`: **32 × 32 PNG** inspection preview, not a runtime asset.
- `mining-lamp-promotional.png`: original **1536 × 1024 PNG** landscape illustration with space on the left for optional typography. Promotional concept only; not a Raycast screenshot or required submission artifact.
- `PROMPTS.md`: exact generation and correction prompts. All artwork used the built-in `image_gen` tool; only ordinary resizing used macOS `sips`.

The master and promotional illustration stay outside `assets/` to avoid bundling large artwork with the extension. These are raster originals, not layered or vector source files.

## Verified Raycast guidance

Checked 2026-10-22 against [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store#extension-icon) and the [manifest reference](https://developers.raycast.com/information/manifest): use a 512 × 512 PNG extension icon and check it in light and dark themes. The existing icon was already 512 × 512; that canvas size is preserved. The final background is opaque to avoid transparency artifacts across themes.

[Store screenshots](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots) are 2000 × 1250 PNG (16:10), captured from the actual extension using Raycast Window Capture. Raycast allows up to six and recommends at least three. The promotional illustration is deliberately separate; this guidance does not specify a required poster. Future Store screenshots should show the real working extension. If artwork is later linked from the extension’s public README, Raycast recommends placing that supporting media in a top-level `media/` directory.

## Validation

- Passed: PNG format and dimensions inspected with `sips`; final icon has no alpha channel.
- Passed: visual inspection of both generated compositions and the resized 32-pixel icon; flame, reservoir, and hook remain distinguishable, with no text or UI embedded.
- Passed: original source images retained and runtime artwork restricted to the single 512-pixel icon.
- Skipped: live Raycast light/dark theme inspection, build, and application tests; parent task owns application integration and full checks.

To regenerate the runtime size from the retained master:

```sh
sips -z 512 512 artwork/originals/mining-lamp-icon.png --out assets/extension-icon.png
```
