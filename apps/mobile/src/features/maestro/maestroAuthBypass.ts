import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

import { activateCloudRelayAccount } from "../cloud/CloudAuthProvider";
import { CONNECTION_CATALOG_KEY } from "../../connection/catalog-store";
import type { SavedRemoteConnection } from "../../lib/connection";
import { replaceSavedConnections } from "../../persistence/imperative";
import { buildMaestroShellSnapshot, MAESTRO_FIXTURE_ENVIRONMENT_ID } from "./maestroFixture";
import { isMaestroAuthBypassEnabled } from "./maestroMode";

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
  bearerToken: "maestro-bypass-token",
  authenticationMethod: "bearer",
};

export { isMaestroAuthBypassEnabled } from "./maestroMode";

async function writeMaestroShellSnapshot(): Promise<void> {
  const snapshot = buildMaestroShellSnapshot();
  const directory = new Directory(Paths.document, SHELL_SNAPSHOT_CACHE_DIRECTORY);
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

async function replaceSavedConnectionsWithMaestroFixture(): Promise<void> {
  // Drop the migrated v1 catalog so the next load re-imports only the Maestro fixture.
  try {
    await SecureStore.deleteItemAsync(CONNECTION_CATALOG_KEY);
  } catch {
    // Secure store may be unavailable in some harnesses; legacy seed still applies.
  }
  await replaceSavedConnections([MAESTRO_CONNECTION]);
}

export async function applyMaestroAuthBypass(): Promise<void> {
  if (!isMaestroAuthBypassEnabled()) {
    return;
  }
  await replaceSavedConnectionsWithMaestroFixture();
  await writeMaestroShellSnapshot();
  activateCloudRelayAccount(MAESTRO_ACCOUNT_ID, async () => MAESTRO_RELAY_TOKEN);
}
