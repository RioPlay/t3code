import type { AgentAwarenessPhase, AgentAwarenessState } from "@t3tools/shared/agentAwareness";

export type AgentPhaseIndicatorColorScheme = "light" | "dark";

const PHASE_ACCENT_COLORS: Readonly<
  Record<AgentAwarenessPhase, Readonly<{ readonly light: string; readonly dark: string }>>
> = {
  starting: { light: "#0d9488", dark: "#2dd4bf" },
  running: { light: "#14b8a6", dark: "#14b8a6" },
  waiting_for_approval: { light: "#f97316", dark: "#fb923c" },
  waiting_for_input: { light: "#f97316", dark: "#fb923c" },
  failed: { light: "#ef4444", dark: "#f87171" },
  completed: { light: "#16a34a", dark: "#4ade80" },
  stale: { light: "#737373", dark: "#8e8e93" },
};

const PHASE_STATUS_LABELS: Readonly<Record<AgentAwarenessPhase, string>> = {
  starting: "Starting",
  running: "Working",
  waiting_for_approval: "Approval",
  waiting_for_input: "Input",
  failed: "Failed",
  completed: "Done",
  stale: "Waiting",
};

export function agentPhaseAccentColor(
  phase: AgentAwarenessPhase,
  colorScheme: AgentPhaseIndicatorColorScheme,
): string {
  return PHASE_ACCENT_COLORS[phase][colorScheme];
}

export function agentPhaseStatusLabel(phase: AgentAwarenessPhase): string {
  return PHASE_STATUS_LABELS[phase];
}

export function shouldShowAgentPhaseDetail(
  awareness: AgentAwarenessState,
  expanded: boolean,
): boolean {
  if (!expanded) {
    return false;
  }
  return awareness.phase === "running" || awareness.phase === "starting";
}
