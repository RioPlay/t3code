import { describe, expect, it } from "vite-plus/test";

import { removeComposerInlineToken } from "./composerInlineTokenEditing";

describe("removeComposerInlineToken", () => {
  it("removes a file link token from draft text", () => {
    const text = "Review [package.json](package.json) next";
    const removed = removeComposerInlineToken(text, {
      type: "mention",
      value: "package.json",
      source: "[package.json](package.json)",
      start: 7,
      end: 35,
    });
    expect(removed).toBe("Review next");
  });
});
