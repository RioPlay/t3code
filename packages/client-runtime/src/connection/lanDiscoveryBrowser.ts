import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

import type { ConnectionBlockedError } from "./model.ts";

export interface LanDiscoveryResolvedService {
  readonly serviceName: string;
  readonly host: string;
  readonly port: number;
}

export interface LanDiscoveryLostService {
  readonly serviceName: string;
}

export class LanDiscoveryBrowser extends Context.Service<
  LanDiscoveryBrowser,
  {
    readonly resolved: Stream.Stream<LanDiscoveryResolvedService>;
    readonly lost: Stream.Stream<LanDiscoveryLostService>;
    readonly start: Effect.Effect<void, ConnectionBlockedError>;
    readonly stop: Effect.Effect<void>;
  }
>()("@t3tools/client-runtime/connection/lanDiscoveryBrowser") {}

export const noopLanDiscoveryBrowserLayer = Layer.succeed(
  LanDiscoveryBrowser,
  LanDiscoveryBrowser.of({
    resolved: Stream.empty,
    lost: Stream.empty,
    start: Effect.void,
    stop: Effect.void,
  }),
);
