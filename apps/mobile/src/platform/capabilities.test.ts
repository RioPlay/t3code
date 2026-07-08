import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const expoMocks = vi.hoisted(() => ({
  requireNativeView: vi.fn(),
}));

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
    platformState.OS = "ios";
    globalThis.expo = undefined as unknown as typeof globalThis.expo;
    delete process.env.EXPO_PUBLIC_FORCE_JS_REVIEW;
    delete process.env.EXPO_PUBLIC_FORCE_NITRO_MARKDOWN;
    delete process.env.EXPO_PUBLIC_TERMINAL_WEBVIEW;
    delete process.env.EXPO_PUBLIC_COMPOSER_CHIP_MODE;
    delete process.env.EXPO_PUBLIC_NATIVE_COMPOSER;
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

  it("defaults terminal.preferWebView false on Android when env is unset", async () => {
    platformState.OS = "android";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.terminal.preferWebView).toBe(false);
    expect(caps.terminal.native).toBe(false);
  });

  it("prefers native terminal on Android when the native surface resolves", async () => {
    platformState.OS = "android";
    setExpoViewConfig(["T3TerminalSurface"]);
    expoMocks.requireNativeView.mockReturnValue(nativeView);
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.terminal.preferWebView).toBe(false);
    expect(caps.terminal.native).toBe(true);
  });

  it("allows disabling terminal WebView on Android via EXPO_PUBLIC_TERMINAL_WEBVIEW=0", async () => {
    platformState.OS = "android";
    process.env.EXPO_PUBLIC_TERMINAL_WEBVIEW = "0";
    const { resolvePlatformCapabilities } = await import("./capabilities");
    const caps = resolvePlatformCapabilities();
    expect(caps.terminal.preferWebView).toBe(false);
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

  it("defaults composer chip mode to strip without native T3ComposerEditor", async () => {
    const { resolvePlatformCapabilities } = await import("./capabilities");
    expect(resolvePlatformCapabilities().composer.chipMode).toBe("strip");
  });

  it("defaults composer chip mode to default when native T3ComposerEditor resolves", async () => {
    setExpoViewConfig(["T3ComposerEditor"]);
    const { resolvePlatformCapabilities } = await import("./capabilities");
    expect(resolvePlatformCapabilities().composer.chipMode).toBe("default");
  });

  it("defaults shouldUseNativeComposerEditor true on Android when native T3ComposerEditor resolves", async () => {
    platformState.OS = "android";
    setExpoViewConfig(["T3ComposerEditor"]);
    const { shouldUseNativeComposerEditor } = await import("./capabilities");
    expect(shouldUseNativeComposerEditor()).toBe(true);
  });

  it("opts out of native composer on Android when EXPO_PUBLIC_NATIVE_COMPOSER=0", async () => {
    platformState.OS = "android";
    setExpoViewConfig(["T3ComposerEditor"]);
    process.env.EXPO_PUBLIC_NATIVE_COMPOSER = "0";
    const { shouldUseNativeComposerEditor } = await import("./capabilities");
    expect(shouldUseNativeComposerEditor()).toBe(false);
  });
});
