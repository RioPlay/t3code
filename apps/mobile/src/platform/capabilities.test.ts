import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const expoMocks = vi.hoisted(() => ({
  requireNativeView: vi.fn(),
}));

const nativeView = () => null;
const originalExpo = globalThis.expo;

function setExpoViewConfig(names: ReadonlyArray<string>) {
  globalThis.expo = {
    getViewConfig: vi.fn().mockImplementation((moduleName: string) => {
      if (names.includes(moduleName)) {
        return { validAttributes: {}, directEventTypes: {} };
      }
      return null;
    }),
  } as unknown as typeof globalThis.expo;
}

vi.mock("expo", () => ({
  requireNativeView: expoMocks.requireNativeView,
}));

describe("resolvePlatformCapabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    globalThis.expo = undefined as unknown as typeof globalThis.expo;
    delete process.env.EXPO_PUBLIC_FORCE_JS_REVIEW;
    delete process.env.EXPO_PUBLIC_FORCE_NITRO_MARKDOWN;
    delete process.env.EXPO_PUBLIC_TERMINAL_WEBVIEW;
    delete process.env.EXPO_PUBLIC_COMPOSER_CHIP_MODE;
  });

  afterEach(() => {
    globalThis.expo = originalExpo;
  });

  it("exports a frozen capabilities object with review, markdown, terminal, and composer keys", async () => {
    const { platformCapabilities } = await import("./capabilities");
    expect(Object.isFrozen(platformCapabilities)).toBe(true);
    expect(platformCapabilities.review).toBeDefined();
    expect(platformCapabilities.markdown).toBeDefined();
    expect(platformCapabilities.terminal).toBeDefined();
    expect(platformCapabilities.composer).toBeDefined();
  });

  it("forces review.native false when EXPO_PUBLIC_FORCE_JS_REVIEW=1 even if native view resolves", async () => {
    setExpoViewConfig(["T3ReviewDiffSurface"]);
    expoMocks.requireNativeView.mockReturnValue(nativeView);
    process.env.EXPO_PUBLIC_FORCE_JS_REVIEW = "1";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    expect(resolvePlatformCapabilities().review.native).toBe(false);
  });

  it("forces nitro markdown when EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1", async () => {
    process.env.EXPO_PUBLIC_FORCE_NITRO_MARKDOWN = "1";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.markdown.nativeSelectable).toBe(false);
    expect(caps.markdown.useNitroMarkdown).toBe(true);
  });

  it("sets terminal.preferWebView when EXPO_PUBLIC_TERMINAL_WEBVIEW=1", async () => {
    process.env.EXPO_PUBLIC_TERMINAL_WEBVIEW = "1";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.terminal.preferWebView).toBe(true);
    expect(caps.terminal.native).toBe(false);
  });

  it("returns review.native false without throwing when native view config is unavailable", async () => {
    const { resolvePlatformCapabilities } = await import("./capabilities");
    expect(resolvePlatformCapabilities().review.native).toBe(false);
    expect(expoMocks.requireNativeView).not.toHaveBeenCalled();
  });

  it("returns tier-0 markdown flags on Android-like null native resolution", async () => {
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.review.native).toBe(false);
    expect(caps.markdown.nativeSelectable).toBe(false);
    expect(caps.markdown.useNitroMarkdown).toBe(true);
  });

  it("sets composer chip mode to strip from EXPO_PUBLIC_COMPOSER_CHIP_MODE", async () => {
    process.env.EXPO_PUBLIC_COMPOSER_CHIP_MODE = "strip";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    expect(resolvePlatformCapabilities().composer.chipMode).toBe("strip");
  });
});
