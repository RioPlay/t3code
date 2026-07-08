import {
  LanDiscoveryBrowser,
  type LanDiscoveryLostService,
  type LanDiscoveryResolvedService,
} from "@t3tools/client-runtime/connection/lanDiscoveryBrowser";
import { addLanDiscoveryListener, startLanDiscovery, stopLanDiscovery } from "./lanDiscoveryNative";
import { ConnectionBlockedError } from "@t3tools/client-runtime/connection";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";

const makeLanDiscoveryBrowser = Effect.gen(function* () {
  const resolvedQueue = yield* Queue.unbounded<LanDiscoveryResolvedService>();
  const lostQueue = yield* Queue.unbounded<LanDiscoveryLostService>();

  yield* Effect.acquireRelease(
    Effect.sync(() =>
      addLanDiscoveryListener((event) => {
        if (event.type === "resolved") {
          Queue.offerUnsafe(resolvedQueue, {
            serviceName: event.serviceName,
            host: event.host,
            port: event.port,
          });
          return;
        }
        if (event.type === "lost") {
          Queue.offerUnsafe(lostQueue, { serviceName: event.serviceName });
        }
      }),
    ),
    (subscription) =>
      Effect.gen(function* () {
        subscription.remove();
        yield* Effect.tryPromise({
          try: () => stopLanDiscovery(),
          catch: () => undefined,
        }).pipe(Effect.ignore);
      }),
  );

  return LanDiscoveryBrowser.of({
    resolved: Stream.fromQueue(resolvedQueue),
    lost: Stream.fromQueue(lostQueue),
    start: Effect.tryPromise({
      try: () => startLanDiscovery(),
      catch: (cause) =>
        new ConnectionBlockedError({
          reason: "unsupported",
          detail:
            cause instanceof Error ? cause.message : "LAN discovery is unavailable on this device.",
        }),
    }),
    stop: Effect.tryPromise({
      try: () => stopLanDiscovery(),
      catch: () => undefined,
    }).pipe(Effect.ignore),
  });
});

export const lanDiscoveryBrowserLayer = Layer.effect(LanDiscoveryBrowser, makeLanDiscoveryBrowser);
