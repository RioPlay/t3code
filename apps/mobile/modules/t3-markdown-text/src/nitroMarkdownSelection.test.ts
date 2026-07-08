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
}));

describe("nitroMarkdownSelection", () => {
  beforeEach(() => {
    vi.resetModules();
    platformState.OS = "ios";
  });

  afterEach(() => {
    platformState.OS = "ios";
  });

  it("does not enhance selection styles on iOS", async () => {
    const { nitroSelectableTextStyle, shouldEnhanceNitroMarkdownSelection } =
      await import("./nitroMarkdownSelection");
    expect(shouldEnhanceNitroMarkdownSelection()).toBe(false);
    expect(nitroSelectableTextStyle({ fontSize: 14 })).toEqual({ fontSize: 14 });
  });

  it("adds Android selection text metrics when requested", async () => {
    platformState.OS = "android";
    const { nitroSelectableTextStyle, shouldEnhanceNitroMarkdownSelection } =
      await import("./nitroMarkdownSelection");
    expect(shouldEnhanceNitroMarkdownSelection()).toBe(true);
    expect(nitroSelectableTextStyle({ fontSize: 14 })).toEqual({
      fontSize: 14,
      includeFontPadding: false,
    });
  });
});
