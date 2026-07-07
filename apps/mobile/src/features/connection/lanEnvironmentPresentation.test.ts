import { EnvironmentId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  formatLanEnvironmentDetailLine,
  formatLanEnvironmentPlatform,
} from "./lanEnvironmentPresentation";

describe("lanEnvironmentPresentation", () => {
  it("formats platform labels for common desktop targets", () => {
    expect(formatLanEnvironmentPlatform({ os: "linux", arch: "x64" })).toBe("Linux · x64");
    expect(formatLanEnvironmentPlatform({ os: "darwin", arch: "arm64" })).toBe("macOS · arm64");
  });

  it("shows verification and descriptor details by status", () => {
    expect(
      formatLanEnvironmentDetailLine({
        status: "resolving",
        descriptor: null,
        error: null,
      }),
    ).toBe("Verifying desktop...");

    expect(
      formatLanEnvironmentDetailLine({
        status: "available",
        descriptor: {
          environmentId: EnvironmentId.make("env-1"),
          label: "Workstation",
          platform: { os: "linux", arch: "x64" },
          serverVersion: "0.1.0",
          capabilities: { repositoryIdentity: false },
        },
        error: null,
      }),
    ).toBe("Linux · x64 · v0.1.0");

    expect(
      formatLanEnvironmentDetailLine({
        status: "unavailable",
        descriptor: null,
        error: "Connection refused",
      }),
    ).toBe("Connection refused");
  });
});
