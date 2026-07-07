import {
  collectComposerInlineTokens,
  type ComposerInlineToken,
} from "@t3tools/shared/composerInlineTokens";

/**
 * Canonical Android/iOS/web composer send token payload — DEC-006 / CMP-004.
 * Message text remains authoritative; tokens are derived with the shared parser.
 */
export function collectComposerSendInlineTokens(text: string): ReadonlyArray<ComposerInlineToken> {
  return collectComposerInlineTokens(text.trim());
}
