import {
  EnvironmentId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationShellSnapshot,
} from "@t3tools/contracts";

export const MAESTRO_FIXTURE_ENVIRONMENT_ID = EnvironmentId.make("maestro-test-env");
export const MAESTRO_FIXTURE_THREAD_ID = ThreadId.make("maestro-test-thread");
export const MAESTRO_FIXTURE_PROJECT_ID = ProjectId.make("maestro-test-project");

export function buildMaestroShellSnapshot(): OrchestrationShellSnapshot {
  const timestamp = "2026-07-07T00:00:00.000Z";
  return {
    snapshotSequence: 1,
    updatedAt: timestamp,
    projects: [
      {
        id: MAESTRO_FIXTURE_PROJECT_ID,
        title: "Maestro Project",
        workspaceRoot: "/maestro/project",
        repositoryIdentity: null,
        defaultModelSelection: null,
        scripts: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    threads: [
      {
        id: MAESTRO_FIXTURE_THREAD_ID,
        projectId: MAESTRO_FIXTURE_PROJECT_ID,
        title: "Maestro review thread",
        modelSelection: {
          instanceId: ProviderInstanceId.make("codex"),
          model: "gpt-5.4",
        },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: "main",
        worktreePath: null,
        latestTurn: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        archivedAt: null,
        session: null,
        latestUserMessageAt: null,
        hasPendingApprovals: false,
        hasPendingUserInput: false,
        hasActionableProposedPlan: false,
      },
    ],
  };
}
