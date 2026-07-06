import type { RelayDeviceRegistrationRequest } from "@t3tools/contracts/relay";

import type { Preferences } from "../../lib/storage";

// The APNs environment follows code signing, not the app variant: any
// Xcode-signed debug install (regardless of APP_VARIANT) receives sandbox
// device tokens, while distribution-signed builds use production APNs. The
// embedded provisioning profile's aps-environment entitlement is the
// authoritative signal; the variant is only a fallback for builds where the
// entitlement cannot be read (for example App Store installs, which strip the
// embedded profile and always use production APNs).
export function resolveApsEnvironment(input: {
  readonly appVariant: unknown;
  readonly pushEnvironment: "development" | "production" | null;
}): "sandbox" | "production" {
  if (input.pushEnvironment === "development") {
    return "sandbox";
  }
  if (input.pushEnvironment === "production") {
    return "production";
  }
  return input.appVariant === "development" ? "sandbox" : "production";
}

export function makeRelayDeviceRegistrationRequest(input: {
  readonly deviceId: string;
  readonly label: string;
  readonly iosMajorVersion: number;
  readonly appVersion?: string;
  readonly bundleId?: string;
  readonly apsEnvironment?: "sandbox" | "production";
  readonly pushToken?: string;
  readonly pushToStartToken?: string;
  readonly notificationsEnabled: boolean;
  readonly preferences: Preferences;
}): RelayDeviceRegistrationRequest {
  const liveActivitiesEnabled = input.preferences.liveActivitiesEnabled !== false;
  return {
    deviceId: input.deviceId,
    label: input.label,
    platform: "ios",
    iosMajorVersion: input.iosMajorVersion,
    appVersion: input.appVersion,
    ...(input.bundleId ? { bundleId: input.bundleId } : {}),
    ...(input.apsEnvironment ? { apsEnvironment: input.apsEnvironment } : {}),
    ...(input.pushToken ? { pushToken: input.pushToken } : {}),
    ...(input.pushToStartToken ? { pushToStartToken: input.pushToStartToken } : {}),
    preferences: {
      liveActivitiesEnabled,
      notificationsEnabled: input.notificationsEnabled,
      notifyOnApproval: true,
      notifyOnInput: true,
      notifyOnCompletion: true,
      notifyOnFailure: true,
    },
  };
}
