import { useAtomValue } from "@effect/atom-react";
import { resolveLanDiscoveryHostInput } from "@t3tools/shared/lanDiscovery";
import { useCallback, useEffect, useMemo } from "react";

import { lanEnvironmentDiscovery } from "../../state/lanDiscovery";
import { useAtomCommand } from "../../state/use-atom-command";
import { formatLanEnvironmentDetailLine } from "./lanEnvironmentPresentation";

export interface DiscoveredLanEnvironmentView {
  readonly key: string;
  readonly serviceName: string;
  readonly httpBaseUrl: string;
  readonly label: string;
  readonly hostInput: string;
  readonly detailLine: string | null;
  readonly status: "resolving" | "available" | "unavailable";
  readonly error: string | null;
}

export function useLanDiscoveryController(enabled: boolean) {
  const discovery = useAtomValue(lanEnvironmentDiscovery.stateValueAtom);
  const startDiscovery = useAtomCommand(lanEnvironmentDiscovery.start, {
    reportFailure: false,
  });
  const stopDiscovery = useAtomCommand(lanEnvironmentDiscovery.stop, {
    reportFailure: false,
  });

  useEffect(() => {
    if (!enabled) {
      void stopDiscovery();
      return;
    }
    void startDiscovery();
    return () => {
      void stopDiscovery();
    };
  }, [enabled, startDiscovery, stopDiscovery]);

  const environments = useMemo<ReadonlyArray<DiscoveredLanEnvironmentView>>(() => {
    return [...discovery.environments.values()]
      .filter((environment) => environment.status !== "lost")
      .map((environment) => {
        const status: DiscoveredLanEnvironmentView["status"] =
          environment.status === "available"
            ? "available"
            : environment.status === "unavailable"
              ? "unavailable"
              : "resolving";
        return {
          key: environment.key,
          serviceName: environment.serviceName,
          httpBaseUrl: environment.httpBaseUrl,
          label: environment.descriptor?.label ?? environment.serviceName,
          hostInput: resolveLanDiscoveryHostInput(environment.httpBaseUrl),
          detailLine: formatLanEnvironmentDetailLine({
            status,
            descriptor: environment.descriptor,
            error: environment.error,
          }),
          status,
          error: environment.error,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [discovery.environments]);

  const refresh = useCallback(() => {
    void (async () => {
      await stopDiscovery();
      await startDiscovery();
    })();
  }, [startDiscovery, stopDiscovery]);

  return {
    environments,
    isScanning: discovery.scanning,
    isOffline: discovery.offline,
    refresh,
  };
}
