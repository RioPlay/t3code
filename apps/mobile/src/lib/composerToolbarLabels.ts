import { Platform } from "react-native";

import type { RemoteClientConnectionState } from "./connection";

export function resolveComposerSendLabel(input: {
  readonly connectionState: RemoteClientConnectionState;
  readonly activeThreadBusy: boolean;
  readonly queueCount: number;
}): string {
  if (input.connectionState !== "connected" || input.activeThreadBusy || input.queueCount > 0) {
    return Platform.OS === "android" ? "Queue message" : "Queue";
  }
  return Platform.OS === "android" ? "Send message" : "Send";
}

export function resolveComposerToolbarAccessibilityLabel(
  kind: "model" | "configuration" | "attach" | "stop",
): string {
  if (Platform.OS !== "android") {
    switch (kind) {
      case "model":
        return "Model";
      case "configuration":
        return "Configuration";
      case "attach":
        return "Attach";
      case "stop":
        return "Stop agent";
    }
  }

  switch (kind) {
    case "model":
      return "Choose model";
    case "configuration":
      return "Agent configuration";
    case "attach":
      return "Attach image";
    case "stop":
      return "Stop agent";
  }
}
