import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");

test("extension licenses match the canonical repository grants", () => {
  assert.equal(read("extension/LICENSE"), read("LICENSE").replace("See corpus/NOTICE.md.", "See NOTICE.md."));
  assert.equal(
    read("extension/assets/corpus-license.txt"),
    read("corpus/LICENSE.md").replace(
      "`corpus/NOTICE.md`",
      "[The source notice](https://github.com/frovere/babel-ipsum/blob/3897a81732fa88ade7c72a0c72fe8c93de9b571f/corpus/NOTICE.md)",
    ),
  );
});
