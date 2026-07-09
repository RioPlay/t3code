import * as NodeModule from "node:module";
import { describe, expect, it } from "vite-plus/test";

const require = NodeModule.createRequire(import.meta.url);
const { ensureMainApplicationInstall } = require("./withAndroidMultiNetworkRouting.cjs") as {
  ensureMainApplicationInstall: (contents: string) => string;
};

const SAMPLE_MAIN_APPLICATION = `package com.t3tools.t3code

import android.app.Application
import expo.modules.ApplicationLifecycleDispatcher
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }
}
`;

describe("ensureMainApplicationInstall", () => {
  it("installs multi-network routing before loadReactNative", () => {
    const next = ensureMainApplicationInstall(SAMPLE_MAIN_APPLICATION);
    expect(next).toContain("import com.t3tools.t3code.network.MultiNetworkRouting");
    expect(next).toContain("MultiNetworkRouting.install(this)");
    expect(next.indexOf("MultiNetworkRouting.install(this)")).toBeLessThan(
      next.indexOf("loadReactNative(this)"),
    );
  });

  it("is idempotent", () => {
    const once = ensureMainApplicationInstall(SAMPLE_MAIN_APPLICATION);
    const twice = ensureMainApplicationInstall(once);
    expect(twice).toBe(once);
    expect(twice.split("MultiNetworkRouting.install(this)").length - 1).toBe(1);
  });
});
