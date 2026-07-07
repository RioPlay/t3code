import type { ComposerInlineToken } from "@t3tools/shared/composerInlineTokens";

export function removeComposerInlineToken(text: string, token: ComposerInlineToken): string {
  const before = text.slice(0, token.start);
  const after = text.slice(token.end);
  return `${before}${after}`.replace(/ {2,}/g, " ");
}
