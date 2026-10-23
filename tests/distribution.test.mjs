import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");

test("extension licenses match the canonical repository grants", () => {
  assert.equal(read("extension/LICENSE"), read("LICENSE"));
  assert.equal(read("extension/assets/corpus-license.txt"), read("corpus/LICENSE.md"));
});
