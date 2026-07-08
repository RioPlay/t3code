import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const platformState = vi.hoisted(() => ({
  OS: "ios" as "ios" | "android" | "web",
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return platformState.OS;
    },
  },
  Image: { resolveAssetSource: vi.fn(() => ({ uri: "asset://icon" })) },
  Linking: { openURL: vi.fn() },
  ScrollView: "ScrollView",
  StyleSheet: { create: (styles: unknown) => styles },
  Text: "Text",
  View: "View",
}));

vi.mock("expo-symbols", () => ({
  SymbolView: "SymbolView",
}));

vi.mock("./CopyTextButton", () => ({
  CopyTextButton: "CopyTextButton",
}));

vi.mock("./markdownFileIcons", () => ({
  markdownFileIconSource: vi.fn(() => 1),
}));

const rendererOptions = {
  onLinkPress: vi.fn(),
  inlineTextColor: "#111111",
  inlineCodeTextColor: "#222222",
  blockBackgroundColor: "#333333",
  blockTextColor: "#444444",
  markdownLinkColor: "#555555",
  markdownBodyColor: "#666666",
  markdownHrColor: "#777777",
  skillTextColor: "#888888",
  markdownFontSizes: {
    s: 12,
    m: 14,
    h1: 21,
    h2: 19,
    h3: 17,
    h4: 15,
    h5: 15,
    h6: 15,
    bodyLineHeight: 20,
    codeBlockFontSize: 13,
    codeBlockLineHeight: 19,
  },
  tableTheme: {
    surface: "#ffffff",
    surfaceLight: "#f8fafc",
    tableBorder: "#e2e8f0",
    tableHeader: "#f1f5f9",
    tableHeaderText: "#0f172a",
    tableRowOdd: "transparent",
    tableRowEven: "#f8fafc",
    textMuted: "#64748b",
  },
} as const;

describe("createNitroMarkdownRenderers", () => {
  beforeEach(() => {
    vi.resetModules();
    platformState.OS = "ios";
  });

  afterEach(() => {
    platformState.OS = "ios";
  });

  it("keeps the default renderer set on iOS", async () => {
    const { createNitroMarkdownRenderers } = await import("./nitroMarkdownRenderers");
    const renderers = createNitroMarkdownRenderers(rendererOptions);
    expect(renderers.paragraph).toBeUndefined();
    expect(renderers.table).toBeUndefined();
    expect(renderers.link).toBeTypeOf("function");
  });

  it("adds Android selection and table renderers when table theme is provided", async () => {
    platformState.OS = "android";
    const { createNitroMarkdownRenderers } = await import("./nitroMarkdownRenderers");
    const renderers = createNitroMarkdownRenderers(rendererOptions);
    expect(renderers.paragraph).toBeTypeOf("function");
    expect(renderers.heading).toBeTypeOf("function");
    expect(renderers.table).toBeTypeOf("function");
  });
});
