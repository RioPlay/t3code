import type { RefObject } from "react";
import { Platform } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import type { AppNativeStackNavigationOptions } from "../../native/StackHeader";

export interface AndroidStackedSearchBarInput {
  readonly placeholder: string;
  readonly onChangeText: (text: string) => void;
  readonly onClear?: () => void;
  readonly ref?: RefObject<SearchBarCommands | null>;
  readonly autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

/**
 * Android fallback for iOS Mail-style `mailSearchToolbar` headers.
 *
 * Pins a stacked UISearchBar-style field under the title and pairs with
 * `NativeHeaderToolbar.SearchBarSlot` for filter/compose actions.
 */
export function createAndroidStackedSearchBarOptions(
  input: AndroidStackedSearchBarInput,
): NonNullable<AppNativeStackNavigationOptions["headerSearchBarOptions"]> {
  return {
    ref: input.ref,
    allowToolbarIntegration: true,
    autoCapitalize: input.autoCapitalize ?? "none",
    hideNavigationBar: false,
    hideWhenScrolling: false,
    obscureBackground: false,
    placement: "stacked",
    placeholder: input.placeholder,
    onCancelButtonPress: () => {
      input.onClear?.();
    },
    onChangeText: (event) => {
      input.onChangeText(event.nativeEvent.text);
    },
  };
}

export function shouldUseAndroidStackedSearchToolbar(): boolean {
  return Platform.OS === "android";
}

export interface AndroidSidebarSearchFieldStyle {
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly borderRadius: number;
  readonly borderWidth: number;
}

export function resolveAndroidSidebarSearchFieldStyle(input: {
  readonly subtleBackground: string;
  readonly borderColor: string;
}): AndroidSidebarSearchFieldStyle {
  return {
    backgroundColor: input.subtleBackground,
    borderColor: input.borderColor,
    borderRadius: 28,
    borderWidth: 1,
  };
}
