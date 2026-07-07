import { createLanEnvironmentDiscoveryAtoms } from "@t3tools/client-runtime/state/lanDiscovery";

import { connectionAtomRuntime } from "../connection/runtime";

export const lanEnvironmentDiscovery = createLanEnvironmentDiscoveryAtoms(connectionAtomRuntime);
