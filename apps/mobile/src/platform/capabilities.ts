import type { ComponentType } from "react";
import { Platform } from "react-native";

import {
  resolveNativeReviewDiffView,
  type NativeReviewDiffViewProps,
} from "../features/diffs/nativeReviewDiffSurface";
import { resolveNativeTerminalSurfaceView } from "../features/terminal/nativeTerminalModule";
import { hasNativeSelectableMarkdownText } from "../native/SelectableMarkdownText";

export type ComposerChipMode = "default" | "strip";

export interface PlatformCapabilities {
  readonly review: {
    readonly native: boolean;
  };
  readonly markdown: {
    readonly nativeSelectable: boolean;
    readonly useNitroMarkdown: boolean;
  };
  readonly terminal: {
    readonly native: boolean;
    readonly preferWebView: boolean;
  };
  readonly composer: {
    readonly chipMode: ComposerChipMode;
  };
}

function readPublicEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readTruthyPublicEnv(name: string): boolean {
  const value = readPublicEnv(name);
  return value === "1" || value === "true";
}

function readFalsyPublicEnv(name: string): boolean {
  const value = readPublicEnv(name);
  return value === "0" || value === "false";
}

function resolvePreferTerminalWebView(): boolean {
  if (readTruthyPublicEnv("EXPO_PUBLIC_TERMINAL_WEBVIEW")) {
    return true;
  }
  if (readFalsyPublicEnv("EXPO_PUBLIC_TERMINAL_WEBVIEW")) {
    return false;
  }
  return false;
}

function hasNativeComposerEditor(): boolean {
  try {
    const config = (
      globalThis as {
        readonly expo?: { readonly getViewConfig?: (moduleName: string) => unknown };
      }
    ).expo?.getViewConfig?.("T3ComposerEditor");
    return config != null;
  } catch {
    return false;
  }
}

export function resolvePlatformCapabilities(): PlatformCapabilities {
  const forceJsReview = readTruthyPublicEnv("EXPO_PUBLIC_FORCE_JS_REVIEW");
  const forceNitroMarkdown = readTruthyPublicEnv("EXPO_PUBLIC_FORCE_NITRO_MARKDOWN");
  const preferTerminalWebView = resolvePreferTerminalWebView();
  const chipModeEnv = readPublicEnv("EXPO_PUBLIC_COMPOSER_CHIP_MODE");
  const nativeComposerAvailable = hasNativeComposerEditor();

  const nativeReviewAvailable = resolveNativeReviewDiffView() !== null;
  const nativeMarkdownSelectable = hasNativeSelectableMarkdownText();
  const nativeTerminalAvailable = resolveNativeTerminalSurfaceView() !== null;

  const reviewNative = !forceJsReview && nativeReviewAvailable;
  const markdownNativeSelectable = !forceNitroMarkdown && nativeMarkdownSelectable;
  const useNitroMarkdown = forceNitroMarkdown || !markdownNativeSelectable;

  return {
    review: {
      native: reviewNative,
    },
    markdown: {
      nativeSelectable: markdownNativeSelectable,
      useNitroMarkdown,
    },
    terminal: {
      native: !preferTerminalWebView && nativeTerminalAvailable,
      preferWebView: preferTerminalWebView,
    },
    composer: {
      chipMode:
        chipModeEnv === "strip"
          ? "strip"
          : chipModeEnv === "default"
            ? "default"
            : nativeComposerAvailable
              ? "default"
              : "strip",
    },
  };
}

export const platformCapabilities: PlatformCapabilities = Object.freeze(
  resolvePlatformCapabilities(),
);

export function resolveCapabilityGatedReviewDiffView(): ComponentType<NativeReviewDiffViewProps> | null {
  if (!platformCapabilities.review.native) {
    return null;
  }
  return resolveNativeReviewDiffView();
}

export function shouldUseNativeSelectableMarkdown(): boolean {
  return platformCapabilities.markdown.nativeSelectable;
}

export function shouldUseNitroMarkdown(): boolean {
  return platformCapabilities.markdown.useNitroMarkdown;
}

export function shouldUseNativeComposerEditor(): boolean {
  if (!hasNativeComposerEditor()) {
    return false;
  }
  if (readFalsyPublicEnv("EXPO_PUBLIC_NATIVE_COMPOSER")) {
    return false;
  }
  if (Platform.OS === "android") {
    return true;
  }
  return readTruthyPublicEnv("EXPO_PUBLIC_NATIVE_COMPOSER");
}
