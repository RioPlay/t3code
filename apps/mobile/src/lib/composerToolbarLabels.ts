import { Platform } from "react-native";

export function composerAttachButtonLabel(): string | undefined {
  return Platform.OS === "android" ? "Attach" : undefined;
}

export function composerModelButtonLabel(modelLabel: string): string {
  return Platform.OS === "android" ? `Model · ${modelLabel}` : modelLabel;
}

export function composerOptionsButtonLabel(configurationLabel: string): string {
  if (Platform.OS !== "android") {
    return configurationLabel;
  }
  return configurationLabel === "Configuration" ? "Options" : configurationLabel;
}
