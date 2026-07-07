import { describe, expect, it } from "vite-plus/test";

import {
  resolveThreadAccessoryActiveItem,
  resolveThreadAccessoryBadges,
  threadAccessoryDisabledMessage,
} from "./threadAccessoryBarModel";

describe("threadAccessoryBarModel", () => {
  it("marks files and git inspectors as active accessory items", () => {
    expect(resolveThreadAccessoryActiveItem({ inspectorMode: "files" })).toBe("files");
    expect(resolveThreadAccessoryActiveItem({ inspectorMode: "git" })).toBe("git");
    expect(resolveThreadAccessoryActiveItem({ inspectorMode: null })).toBeNull();
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

  it("returns disabled snackbar copy per item", () => {
    expect(threadAccessoryDisabledMessage("files")).toContain("Connect environment");
    expect(threadAccessoryDisabledMessage("terminal")).toContain("terminal");
  });
});
