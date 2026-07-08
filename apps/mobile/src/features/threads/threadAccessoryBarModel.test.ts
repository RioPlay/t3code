import { describe, expect, it } from "vite-plus/test";

import {
  resolveThreadAccessoryActiveItem,
  resolveThreadAccessoryBadges,
  resolveThreadAccessoryReviewPendingDot,
  shouldHidePhoneThreadAccessoryBar,
  threadAccessoryDisabledMessage,
} from "./threadAccessoryBarModel";

describe("threadAccessoryBarModel", () => {
  it("marks visible accessory surfaces as active accessory items", () => {
    expect(resolveThreadAccessoryActiveItem({ activeSurface: "files" })).toBe("files");
    expect(resolveThreadAccessoryActiveItem({ activeSurface: "terminal" })).toBe("terminal");
    expect(resolveThreadAccessoryActiveItem({ activeSurface: "review" })).toBe("review");
    expect(resolveThreadAccessoryActiveItem({ activeSurface: "git" })).toBe("git");
    expect(resolveThreadAccessoryActiveItem({ activeSurface: null })).toBeNull();
  });

  it("shows a review dot only when draft review comments are pending", () => {
    expect(resolveThreadAccessoryReviewPendingDot({ pendingReviewCommentCount: 0 })).toBe(false);
    expect(resolveThreadAccessoryReviewPendingDot({ pendingReviewCommentCount: 2 })).toBe(true);
  });

  it("derives review, git, and terminal badges without zero counts", () => {
    expect(
      resolveThreadAccessoryBadges({
        gitStatus: {
          isRepo: true,
          hasPrimaryRemote: true,
          isDefaultRef: true,
          refName: "main",
          hasWorkingTreeChanges: true,
          workingTree: { files: [{ path: "a.ts" }, { path: "b.ts" }] },
          aheadCount: 0,
          behindCount: 0,
          pr: null,
        } as never,
        terminalSessions: [
          {
            terminalId: "term-1",
            displayLabel: "Shell 1",
            cwd: "/repo",
            status: "running",
            hasRunningSubprocess: true,
            updatedAt: null,
          },
        ],
        reviewPendingDot: true,
      }),
    ).toEqual({
      review: { kind: "dot" },
      git: { kind: "count", count: 2 },
      terminal: { kind: "dot" },
    });
  });

  it("uses a git dot for ahead/behind when the worktree is clean", () => {
    expect(
      resolveThreadAccessoryBadges({
        gitStatus: {
          isRepo: true,
          hasPrimaryRemote: true,
          isDefaultRef: false,
          refName: "feature",
          hasWorkingTreeChanges: false,
          workingTree: { files: [] },
          aheadCount: 2,
          behindCount: 0,
          pr: null,
        } as never,
        terminalSessions: [],
        reviewPendingDot: false,
      }),
    ).toEqual({
      git: { kind: "dot" },
    });
  });

  it("hides the phone accessory bar only while the software keyboard is open on Android", () => {
    expect(
      shouldHidePhoneThreadAccessoryBar({
        usesAndroidAccessoryBar: true,
        layout: "phone",
        isKeyboardVisible: true,
      }),
    ).toBe(true);
    expect(
      shouldHidePhoneThreadAccessoryBar({
        usesAndroidAccessoryBar: true,
        layout: "phone",
        isKeyboardVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldHidePhoneThreadAccessoryBar({
        usesAndroidAccessoryBar: false,
        layout: "phone",
        isKeyboardVisible: true,
      }),
    ).toBe(false);
    expect(
      shouldHidePhoneThreadAccessoryBar({
        usesAndroidAccessoryBar: true,
        layout: "rail",
        isKeyboardVisible: true,
      }),
    ).toBe(false);
  });

  it("returns disabled snackbar copy per item", () => {
    expect(threadAccessoryDisabledMessage("files")).toContain("Connect environment");
    expect(threadAccessoryDisabledMessage("terminal")).toContain("terminal");
  });
});
