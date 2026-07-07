import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import type {
  RelayAgentActivityAggregateState,
  RelayAgentAwarenessPhase,
  RelayDeliveryResult,
  RelayStagingTestPushResponse,
} from "@t3tools/contracts/relay";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { sanitizeAgentActivityAggregateState } from "./agentActivityPayloads.ts";
import * as Devices from "./Devices.ts";
import * as MobileDeliveries from "./MobileDeliveries.ts";

export class StagingTestDeviceNotFound extends Schema.TaggedErrorClass<StagingTestDeviceNotFound>()(
  "StagingTestDeviceNotFound",
  {
    deviceId: Schema.String,
  },
) {
  override get message(): string {
    return `No registered Android push target found for device ${this.deviceId}.`;
  }
}

function statusForPhase(phase: RelayAgentAwarenessPhase): string {
  switch (phase) {
    case "waiting_for_approval":
      return "Approval";
    case "waiting_for_input":
      return "Input";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
    case "starting":
      return "Starting";
    case "running":
      return "Working";
    case "stale":
      return "Waiting";
  }
}

function buildStagingTestAggregate(input: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly phase: RelayAgentAwarenessPhase;
  readonly updatedAt: string;
}): RelayAgentActivityAggregateState {
  const deepLink = `/threads/${encodeURIComponent(input.environmentId)}/${encodeURIComponent(input.threadId)}`;
  return sanitizeAgentActivityAggregateState({
    title: "T3 Code",
    subtitle: "Agent work in progress",
    activeCount: 1,
    updatedAt: input.updatedAt,
    activities: [
      {
        environmentId: input.environmentId,
        threadId: input.threadId,
        projectTitle: "Maestro staging",
        threadTitle: "Approval needed",
        modelTitle: "Test model",
        phase: input.phase,
        status: statusForPhase(input.phase),
        updatedAt: input.updatedAt,
        deepLink,
      },
    ],
  });
}

export const triggerStagingAgentPush = Effect.fn("relay.staging_test.trigger_agent_push")(
  function* (input: {
    readonly deviceId: string;
    readonly environmentId: EnvironmentId;
    readonly threadId: ThreadId;
    readonly phase: RelayAgentAwarenessPhase;
  }) {
    const devices = yield* Devices.Devices;
    const mobileDeliveries = yield* MobileDeliveries.MobileDeliveries;
    const target = yield* devices.findAndroidPushTargetByDeviceId({ deviceId: input.deviceId });
    if (!target || !target.push_token) {
      return yield* new StagingTestDeviceNotFound({ deviceId: input.deviceId });
    }

    const now = yield* DateTime.now;
    const aggregate = buildStagingTestAggregate({
      environmentId: input.environmentId,
      threadId: input.threadId,
      phase: input.phase,
      updatedAt: DateTime.formatIso(now),
    });
    const delivery: RelayDeliveryResult | null =
      yield* mobileDeliveries.sendPushNotificationForTarget({
        target,
        aggregate,
      });

    return {
      ok: true,
      phase: input.phase,
      delivery,
    } satisfies RelayStagingTestPushResponse;
  },
);
