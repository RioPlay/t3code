import {
  collectComposerInlineTokens,
  type ComposerInlineToken,
} from "@t3tools/shared/composerInlineTokens";
import { useMemo, useRef } from "react";

/**
 * Stable token collection for strip-mode composer UI — mirrors the iOS native
 * editor's `preserveTrailingFrom` behavior so partially typed tokens do not flicker.
 */
export function useStableComposerInlineTokens(text: string): ReadonlyArray<ComposerInlineToken> {
  const confirmedTokensRef = useRef(collectComposerInlineTokens(text));

  return useMemo(() => {
    const tokens = collectComposerInlineTokens(text, {
      preserveTrailingFrom: confirmedTokensRef.current,
    });
    confirmedTokensRef.current = tokens;
    return tokens;
  }, [text]);
}
