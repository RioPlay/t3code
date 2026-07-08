import { describe, expect, it } from "vite-plus/test";

import { resolvePlatformSymbol } from "./platformSymbol";

describe("resolvePlatformSymbol", () => {
  it("maps common accessory-bar icons to Android material symbols", () => {
    expect(resolvePlatformSymbol("folder")).toEqual({ ios: "folder", android: "folder" });
    expect(resolvePlatformSymbol("terminal")).toEqual({ ios: "terminal", android: "terminal" });
    expect(resolvePlatformSymbol("text.bubble")).toEqual({
      ios: "text.bubble",
      android: "rate_review",
    });
    expect(resolvePlatformSymbol("point.topleft.down.curvedto.point.bottomright.up")).toEqual({
      ios: "point.topleft.down.curvedto.point.bottomright.up",
      android: "source",
    });
  });

  it("maps navigation chrome icons used on Android home and thread screens", () => {
    expect(resolvePlatformSymbol("gearshape")).toEqual({ ios: "gearshape", android: "settings" });
    expect(resolvePlatformSymbol("square.and.pencil")).toEqual({
      ios: "square.and.pencil",
      android: "edit_note",
    });
    expect(resolvePlatformSymbol("plus")).toEqual({ ios: "plus", android: "add" });
  });
});
