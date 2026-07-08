import { describe, expect, it } from "vite-plus/test";

import {
  resolveComposerContentInsetHeight,
  resolveComposerInsetAdjustment,
  resolveEstimatedComposerOverlayHeight,
} from "./threadComposerInset";

describe("threadComposerInset", () => {
  it("adds footer chrome to the measured inset adjustment on Android phone", () => {
    expect(
      resolveComposerInsetAdjustment({
        footerChromeInset: 80,
        nativeInsetOvercount: 0,
      }),
    ).toBe(80);
  });

  it("subtracts the UIKit safe-area overcount on iOS automatic insets", () => {
    expect(
      resolveComposerInsetAdjustment({
        footerChromeInset: 0,
        nativeInsetOvercount: 34,
      }),
    ).toBe(-34);
  });

  it("includes accessory bar, working pill, and pending cards in the overlay estimate", () => {
    expect(
      resolveEstimatedComposerOverlayHeight({
        composerChrome: 60,
        composerBottomInset: 0,
        activeWorkStartedAt: "2026-07-07T00:00:00.000Z",
        hasPendingInteraction: true,
        footerChromeInset: 80,
      }),
    ).toBe(60 + 56 + 120 + 80);
  });

  it("clamps the reported content inset at zero", () => {
    expect(
      resolveComposerContentInsetHeight({
        estimatedOverlayHeight: 12,
        nativeInsetOvercount: 34,
      }),
    ).toBe(0);
  });
});
