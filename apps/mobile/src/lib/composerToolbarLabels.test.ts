import { afterEach, describe, expect, it, vi } from "vite-plus/test";

describe("composerToolbarLabels", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("uses Android-specific send labels", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));
    const { resolveComposerSendLabel } = await import("./composerToolbarLabels");
    expect(
      resolveComposerSendLabel({
        connectionState: "connected",
        activeThreadBusy: false,
        queueCount: 0,
      }),
    ).toBe("Send message");
    expect(
      resolveComposerSendLabel({
        connectionState: "connected",
        activeThreadBusy: true,
        queueCount: 0,
      }),
    ).toBe("Queue message");
  });

  it("uses compact send labels on iOS", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "ios" },
    }));
    const { resolveComposerSendLabel } = await import("./composerToolbarLabels");
    expect(
      resolveComposerSendLabel({
        connectionState: "connected",
        activeThreadBusy: false,
        queueCount: 0,
      }),
    ).toBe("Send");
  });

  it("uses Android toolbar accessibility labels", async () => {
    vi.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));
    const { resolveComposerToolbarAccessibilityLabel } = await import("./composerToolbarLabels");
    expect(resolveComposerToolbarAccessibilityLabel("model")).toBe("Choose model");
    expect(resolveComposerToolbarAccessibilityLabel("configuration")).toBe("Agent configuration");
  });
});
