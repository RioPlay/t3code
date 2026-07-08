import { describe, expect, it } from "vite-plus/test";

import {
  estimateThreadComposerOverlayHeight,
  minimumThreadComposerContentInsetEnd,
  resolveThreadComposerContentInsetEnd,
  threadComposerOverlayInsetFromMeasurement,
} from "./threadComposerOverlayInset";

describe("threadComposerOverlayInset", () => {
  it("adds footer chrome to measured composer height on Android", () => {
    expect(
      threadComposerOverlayInsetFromMeasurement(280, {
        footerChromeInset: 64,
        nativeInsetOvercount: 0,
      }),
    ).toBe(344);
  });

  it("subtracts native inset overcount on iOS automatic inset screens", () => {
    expect(
      threadComposerOverlayInsetFromMeasurement(220, {
        footerChromeInset: 0,
        nativeInsetOvercount: 34,
      }),
    ).toBe(186);
  });

  it("seeds expanded overlay estimates with attachments and footer chrome", () => {
    expect(
      estimateThreadComposerOverlayHeight({
        expanded: true,
        attachmentCount: 2,
        hasActiveWorkIndicator: true,
        footerChromeInset: 64,
      }),
    ).toBeGreaterThan(300);
  });

  it("never resolves content inset below the estimated minimum", () => {
    expect(
      resolveThreadComposerContentInsetEnd({
        measuredComposerHeight: 180,
        estimatedOverlayHeight: 286,
        adjustment: {
          footerChromeInset: 64,
          nativeInsetOvercount: 0,
        },
      }),
    ).toBe(286);
  });

  it("uses measured inset when it exceeds the estimate", () => {
    expect(
      resolveThreadComposerContentInsetEnd({
        measuredComposerHeight: 320,
        estimatedOverlayHeight: 286,
        adjustment: {
          footerChromeInset: 64,
          nativeInsetOvercount: 0,
        },
      }),
    ).toBe(384);
  });

  it("subtracts native inset overcount from the estimated minimum", () => {
    expect(minimumThreadComposerContentInsetEnd(250, 34)).toBe(216);
  });
});
