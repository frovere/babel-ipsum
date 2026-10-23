# Babel Ipsum repository

Babel Ipsum generates offline placeholder text from 13 classic books in 12 languages for Raycast on macOS.

- [Extension usage, settings, and attribution](extension/README.md)
- [Development, corpus preparation, checks, and publishing](DEVELOPMENT.md)
- [Detailed corpus sources and attribution](corpus/NOTICE.md)
- [Artwork sources and rebuilds](artwork/README.md)

`extension/` is the standalone Raycast submission directory. The repository root owns corpus preparation, extraction fixtures, artwork masters, and development orchestration. These are two ordinary npm packages, without npm workspaces.

Software is [MIT licensed](LICENSE). Literary text follows its separate [corpus licensing scope](corpus/LICENSE.md).
