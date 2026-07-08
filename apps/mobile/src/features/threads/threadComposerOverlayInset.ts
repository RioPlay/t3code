/** Height of the collapsed composer (pill + vertical padding, excluding safe-area inset). */
export const COMPOSER_COLLAPSED_CHROME = 60;

/** Height of the expanded composer (card + toolbar + vertical padding, excluding safe-area inset). */
export const COMPOSER_EXPANDED_CHROME = 174;

/** Attachment strip row in expanded strip-mode composer (72px thumb + gutter). */
export const COMPOSER_ATTACHMENT_STRIP_CHROME = 82;

export const THREAD_WORKING_INDICATOR_CHROME = 52;

export interface ThreadComposerOverlayInsetAdjustment {
  readonly footerChromeInset: number;
  readonly nativeInsetOvercount: number;
}

export function threadComposerOverlayHeightAdjustment(
  input: ThreadComposerOverlayInsetAdjustment,
): number {
  return input.footerChromeInset - input.nativeInsetOvercount;
}

export function threadComposerOverlayInsetFromMeasurement(
  measuredComposerHeight: number,
  input: ThreadComposerOverlayInsetAdjustment,
): number {
  return Math.max(0, measuredComposerHeight + threadComposerOverlayHeightAdjustment(input));
}

export function estimateThreadComposerOverlayHeight(input: {
  readonly expanded: boolean;
  readonly attachmentCount: number;
  readonly hasActiveWorkIndicator: boolean;
  readonly footerChromeInset: number;
}): number {
  let height = input.expanded ? COMPOSER_EXPANDED_CHROME : COMPOSER_COLLAPSED_CHROME;
  if (input.expanded && input.attachmentCount > 0) {
    height += COMPOSER_ATTACHMENT_STRIP_CHROME + 10;
  }
  if (input.hasActiveWorkIndicator) {
    height += THREAD_WORKING_INDICATOR_CHROME;
  }
  height += input.footerChromeInset;
  return height;
}

export function minimumThreadComposerContentInsetEnd(
  estimatedOverlayHeight: number,
  nativeInsetOvercount: number,
): number {
  return Math.max(0, estimatedOverlayHeight - nativeInsetOvercount);
}

export function resolveThreadComposerContentInsetEnd(input: {
  readonly measuredComposerHeight: number;
  readonly estimatedOverlayHeight: number;
  readonly adjustment: ThreadComposerOverlayInsetAdjustment;
}): number {
  const minimumInset = minimumThreadComposerContentInsetEnd(
    input.estimatedOverlayHeight,
    input.adjustment.nativeInsetOvercount,
  );
  const measuredInset = threadComposerOverlayInsetFromMeasurement(
    input.measuredComposerHeight,
    input.adjustment,
  );
  return Math.max(minimumInset, measuredInset);
}
