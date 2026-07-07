import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { AsyncResult, Atom } from "effect/unstable/reactivity";

import * as LanEnvironmentDiscovery from "../connection/lanDiscovery.ts";
import { createRuntimeCommand } from "./runtime.ts";

export function createLanEnvironmentDiscoveryAtoms<R, E>(
  runtime: Atom.AtomRuntime<LanEnvironmentDiscovery.LanEnvironmentDiscovery | R, E>,
) {
  const stateAtom = runtime.atom(
    Stream.unwrap(
      LanEnvironmentDiscovery.LanEnvironmentDiscovery.pipe(
        Effect.map((discovery) => SubscriptionRef.changes(discovery.state)),
      ),
    ),
    { initialValue: LanEnvironmentDiscovery.EMPTY_LAN_ENVIRONMENT_DISCOVERY_STATE },
  );
  const stateValueAtom = Atom.make((get) =>
    Option.getOrElse(
      AsyncResult.value(get(stateAtom)),
      () => LanEnvironmentDiscovery.EMPTY_LAN_ENVIRONMENT_DISCOVERY_STATE,
    ),
  ).pipe(Atom.withLabel("lan-environment-discovery-value"));

  const start = createRuntimeCommand(runtime, {
    label: "lan-environment-discovery:start",
    concurrency: { mode: "singleFlight", key: () => "start" },
    execute: (_input: void) =>
      LanEnvironmentDiscovery.LanEnvironmentDiscovery.pipe(
        Effect.flatMap((discovery) => discovery.start),
      ),
  });

  const stop = createRuntimeCommand(runtime, {
    label: "lan-environment-discovery:stop",
    concurrency: { mode: "singleFlight", key: () => "stop" },
    execute: (_input: void) =>
      LanEnvironmentDiscovery.LanEnvironmentDiscovery.pipe(
        Effect.flatMap((discovery) => discovery.stop),
      ),
  });

  return {
    stateAtom,
    stateValueAtom,
    start,
    stop,
  };
}
