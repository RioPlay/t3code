import type { ExecutionEnvironmentDescriptor } from "@t3tools/contracts";

export function formatLanEnvironmentPlatform(
  platform: ExecutionEnvironmentDescriptor["platform"],
): string {
  const os =
    platform.os === "darwin"
      ? "macOS"
      : platform.os === "linux"
        ? "Linux"
        : platform.os === "windows"
          ? "Windows"
          : "Unknown OS";
  const arch =
    platform.arch === "arm64" ? "arm64" : platform.arch === "x64" ? "x64" : platform.arch;
  return `${os} · ${arch}`;
}

export function formatLanEnvironmentDetailLine(input: {
  readonly status: "resolving" | "available" | "unavailable";
  readonly descriptor: ExecutionEnvironmentDescriptor | null;
  readonly error: string | null;
}): string | null {
  if (input.status === "resolving") {
    return "Verifying desktop...";
  }
  if (input.status === "available" && input.descriptor) {
    return `${formatLanEnvironmentPlatform(input.descriptor.platform)} · v${input.descriptor.serverVersion}`;
  }
  if (input.status === "unavailable") {
    return input.error ?? "Desktop is unreachable.";
  }
  return null;
}
