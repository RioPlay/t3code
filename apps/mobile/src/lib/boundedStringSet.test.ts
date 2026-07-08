import { describe, expect, it } from "vite-plus/test";

import { createBoundedStringSet } from "./boundedStringSet";

describe("createBoundedStringSet", () => {
  it("evicts the oldest entry when the cap is exceeded", () => {
    const set = createBoundedStringSet(2);
    set.add("a");
    set.add("b");
    set.add("c");
    expect(set.has("a")).toBe(false);
    expect(set.has("b")).toBe(true);
    expect(set.has("c")).toBe(true);
  });
});
