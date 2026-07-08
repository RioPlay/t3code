import { describe, expect, it } from "vite-plus/test";

import { buildReviewListItems, type ReviewRenderableFile } from "./reviewModel";
import {
  buildReviewListItemOffsetStarts,
  resolveReviewListIndexAtOffset,
  resolveReviewListItemHeight,
  REVIEW_DIFF_LINE_HEIGHT,
  REVIEW_FILE_HEADER_ROW_HEIGHT,
  REVIEW_HUNK_ROW_HEIGHT,
} from "./reviewListLayout";

function makeRenderableFile(
  input: Partial<ReviewRenderableFile> & Pick<ReviewRenderableFile, "path">,
): ReviewRenderableFile {
  return {
    id: input.path,
    cacheKey: input.path,
    previousPath: null,
    changeType: "new",
    additions: 1,
    deletions: 0,
    languageHint: null,
    additionLines: [],
    deletionLines: [],
    rows: [
      {
        kind: "hunk",
        id: "hunk-1",
        header: "@@ -1,1 +1,2 @@",
        context: null,
      },
      {
        kind: "line",
        id: "line-1",
        change: "add",
        oldLineNumber: null,
        newLineNumber: 1,
        content: "const value = 1;",
        additionTokenIndex: 0,
        deletionTokenIndex: null,
        comparison: null,
      },
    ],
    ...input,
  };
}

describe("reviewListLayout", () => {
  it("assigns fixed heights per virtualized row kind", () => {
    const file = makeRenderableFile({ path: "src/layout.ts" });
    const items = buildReviewListItems({
      files: [file],
      expandedFileIds: [file.id],
      revealedLargeFileIds: [],
    });

    expect(resolveReviewListItemHeight(items[0])).toBe(REVIEW_FILE_HEADER_ROW_HEIGHT);
    expect(resolveReviewListItemHeight(items[1])).toBe(REVIEW_HUNK_ROW_HEIGHT);
    expect(resolveReviewListItemHeight(items[2])).toBe(REVIEW_DIFF_LINE_HEIGHT);
  });

  it("maps scroll offsets to the first visible flattened row index", () => {
    const file = makeRenderableFile({ path: "src/offset.ts" });
    const items = buildReviewListItems({
      files: [file],
      expandedFileIds: [file.id],
      revealedLargeFileIds: [],
    });
    const offsetStarts = buildReviewListItemOffsetStarts(items);

    expect(resolveReviewListIndexAtOffset(offsetStarts, 0)).toBe(0);
    expect(resolveReviewListIndexAtOffset(offsetStarts, REVIEW_FILE_HEADER_ROW_HEIGHT)).toBe(1);
    expect(resolveReviewListIndexAtOffset(offsetStarts, offsetStarts[2])).toBe(2);
  });
});
