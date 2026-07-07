import { describe, expect, it } from "vite-plus/test";

import {
  buildTerminalShellConfigureScript,
  buildTerminalShellWriteScript,
  parseTerminalShellOutboundMessage,
} from "./terminalShellBridge";

describe("parseTerminalShellOutboundMessage", () => {
  it("accepts ready, input, and resize messages", () => {
    expect(parseTerminalShellOutboundMessage(JSON.stringify({ type: "ready" }))).toEqual({
      type: "ready",
    });
    expect(
      parseTerminalShellOutboundMessage(JSON.stringify({ type: "input", data: "\u0003" })),
    ).toEqual({
      type: "input",
      data: "\u0003",
    });
    expect(
      parseTerminalShellOutboundMessage(JSON.stringify({ type: "resize", cols: 120, rows: 40 })),
    ).toEqual({
      type: "resize",
      cols: 120,
      rows: 40,
    });
  });

  it("rejects arbitrary bridge payloads", () => {
    expect(parseTerminalShellOutboundMessage("not-json")).toBeNull();
    expect(
      parseTerminalShellOutboundMessage(JSON.stringify({ type: "navigate", url: "https://x" })),
    ).toBeNull();
    expect(
      parseTerminalShellOutboundMessage(JSON.stringify({ type: "input", data: 1 })),
    ).toBeNull();
    expect(
      parseTerminalShellOutboundMessage(JSON.stringify({ type: "resize", cols: "80", rows: 24 })),
    ).toBeNull();
  });
});

describe("terminal shell command scripts", () => {
  it("builds configure and write scripts for injection", () => {
    expect(
      buildTerminalShellConfigureScript({
        fontSize: 12,
        isRunning: true,
        theme: {
          background: "#000",
          foreground: "#fff",
          cursor: "#0af",
          selectionBackground: "#135",
        },
      }),
    ).toContain("window.__T3_TERMINAL__?.configure");
    expect(buildTerminalShellWriteScript("echo hi\n")).toContain("echo hi\\n");
  });
});
