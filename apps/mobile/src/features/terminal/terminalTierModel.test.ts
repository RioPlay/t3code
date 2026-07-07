import { describe, expect, it } from "vite-plus/test";

import type { PlatformCapabilities } from "../../platform/capabilities";
import {
  resolveTerminalTier,
  terminalRouteHeaderSubtitle,
  terminalTierLabel,
} from "./terminalTierModel";

const baseCapabilities: PlatformCapabilities = {
  review: { native: false },
  markdown: { nativeSelectable: false, useNitroMarkdown: true },
  terminal: { native: false, preferWebView: false },
  composer: { chipMode: "strip" },
};

describe("terminalTierModel", () => {
  it("maps capability flags to tier labels", () => {
    expect(resolveTerminalTier(baseCapabilities)).toBe("basic");
    expect(
      resolveTerminalTier({
        ...baseCapabilities,
        terminal: { native: false, preferWebView: true },
      }),
    ).toBe("enhanced");
    expect(
      resolveTerminalTier({
        ...baseCapabilities,
        terminal: { native: true, preferWebView: false },
      }),
    ).toBe("native");
    expect(terminalTierLabel("enhanced")).toBe("Enhanced terminal");
  });

  it("builds route subtitles with tier and session labels", () => {
    expect(
      terminalRouteHeaderSubtitle({
        tier: "enhanced",
        sessionLabel: "bash",
      }),
    ).toBe("Enhanced terminal · bash");
  });
});
