import type { DesktopServerExposureMode } from "@t3tools/contracts";
import { T3_CODE_LAN_SERVICE_TYPE } from "@t3tools/shared/lanDiscovery";
import { Bonjour, type Service } from "bonjour-service";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";

export interface DesktopLanAdvertisementSyncInput {
  readonly mode: DesktopServerExposureMode;
  readonly port: number;
  readonly advertisedHost: string | null;
  readonly label: string;
}

export class DesktopLanAdvertisement extends Context.Service<
  DesktopLanAdvertisement,
  {
    readonly sync: (input: DesktopLanAdvertisementSyncInput) => Effect.Effect<void>;
    readonly shutdown: Effect.Effect<void>;
  }
>()("@t3tools/desktop/backend/DesktopLanAdvertisement") {}

const lanBonjourType = T3_CODE_LAN_SERVICE_TYPE.replace(/^_|\._tcp$/gu, "");

const make = Effect.gen(function* () {
  const bonjour = new Bonjour();
  const publishedRef = yield* Ref.make<Service | null>(null);

  const unpublish = Effect.gen(function* () {
    const current = yield* Ref.get(publishedRef);
    if (current !== null) {
      current.stop();
    }
    yield* Ref.set(publishedRef, null);
  });

  const sync = Effect.fn("desktop.lanAdvertisement.sync")(function* (
    input: DesktopLanAdvertisementSyncInput,
  ) {
    yield* unpublish;

    const advertisedHost = input.advertisedHost;
    if (input.mode !== "network-accessible" || input.port <= 0 || advertisedHost === null) {
      return;
    }

    const service = yield* Effect.sync(() =>
      bonjour.publish({
        name: input.label,
        type: lanBonjourType,
        port: input.port,
        host: advertisedHost,
        txt: {
          v: "1",
        },
      }),
    );
    yield* Ref.set(publishedRef, service);
  });

  const shutdown = Effect.gen(function* () {
    yield* unpublish;
    yield* Effect.sync(() => {
      bonjour.destroy();
    });
  });

  yield* Effect.addFinalizer(() => shutdown);

  return DesktopLanAdvertisement.of({ sync, shutdown });
});

export const layer = Layer.effect(DesktopLanAdvertisement, make);
