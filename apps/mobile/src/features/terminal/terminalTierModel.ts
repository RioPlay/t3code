import type { PlatformCapabilities } from "../../platform/capabilities";

export type TerminalTier = "basic" | "enhanced" | "native";

export function resolveTerminalTier(capabilities: PlatformCapabilities): TerminalTier {
  if (capabilities.terminal.native) {
    return "native";
  }
  if (capabilities.terminal.preferWebView) {
    return "enhanced";
  }
  return "basic";
}

export function terminalTierLabel(tier: TerminalTier): string {
  switch (tier) {
    case "native":
      return "Native terminal";
    case "enhanced":
      return "Enhanced terminal";
    case "basic":
      return "Basic terminal";
  }
}

export function terminalRouteHeaderSubtitle(input: {
  readonly tier: TerminalTier;
  readonly sessionLabel: string;
}): string {
  const parts = [terminalTierLabel(input.tier)];
  if (input.sessionLabel.trim().length > 0) {
    parts.push(input.sessionLabel.trim());
  }
  return parts.join(" · ");
}
