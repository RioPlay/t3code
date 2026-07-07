import type { ComponentType } from "react";

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

export function resolvePlatformCapabilities(): PlatformCapabilities {
  const forceJsReview = readTruthyPublicEnv("EXPO_PUBLIC_FORCE_JS_REVIEW");
  const forceNitroMarkdown = readTruthyPublicEnv("EXPO_PUBLIC_FORCE_NITRO_MARKDOWN");
  const preferTerminalWebView = readTruthyPublicEnv("EXPO_PUBLIC_TERMINAL_WEBVIEW");
  const chipModeEnv = readPublicEnv("EXPO_PUBLIC_COMPOSER_CHIP_MODE");

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
      chipMode: chipModeEnv === "strip" ? "strip" : "default",
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
