import { describe, expect, it } from "vite-plus/test";

import { resolveMarkdownTableThemeColors } from "./markdownTableTheme";

describe("resolveMarkdownTableThemeColors", () => {
  it("uses a dark table surface in dark mode", () => {
    expect(
      resolveMarkdownTableThemeColors({
        isDark: true,
        strong: "#f5f5f5",
        blockquoteBackground: "rgba(255, 255, 255, 0.03)",
        horizontalRule: "rgba(255, 255, 255, 0.08)",
      }).surface,
    ).toBe("#1a1a1a");
  });

  it("uses a light table surface in light mode", () => {
    expect(
      resolveMarkdownTableThemeColors({
        isDark: false,
        strong: "#000000",
        blockquoteBackground: "rgba(0, 0, 0, 0.02)",
        horizontalRule: "rgba(0, 0, 0, 0.08)",
      }).surface,
    ).toBe("#ffffff");
  });
});
