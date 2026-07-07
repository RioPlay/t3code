import { describe, expect, it } from "vite-plus/test";

import {
  terminalWebViewAllowsNavigation,
  terminalWebViewUsesBundledHtmlSource,
} from "./terminalWebViewSecurity";

describe("terminalWebViewSecurity", () => {
  it("allows only bundled inline html sources", () => {
    expect(terminalWebViewUsesBundledHtmlSource({ html: "<html></html>" })).toBe(true);
    expect(terminalWebViewUsesBundledHtmlSource({ html: "<html></html>", uri: "file://x" })).toBe(
      false,
    );
    expect(terminalWebViewUsesBundledHtmlSource({ uri: "https://evil.example" })).toBe(false);
  });

  it("blocks remote navigation requests", () => {
    expect(terminalWebViewAllowsNavigation("about:blank")).toBe(true);
    expect(terminalWebViewAllowsNavigation("file:///android_asset/terminal/shell.html")).toBe(true);
    expect(terminalWebViewAllowsNavigation("https://evil.example")).toBe(false);
  });
});
