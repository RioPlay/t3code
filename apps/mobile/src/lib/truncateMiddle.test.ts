import { describe, expect, it } from "vite-plus/test";

import { truncateMiddle } from "./truncateMiddle";

describe("truncateMiddle", () => {
  it("returns the original value when it fits", () => {
    expect(truncateMiddle("short.ts", 28)).toBe("short.ts");
  });

  it("truncates long values in the middle", () => {
    expect(truncateMiddle("packages/shared/src/composerInlineTokens.ts", 20)).toBe(
      "packages/s…Tokens.ts",
    );
  });
});
