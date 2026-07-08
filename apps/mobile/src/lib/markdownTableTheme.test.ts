import { describe, expect, it } from "vite-plus/test";

import { resolveMarkdownTableThemeColors } from "./markdownTableTheme";

describe("resolveMarkdownTableThemeColors", () => {
  const input = {
    body: "#e5e5e5",
    strong: "#f5f5f5",
    horizontalRule: "rgba(255, 255, 255, 0.08)",
  };

  it("uses a dark surface so table text stays readable in dark mode", () => {
    const colors = resolveMarkdownTableThemeColors("dark", input);
    expect(colors.surface).toBe("#171717");
    expect(colors.tableHeaderText).toBe(input.strong);
    expect(colors.tableRowEven).not.toBe("transparent");
  });

  it("keeps a light surface in light mode", () => {
    const colors = resolveMarkdownTableThemeColors("light", {
      body: "#111111",
      strong: "#000000",
      horizontalRule: "rgba(0, 0, 0, 0.08)",
    });
    expect(colors.surface).toBe("#ffffff");
    expect(colors.tableRowOdd).toBe("transparent");
  });
});
