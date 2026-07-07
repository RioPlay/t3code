import { collectComposerInlineTokens } from "@t3tools/shared/composerInlineTokens";
import { describe, expect, it } from "vite-plus/test";

import { collectComposerSendInlineTokens } from "./composerSendPath";

const IOS_REFERENCE_FIXTURE = "Review [package.json](package.json) with $ui before shipping.";

describe("collectComposerSendInlineTokens", () => {
  it("matches the shared collectComposerInlineTokens parser (CMP-004 parity)", () => {
    const text = `  ${IOS_REFERENCE_FIXTURE}  `;
    expect(collectComposerSendInlineTokens(text)).toEqual(collectComposerInlineTokens(text.trim()));
  });

  it("collects file and skill tokens from the iOS reference fixture", () => {
    expect(collectComposerSendInlineTokens(IOS_REFERENCE_FIXTURE)).toEqual([
      {
        type: "mention",
        value: "package.json",
        source: "[package.json](package.json)",
        start: 7,
        end: 35,
      },
      {
        type: "skill",
        value: "ui",
        source: "$ui",
        start: 41,
        end: 44,
      },
    ]);
  });
});
