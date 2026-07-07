import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as Devices from "./Devices.ts";
import * as MobileDeliveries from "./MobileDeliveries.ts";
import { StagingTestDeviceNotFound, triggerStagingAgentPush } from "./StagingTestPush.ts";

const devicesLayer = Layer.succeed(
  Devices.Devices,
  Devices.Devices.of({
    register: () => Effect.void,
    unregister: () => Effect.void,
    listForUser: () => Effect.succeed([]),
    listAndroidPushTargets: () => Effect.succeed([]),
    findAndroidPushTargetByDeviceId: () =>
      Effect.succeed({
        user_id: "user-1",
        device_id: "device-1",
        platform: "android" as const,
        push_token: "fcm-token",
        preferences_json: JSON.stringify({
          liveActivitiesEnabled: false,
          notificationsEnabled: true,
          notifyOnApproval: true,
          notifyOnInput: true,
          notifyOnCompletion: true,
          notifyOnFailure: true,
        }),
      }),
  }),
);

const deliveriesLayer = Layer.succeed(
  MobileDeliveries.MobileDeliveries,
  MobileDeliveries.MobileDeliveries.of({
    listTargets: () => Effect.succeed([]),
    sendForTarget: () => Effect.succeed(null),
    sendPushNotificationForTarget: () =>
      Effect.succeed({
        deviceId: "device-1",
        kind: "push_notification" as const,
        ok: true,
        queued: true,
        apnsStatus: null,
        apnsReason: null,
        apnsId: "msg-1",
      }),
  }),
);

const testLayer = Layer.mergeAll(devicesLayer, deliveriesLayer);

describe("triggerStagingAgentPush", () => {
  it.effect("fails when the Android device is not registered", () =>
    Effect.gen(function* () {
      const missingDeviceLayer = Layer.succeed(
        Devices.Devices,
        Devices.Devices.of({
          register: () => Effect.void,
          unregister: () => Effect.void,
          listForUser: () => Effect.succeed([]),
          listAndroidPushTargets: () => Effect.succeed([]),
          findAndroidPushTargetByDeviceId: () => Effect.succeed(null),
        }),
      );

      const result = yield* Effect.result(
        triggerStagingAgentPush({
          deviceId: "missing-device",
          environmentId: "env-1" as never,
          threadId: "thread-1" as never,
          phase: "waiting_for_approval",
        }).pipe(Effect.provide(Layer.mergeAll(missingDeviceLayer, deliveriesLayer))),
      );

      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.failure).toBeInstanceOf(StagingTestDeviceNotFound);
      }
    }),
  );

  it.effect("queues a waiting_for_approval push for a registered Android device", () =>
    Effect.gen(function* () {
      const result = yield* triggerStagingAgentPush({
        deviceId: "device-1",
        environmentId: "env-1" as never,
        threadId: "thread-1" as never,
        phase: "waiting_for_approval",
      }).pipe(Effect.provide(testLayer));

      expect(result.ok).toBe(true);
      expect(result.phase).toBe("waiting_for_approval");
      expect(result.delivery?.queued).toBe(true);
    }),
  );
});
