import { describe, expect, it } from "vite-plus/test";

import {
  agentPhaseAccentColor,
  agentPhaseStatusLabel,
  shouldShowAgentPhaseDetail,
} from "./agentPhaseIndicatorModel";

describe("agentPhaseIndicatorModel", () => {
  it("maps phase accent colors for light and dark schemes", () => {
    expect(agentPhaseAccentColor("running", "light")).toBe("#14b8a6");
    expect(agentPhaseAccentColor("waiting_for_approval", "dark")).toBe("#fb923c");
    expect(agentPhaseAccentColor("failed", "light")).toBe("#ef4444");
  });

  it("maps trailing status labels", () => {
    expect(agentPhaseStatusLabel("starting")).toBe("Starting");
    expect(agentPhaseStatusLabel("waiting_for_input")).toBe("Input");
    expect(agentPhaseStatusLabel("completed")).toBe("Done");
  });

  it("only expands running and starting detail subtitles", () => {
    expect(
      shouldShowAgentPhaseDetail(
        {
          environmentId: "env-1" as never,
          threadId: "thread-1" as never,
          projectTitle: "t3code",
          threadTitle: "Fix CI",
          phase: "running",
          headline: "Agent is working",
          detail: "codex is active.",
          modelTitle: "gpt-5.4",
          updatedAt: "2026-07-07T12:00:00.000Z",
          deepLink: "/threads/env-1/thread-1",
        },
        true,
      ),
    ).toBe(true);
    expect(
      shouldShowAgentPhaseDetail(
        {
          environmentId: "env-1" as never,
          threadId: "thread-1" as never,
          projectTitle: "t3code",
          threadTitle: "Fix CI",
          phase: "failed",
          headline: "Agent failed",
          modelTitle: "gpt-5.4",
          updatedAt: "2026-07-07T12:00:00.000Z",
          deepLink: "/threads/env-1/thread-1",
        },
        true,
      ),
    ).toBe(false);
  });
});
