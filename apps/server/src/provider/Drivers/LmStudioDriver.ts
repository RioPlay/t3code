import { LmStudioSettings, ProviderDriverKind, type ServerProvider } from "@t3tools/contracts";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";

import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { makeLmStudioTextGeneration } from "../../textGeneration/LmStudioTextGeneration.ts";
import { ProviderDriverError } from "../Errors.ts";
import { makeLmStudioAdapter } from "../Layers/LmStudioAdapter.ts";
import {
  checkLmStudioProviderStatus,
  makePendingLmStudioProvider,
  stampLmStudioSnapshot,
} from "../Layers/LmStudioProvider.ts";
import { makeManagedServerProvider } from "../makeManagedServerProvider.ts";
import { makeManualOnlyProviderMaintenanceCapabilities } from "../providerMaintenance.ts";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
  type ProviderSnapshotSettings,
} from "../providerUpdateSettings.ts";
import {
  defaultProviderContinuationIdentity,
  type ProviderDriver,
  type ProviderInstance,
} from "../ProviderDriver.ts";

const decodeLmStudioSettings = Schema.decodeSync(LmStudioSettings);
const DRIVER_KIND = ProviderDriverKind.make("lmstudio");
const SNAPSHOT_REFRESH_INTERVAL = Duration.seconds(30);

export type LmStudioDriverEnv = ServerConfig | ServerSettingsService | HttpClient.HttpClient;

const maintenanceCapabilities = makeManualOnlyProviderMaintenanceCapabilities({
  provider: DRIVER_KIND,
  packageName: null,
});

const withInstanceIdentity =
  (input: {
    readonly instanceId: ProviderInstance["instanceId"];
    readonly displayName: string | undefined;
    readonly accentColor: string | undefined;
    readonly continuationGroupKey: string;
  }) =>
  (snapshot: Omit<ServerProvider, "instanceId" | "driver">): ServerProvider =>
    stampLmStudioSnapshot({
      snapshot,
      instanceId: input.instanceId,
      displayName: input.displayName,
      accentColor: input.accentColor,
      continuationGroupKey: input.continuationGroupKey,
    });

export const LmStudioDriver: ProviderDriver<LmStudioSettings, LmStudioDriverEnv> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: "LM Studio",
    supportsMultipleInstances: true,
  },
  configSchema: LmStudioSettings,
  defaultConfig: (): LmStudioSettings => decodeLmStudioSettings({}),
  create: ({ instanceId, displayName, accentColor, enabled, config }) =>
    Effect.gen(function* () {
      const serverSettings = yield* ServerSettingsService;
      const httpClient = yield* HttpClient.HttpClient;
      const continuationIdentity = defaultProviderContinuationIdentity({
        driverKind: DRIVER_KIND,
        instanceId,
      });
      const stampIdentity = withInstanceIdentity({
        instanceId,
        displayName,
        accentColor,
        continuationGroupKey: continuationIdentity.continuationKey,
      });
      const effectiveConfig = { ...config, enabled } satisfies LmStudioSettings;
      const adapter = yield* makeLmStudioAdapter(effectiveConfig, { instanceId });
      const textGeneration = yield* makeLmStudioTextGeneration(effectiveConfig);
      const snapshotSettings = makeProviderSnapshotSettingsSource(effectiveConfig, serverSettings);
      const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<LmStudioSettings>>(
        {
          maintenanceCapabilities,
          getSettings: snapshotSettings.getSettings,
          streamSettings: snapshotSettings.streamSettings,
          haveSettingsChanged: haveProviderSnapshotSettingsChanged,
          initialSnapshot: (settings) =>
            makePendingLmStudioProvider(settings.provider).pipe(Effect.map(stampIdentity)),
          checkProvider: checkLmStudioProviderStatus(effectiveConfig).pipe(
            Effect.provideService(HttpClient.HttpClient, httpClient),
            Effect.map(stampIdentity),
          ),
          refreshInterval: SNAPSHOT_REFRESH_INTERVAL,
        },
      ).pipe(
        Effect.mapError(
          (cause) =>
            new ProviderDriverError({
              driver: DRIVER_KIND,
              instanceId,
              detail: `Failed to build LM Studio snapshot: ${cause.message ?? String(cause)}`,
              cause,
            }),
        ),
      );

      return {
        instanceId,
        driverKind: DRIVER_KIND,
        continuationIdentity,
        displayName,
        accentColor,
        enabled,
        snapshot,
        adapter,
        textGeneration,
      } satisfies ProviderInstance;
    }),
};
