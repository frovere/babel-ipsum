# Babel Ipsum artwork

**Forest Monochrome** is the official identity: an open-book emblem in a single forest ink with screened densities on warm cream paper.

| Asset                                         | Location                                                  |
| --------------------------------------------- | --------------------------------------------------------- |
| Icon master, 1254 × 1254 lossless WebP        | [icon-master.webp](icon-master.webp)                      |
| Promotional poster, 1536 × 1024 lossless WebP | [media/poster.webp](../media/poster.webp)                 |
| Runtime icon, 512 × 512 PNG                   | [assets/extension-icon.png](../assets/extension-icon.png) |
| Exact imagegen prompts and provenance         | [PROMPTS.md](PROMPTS.md)                                  |

The masters were generated with the built-in imagegen tool under Astra's art direction. Lossless WebP conversion preserves their decoded pixels exactly. The poster is an illustration, not a screenshot of the extension. Its catalog counts are 13 books and 12 languages, updated with a focused built-in imagegen edit that preserves the Forest Monochrome composition.

## Rebuild the runtime icon

Install [ImageMagick](https://imagemagick.org/script/download.php), then run from the repository root:

```sh
npm run artwork:build
```

This resizes the WebP icon master to 512 × 512 and writes `assets/extension-icon.png`. The PNG remains checked in so normal extension builds need no image tools. The poster lives only in `media/` for Raycast README support; the icon master lives here. Separate inspection derivatives are not retained.

## Palette

Palette target: forest `#215C48`, with 100% ink for the left page and major headings, 70% for the right page and secondary elements, and 45% for binding and connectors. These are generation targets, not measured ink coverage or pixel-perfect color claims.

Unused concepts, palette comparisons, and the historical mining-lamp artwork remain locally in the Git-ignored `.artwork-explorations/` directory.
