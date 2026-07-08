import { MOBILE_CODE_SURFACE } from "../../lib/typography";

import type { ReviewListItem } from "./reviewModel";

export const REVIEW_DIFF_LINE_HEIGHT = MOBILE_CODE_SURFACE.rowHeight;

/** Fixed list row heights — keep in sync with `JavaScriptReviewDiffList` row styles. */
export const REVIEW_FILE_HEADER_ROW_HEIGHT = 38;
export const REVIEW_HUNK_ROW_HEIGHT = 26;
export const REVIEW_HUNK_WITH_CONTEXT_ROW_HEIGHT = 40;
export const REVIEW_FILE_SUPPRESSED_ROW_HEIGHT = 48;
export const REVIEW_FILE_SUPPRESSED_WITH_ACTION_ROW_HEIGHT = 72;

export function resolveReviewListItemHeight(
  item: ReviewListItem,
  lineRowHeight: number = REVIEW_DIFF_LINE_HEIGHT,
): number | undefined {
  switch (item.kind) {
    case "line":
      return lineRowHeight;
    case "file-header":
      return REVIEW_FILE_HEADER_ROW_HEIGHT;
    case "hunk":
      return item.row.context ? REVIEW_HUNK_WITH_CONTEXT_ROW_HEIGHT : REVIEW_HUNK_ROW_HEIGHT;
    case "file-suppressed":
      return item.actionLabel
        ? REVIEW_FILE_SUPPRESSED_WITH_ACTION_ROW_HEIGHT
        : REVIEW_FILE_SUPPRESSED_ROW_HEIGHT;
    default:
      return undefined;
  }
}

export function buildReviewListItemOffsetStarts(
  items: ReadonlyArray<ReviewListItem>,
  lineRowHeight: number = REVIEW_DIFF_LINE_HEIGHT,
): ReadonlyArray<number> {
  const offsets: number[] = [];
  let offset = 0;
  for (const item of items) {
    offsets.push(offset);
    offset += resolveReviewListItemHeight(item, lineRowHeight) ?? lineRowHeight;
  }
  return offsets;
}

export function resolveReviewListIndexAtOffset(
  offsetStarts: ReadonlyArray<number>,
  offsetY: number,
): number {
  let low = 0;
  let high = offsetStarts.length - 1;
  let result = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsetStarts[mid] <= offsetY) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}
