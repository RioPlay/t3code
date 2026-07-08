export const WORKING_DURATION_PILL_ESTIMATED_HEIGHT = 56;
export const PENDING_INTERACTION_OVERLAY_ESTIMATED_HEIGHT = 120;

export function resolveComposerInsetAdjustment(input: {
  readonly footerChromeInset: number;
  readonly nativeInsetOvercount: number;
}): number {
  return input.footerChromeInset - input.nativeInsetOvercount;
}

export function resolveEstimatedComposerOverlayHeight(input: {
  readonly composerChrome: number;
  readonly composerBottomInset: number;
  readonly activeWorkStartedAt: string | null;
  readonly hasPendingInteraction: boolean;
  readonly footerChromeInset: number;
}): number {
  const activeWorkIndicatorHeight = input.activeWorkStartedAt
    ? WORKING_DURATION_PILL_ESTIMATED_HEIGHT
    : 0;
  const pendingInteractionHeight = input.hasPendingInteraction
    ? PENDING_INTERACTION_OVERLAY_ESTIMATED_HEIGHT
    : 0;

  return (
    input.composerChrome +
    input.composerBottomInset +
    activeWorkIndicatorHeight +
    pendingInteractionHeight +
    input.footerChromeInset
  );
}

export function resolveComposerContentInsetHeight(input: {
  readonly estimatedOverlayHeight: number;
  readonly nativeInsetOvercount: number;
}): number {
  return Math.max(0, input.estimatedOverlayHeight - input.nativeInsetOvercount);
}
