import { afterEach, describe, expect, it, vi } from "vite-plus/test";

describe("composerToolbarLabels", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("adds Android-specific composer labels", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));
    const labels = await import("./composerToolbarLabels");
    expect(labels.composerAttachButtonLabel()).toBe("Attach");
    expect(labels.composerModelButtonLabel("Composer 2.5")).toBe("Model · Composer 2.5");
    expect(labels.composerOptionsButtonLabel("Configuration")).toBe("Options");
    expect(labels.composerOptionsButtonLabel("Medium · Standard")).toBe("Medium · Standard");
  });

  it("keeps iOS labels compact", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    const labels = await import("./composerToolbarLabels");
    expect(labels.composerAttachButtonLabel()).toBeUndefined();
    expect(labels.composerModelButtonLabel("Composer 2.5")).toBe("Composer 2.5");
    expect(labels.composerOptionsButtonLabel("Configuration")).toBe("Configuration");
  });
});
