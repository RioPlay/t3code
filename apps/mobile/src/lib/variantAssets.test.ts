import * as NodeCrypto from "node:crypto";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

import {
  ANDROID_ADAPTIVE_MONOCHROME_IMAGE,
  ANDROID_VARIANT_ASSETS,
  MOBILE_APP_VARIANTS,
} from "../../variantAssets.ts";

const mobileRoot = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "../..",
);

function resolveAsset(relativePath: string): string {
  // Paths in variantAssets are Expo-config relative (./assets/...)
  return NodePath.resolve(mobileRoot, relativePath);
}

function sha256(path: string): string {
  return NodeCrypto.createHash("sha256").update(NodeFS.readFileSync(path)).digest("hex");
}

describe("ANDROID_VARIANT_ASSETS", () => {
  it("covers development, preview, and production", () => {
    expect([...MOBILE_APP_VARIANTS].sort()).toEqual(["development", "preview", "production"]);
  });

  it("uses distinct adaptive background colors per variant", () => {
    const colors = MOBILE_APP_VARIANTS.map(
      (v) => ANDROID_VARIANT_ASSETS[v].androidAdaptiveBackgroundColor,
    );
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("points every launcher asset at an existing file", () => {
    for (const variant of MOBILE_APP_VARIANTS) {
      const assets = ANDROID_VARIANT_ASSETS[variant];
      expect(NodeFS.existsSync(resolveAsset(assets.androidIcon)), `${variant} androidIcon`).toBe(
        true,
      );
      expect(
        NodeFS.existsSync(resolveAsset(assets.androidAdaptiveForegroundImage)),
        `${variant} adaptive foreground`,
      ).toBe(true);
    }
    expect(NodeFS.existsSync(resolveAsset(ANDROID_ADAPTIVE_MONOCHROME_IMAGE))).toBe(true);
  });

  it("uses distinct icon and adaptive foreground bytes per variant", () => {
    const iconHashes = MOBILE_APP_VARIANTS.map((v) =>
      sha256(resolveAsset(ANDROID_VARIANT_ASSETS[v].androidIcon)),
    );
    const fgHashes = MOBILE_APP_VARIANTS.map((v) =>
      sha256(resolveAsset(ANDROID_VARIANT_ASSETS[v].androidAdaptiveForegroundImage)),
    );

    expect(new Set(iconHashes).size).toBe(iconHashes.length);
    expect(new Set(fgHashes).size).toBe(fgHashes.length);
  });
});
