import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

const mobileRoot = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));

type EasConfig = {
  readonly build?: {
    readonly production?: {
      readonly env?: Record<string, string>;
      readonly android?: {
        readonly buildType?: string;
        readonly credentialsSource?: string;
      };
    };
  };
  readonly submit?: {
    readonly production?: {
      readonly android?: {
        readonly track?: string;
        readonly releaseStatus?: string;
      };
    };
  };
};

describe("eas.json production profile (t18 store prep)", () => {
  const eas = JSON.parse(
    NodeFS.readFileSync(NodePath.join(mobileRoot, "eas.json"), "utf8"),
  ) as EasConfig;

  it("pins production variant and tier-1+ Android capability env", () => {
    const env = eas.build?.production?.env ?? {};
    expect(env.APP_VARIANT).toBe("production");
    expect(env.EXPO_PUBLIC_TERMINAL_WEBVIEW).toBe("0");
    expect(env.EXPO_PUBLIC_FORCE_NITRO_MARKDOWN).toBe("1");
  });

  it("builds a Play-ready AAB with remote credentials", () => {
    expect(eas.build?.production?.android?.buildType).toBe("app-bundle");
    expect(eas.build?.production?.android?.credentialsSource).toBe("remote");
  });

  it("auto-submits to Play internal track as draft", () => {
    expect(eas.submit?.production?.android?.track).toBe("internal");
    expect(eas.submit?.production?.android?.releaseStatus).toBe("draft");
  });
});
