import type { VcsStatusResult } from "@t3tools/contracts";

import type { TerminalMenuSession } from "../terminal/terminalMenu";

export type ThreadAccessoryItemId = "files" | "terminal" | "review" | "git";

export const THREAD_ACCESSORY_BAR_HEIGHT = 56;
export const THREAD_ACCESSORY_MIN_TOUCH_TARGET = 48;

export type ThreadAccessoryBadge =
  | { readonly kind: "dot" }
  | { readonly kind: "count"; readonly count: number };

export type ThreadAccessoryInspectorMode = "files" | "git" | "route" | null;

export function resolveThreadAccessoryActiveItem(input: {
  readonly inspectorMode: ThreadAccessoryInspectorMode;
}): ThreadAccessoryItemId | null {
  if (input.inspectorMode === "files") {
    return "files";
  }
  if (input.inspectorMode === "git") {
    return "git";
  }
  return null;
}

export function resolveThreadAccessoryBadges(input: {
  readonly gitStatus: VcsStatusResult | null;
  readonly terminalSessions: ReadonlyArray<TerminalMenuSession>;
  readonly reviewPendingDot: boolean;
}): Readonly<Partial<Record<ThreadAccessoryItemId, ThreadAccessoryBadge>>> {
  const badges: Partial<Record<ThreadAccessoryItemId, ThreadAccessoryBadge>> = {};

  if (input.reviewPendingDot) {
    badges.review = { kind: "dot" };
  }

  const changedFileCount = input.gitStatus?.workingTree.files.length ?? 0;
  if (changedFileCount > 0) {
    badges.git = { kind: "count", count: changedFileCount };
  } else if ((input.gitStatus?.aheadCount ?? 0) > 0 || (input.gitStatus?.behindCount ?? 0) > 0) {
    badges.git = { kind: "dot" };
  }

  const hasActiveTerminal = input.terminalSessions.some(
    (session) => session.status === "running" || session.status === "starting",
  );
  if (hasActiveTerminal) {
    badges.terminal = { kind: "dot" };
  }

  return badges;
}

export function threadAccessoryDisabledMessage(item: ThreadAccessoryItemId): string {
  switch (item) {
    case "files":
      return "Connect environment to open files";
    case "terminal":
      return "Connect environment to open terminal";
    case "review":
      return "Connect environment to open review";
    case "git":
      return "Connect environment to open git";
  }
}
