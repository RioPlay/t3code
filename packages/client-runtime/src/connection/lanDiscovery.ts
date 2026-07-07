import type { ExecutionEnvironmentDescriptor } from "@t3tools/contracts";
import {
  lanDiscoveryServiceKey,
  resolveLanDiscoveryHttpBaseUrl,
} from "@t3tools/shared/lanDiscovery";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";

import { fetchRemoteEnvironmentDescriptor } from "../environment/descriptor.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import { ConnectionBlockedError, type ConnectionAttemptError } from "./model.ts";
import * as Connectivity from "./connectivity.ts";
import * as LanDiscoveryBrowser from "./lanDiscoveryBrowser.ts";

export type LanDiscoveredEnvironmentStatus = "resolving" | "available" | "unavailable" | "lost";

export interface LanDiscoveredEnvironment {
  readonly key: string;
  readonly serviceName: string;
  readonly httpBaseUrl: string;
  readonly status: LanDiscoveredEnvironmentStatus;
  readonly descriptor: ExecutionEnvironmentDescriptor | null;
  readonly error: string | null;
}

export interface LanEnvironmentDiscoveryState {
  readonly environments: ReadonlyMap<string, LanDiscoveredEnvironment>;
  readonly scanning: boolean;
  readonly offline: boolean;
  readonly error: Option.Option<ConnectionAttemptError>;
}

export class LanEnvironmentDiscovery extends Context.Service<
  LanEnvironmentDiscovery,
  {
    readonly state: SubscriptionRef.SubscriptionRef<LanEnvironmentDiscoveryState>;
    readonly start: Effect.Effect<void>;
    readonly stop: Effect.Effect<void>;
  }
>()("@t3tools/client-runtime/connection/lanDiscovery/LanEnvironmentDiscovery") {}

export const EMPTY_LAN_ENVIRONMENT_DISCOVERY_STATE: LanEnvironmentDiscoveryState = {
  environments: new Map(),
  scanning: false,
  offline: false,
  error: Option.none(),
};

const DESCRIPTOR_TIMEOUT_MS = 4_000;

export const make = Effect.fn("LanEnvironmentDiscovery.make")(function* () {
  const browser = yield* LanDiscoveryBrowser.LanDiscoveryBrowser;
  const connectivity = yield* Connectivity.Connectivity;
  const state = yield* SubscriptionRef.make(EMPTY_LAN_ENVIRONMENT_DISCOVERY_STATE);
  const startLock = yield* Semaphore.make(1);
  const validating = yield* Ref.make(new Set<string>());
  const active = yield* Ref.make(false);

  const upsertEnvironment = Effect.fn("LanEnvironmentDiscovery.upsertEnvironment")(function* (
    key: string,
    environment: LanDiscoveredEnvironment,
  ) {
    yield* SubscriptionRef.update(state, (current) => {
      const next = new Map(current.environments);
      next.set(key, environment);
      return { ...current, environments: next };
    });
  });

  const removeEnvironment = Effect.fn("LanEnvironmentDiscovery.removeEnvironment")(function* (
    key: string,
  ) {
    yield* SubscriptionRef.update(state, (current) => {
      if (!current.environments.has(key)) {
        return current;
      }
      const next = new Map(current.environments);
      next.delete(key);
      return { ...current, environments: next };
    });
  });

  const validateResolvedService = Effect.fn("LanEnvironmentDiscovery.validateResolvedService")(
    function* (service: LanDiscoveryBrowser.LanDiscoveryResolvedService) {
      const httpBaseUrl = resolveLanDiscoveryHttpBaseUrl(service.host, service.port);
      const key = lanDiscoveryServiceKey(service.host, service.port);
      const validatingSet = yield* Ref.get(validating);
      if (validatingSet.has(key)) {
        return;
      }
      yield* Ref.update(validating, (current) => new Set([...current, key]));
      yield* upsertEnvironment(key, {
        key,
        serviceName: service.serviceName,
        httpBaseUrl,
        status: "resolving",
        descriptor: null,
        error: null,
      });

      const descriptor = yield* fetchRemoteEnvironmentDescriptor({
        httpBaseUrl,
        timeoutMs: DESCRIPTOR_TIMEOUT_MS,
      }).pipe(
        Effect.map((value) => ({ _tag: "available" as const, value })),
        Effect.catch((error) =>
          Effect.succeed({
            _tag: "unavailable" as const,
            message:
              error instanceof Error
                ? error.message
                : "Could not verify the discovered environment.",
          }),
        ),
      );

      yield* Ref.update(validating, (current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });

      if (!(yield* Ref.get(active))) {
        return;
      }

      if (descriptor._tag === "available") {
        yield* upsertEnvironment(key, {
          key,
          serviceName: service.serviceName,
          httpBaseUrl,
          status: "available",
          descriptor: descriptor.value,
          error: null,
        });
        return;
      }

      yield* upsertEnvironment(key, {
        key,
        serviceName: service.serviceName,
        httpBaseUrl,
        status: "unavailable",
        descriptor: null,
        error: descriptor.message,
      });
    },
  );

  const start = startLock.withPermits(1)(
    Effect.gen(function* () {
      if ((yield* connectivity.status) === "offline") {
        yield* SubscriptionRef.update(state, (current) => ({
          ...current,
          scanning: false,
          offline: true,
        }));
        return;
      }

      yield* Ref.set(active, true);
      yield* SubscriptionRef.set(state, {
        environments: new Map(),
        scanning: true,
        offline: false,
        error: Option.none(),
      });
      yield* browser.start;
    }).pipe(
      Effect.catch((error) =>
        SubscriptionRef.update(state, (current) => ({
          ...current,
          scanning: false,
          error: Option.some(
            Schema.is(ConnectionBlockedError)(error) ? error : mapRemoteEnvironmentError(error),
          ),
        })),
      ),
    ),
  );

  const stop = Effect.gen(function* () {
    yield* Ref.set(active, false);
    yield* Ref.set(validating, new Set());
    yield* browser.stop;
    yield* SubscriptionRef.update(state, (current) => ({
      ...current,
      scanning: false,
    }));
  });

  yield* browser.resolved.pipe(
    Stream.runForEach((service) => validateResolvedService(service)),
    Effect.forkScoped,
  );

  yield* browser.lost.pipe(
    Stream.runForEach((service) =>
      Effect.gen(function* () {
        const entries = (yield* SubscriptionRef.get(state)).environments;
        for (const [key, environment] of entries) {
          if (environment.serviceName !== service.serviceName) {
            continue;
          }
          yield* removeEnvironment(key);
        }
      }),
    ),
    Effect.forkScoped,
  );

  yield* connectivity.changes.pipe(
    Stream.changes,
    Stream.runForEach((networkStatus) =>
      networkStatus === "offline"
        ? SubscriptionRef.update(state, (current) => ({
            ...current,
            scanning: false,
            offline: true,
          }))
        : Effect.void,
    ),
    Effect.forkScoped,
  );

  return LanEnvironmentDiscovery.of({ state, start, stop });
});

export const layer = Layer.effect(LanEnvironmentDiscovery, make());
