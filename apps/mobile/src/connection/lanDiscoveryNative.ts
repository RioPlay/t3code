import { requireNativeModule, type EventSubscription } from "expo-modules-core";

const T3_CODE_LAN_SERVICE_TYPE = "_t3code._tcp";

type NativeLanDiscoveryEvent =
  | {
      readonly type: "resolved";
      readonly serviceName: string;
      readonly host: string;
      readonly port: number;
    }
  | {
      readonly type: "lost";
      readonly serviceName: string;
    }
  | {
      readonly type: "error";
      readonly message: string;
    };

export type LanDiscoveryEvent = NativeLanDiscoveryEvent;

const T3LanDiscovery = requireNativeModule<{
  start(serviceType: string): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: "onLanDiscoveryEvent",
    listener: (event: NativeLanDiscoveryEvent) => void,
  ): EventSubscription;
}>("T3LanDiscovery");

export function startLanDiscovery(serviceType: string = T3_CODE_LAN_SERVICE_TYPE): Promise<void> {
  return T3LanDiscovery.start(serviceType);
}

export function stopLanDiscovery(): Promise<void> {
  return T3LanDiscovery.stop();
}

export function addLanDiscoveryListener(
  listener: (event: LanDiscoveryEvent) => void,
): EventSubscription {
  return T3LanDiscovery.addListener("onLanDiscoveryEvent", listener);
}
