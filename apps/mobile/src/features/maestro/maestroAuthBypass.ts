import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";

import { activateCloudRelayAccount } from "../cloud/CloudAuthProvider";
import type { SavedRemoteConnection } from "../../lib/connection";
import { saveConnection } from "../../lib/storage";
import { buildMaestroShellSnapshot, MAESTRO_FIXTURE_ENVIRONMENT_ID } from "./maestroFixture";

export {
  buildMaestroShellSnapshot,
  MAESTRO_FIXTURE_ENVIRONMENT_ID,
  MAESTRO_FIXTURE_PROJECT_ID,
  MAESTRO_FIXTURE_THREAD_ID,
} from "./maestroFixture";

const MAESTRO_ACCOUNT_ID = "maestro-bypass-user";
const MAESTRO_RELAY_TOKEN = "maestro-bypass-relay-token";
const SHELL_SNAPSHOT_CACHE_DIRECTORY = "connection-shell-snapshots";
const SHELL_SNAPSHOT_SCHEMA_VERSION = 1;

const MAESTRO_CONNECTION: SavedRemoteConnection = {
  environmentId: MAESTRO_FIXTURE_ENVIRONMENT_ID,
  environmentLabel: "Maestro",
  pairingUrl: "https://maestro.example.test/pair",
  displayUrl: "https://maestro.example.test",
  httpBaseUrl: "https://maestro.example.test",
  wsBaseUrl: "wss://maestro.example.test/ws",
  bearerToken: null,
  authenticationMethod: "dpop",
  relayManaged: true,
  dpopAccessToken: "maestro-dpop-token",
};

export function isMaestroAuthBypassEnabled(): boolean {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return false;
  }
  const variant = Constants.expoConfig?.extra?.appVariant;
  if (variant === "production") {
    return false;
  }
  const extra = Constants.expoConfig?.extra as
    | { maestro?: { authBypassEnabled?: boolean } }
    | undefined;
  if (extra?.maestro?.authBypassEnabled === true) {
    return true;
  }
  const flag = process.env.EXPO_PUBLIC_MAESTRO_AUTH_BYPASS ?? "";
  return flag === "1" || flag === "true";
}

async function writeMaestroShellSnapshot(): Promise<void> {
  const snapshot = buildMaestroShellSnapshot();
  const directory = new Directory(
    Paths.document,
    SHELL_SNAPSHOT_CACHE_DIRECTORY,
    encodeURIComponent(MAESTRO_FIXTURE_ENVIRONMENT_ID),
  );
  if (!directory.exists) {
    directory.create({ intermediates: true, overwrite: true });
  }
  const file = new File(directory, `${encodeURIComponent(MAESTRO_FIXTURE_ENVIRONMENT_ID)}.json`);
  if (!file.exists) {
    file.create({ overwrite: true });
  }
  file.write(
    JSON.stringify({
      schemaVersion: SHELL_SNAPSHOT_SCHEMA_VERSION,
      environmentId: MAESTRO_FIXTURE_ENVIRONMENT_ID,
      snapshot,
    }),
  );
}

export async function applyMaestroAuthBypass(): Promise<void> {
  if (!isMaestroAuthBypassEnabled()) {
    return;
  }
  await saveConnection(MAESTRO_CONNECTION);
  await writeMaestroShellSnapshot();
  activateCloudRelayAccount(MAESTRO_ACCOUNT_ID, async () => MAESTRO_RELAY_TOKEN);
}
