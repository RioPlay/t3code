import { Platform } from "react-native";

import type { AppNativeStackNavigationOptions } from "../../native/StackHeader";

/** Spacing between Android header toolbar controls (Material touch-target rhythm). */
export const ANDROID_HEADER_TOOLBAR_GAP = 12;

export function resolveAndroidWorkspaceHeaderOptions(
  sheetColor: string,
): Pick<
  AppNativeStackNavigationOptions,
  "headerShadowVisible" | "headerStyle" | "headerTransparent"
> {
  if (Platform.OS !== "android") {
    return {};
  }

  return {
    headerShadowVisible: true,
    headerStyle: { backgroundColor: sheetColor },
    headerTransparent: false,
  };
}
