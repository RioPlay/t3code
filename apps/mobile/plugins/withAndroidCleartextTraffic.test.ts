import * as NodeModule from "node:module";
import { describe, expect, it } from "vite-plus/test";

const require = NodeModule.createRequire(import.meta.url);
const { shouldAllowCleartextTraffic } = require("./withAndroidCleartextTraffic.cjs") as {
  shouldAllowCleartextTraffic: (appVariant: string | undefined) => boolean;
};

describe("shouldAllowCleartextTraffic", () => {
  it("allows cleartext only for development and preview variants", () => {
    expect(shouldAllowCleartextTraffic("development")).toBe(true);
    expect(shouldAllowCleartextTraffic("preview")).toBe(true);
  });

  it("denies cleartext for production and unknown variants", () => {
    expect(shouldAllowCleartextTraffic("production")).toBe(false);
    expect(shouldAllowCleartextTraffic(undefined)).toBe(false);
    expect(shouldAllowCleartextTraffic("staging")).toBe(false);
  });
});
