import type { RelayDeviceRegistrationRequest } from "@t3tools/contracts/relay";

import type { Preferences } from "../../persistence/mobile-preferences";

// Development builds are Xcode-signed and receive sandbox APNs tokens;
// preview and production builds are distribution-signed and use production
// APNs. The relay routes each device's pushes accordingly.
export function resolveApsEnvironment(appVariant: unknown): "sandbox" | "production" {
  return appVariant === "development" ? "sandbox" : "production";
}

function relayPreferences(input: {
  readonly notificationsEnabled: boolean;
  readonly preferences: Preferences;
  readonly platform: "ios" | "android";
}) {
  const liveActivitiesEnabled =
    input.platform === "ios" ? input.preferences.liveActivitiesEnabled !== false : false;
  return {
    liveActivitiesEnabled,
    notificationsEnabled: input.notificationsEnabled,
    notifyOnApproval: true,
    notifyOnInput: true,
    notifyOnCompletion: true,
    notifyOnFailure: true,
  };
}

export function makeRelayDeviceRegistrationRequest(input: {
  readonly deviceId: string;
  readonly label: string;
  readonly platform: "ios";
  readonly iosMajorVersion: number;
  readonly appVersion?: string;
  readonly bundleId?: string;
  readonly apsEnvironment?: "sandbox" | "production";
  readonly pushToken?: string;
  readonly pushToStartToken?: string;
  readonly notificationsEnabled: boolean;
  readonly preferences: Preferences;
}): RelayDeviceRegistrationRequest;

export function makeRelayDeviceRegistrationRequest(input: {
  readonly deviceId: string;
  readonly label: string;
  readonly platform: "android";
  readonly androidSdkVersion: number;
  readonly appVersion?: string;
  readonly pushToken?: string;
  readonly notificationsEnabled: boolean;
  readonly preferences: Preferences;
}): RelayDeviceRegistrationRequest;

export function makeRelayDeviceRegistrationRequest(input: {
  readonly deviceId: string;
  readonly label: string;
  readonly platform: "ios" | "android";
  readonly iosMajorVersion?: number;
  readonly androidSdkVersion?: number;
  readonly appVersion?: string;
  readonly pushToken?: string;
  readonly pushToStartToken?: string;
  readonly notificationsEnabled: boolean;
  readonly preferences: Preferences;
}): RelayDeviceRegistrationRequest {
  const preferences = relayPreferences({
    notificationsEnabled: input.notificationsEnabled,
    preferences: input.preferences,
    platform: input.platform,
  });
  const shared = {
    deviceId: input.deviceId,
    label: input.label,
    appVersion: input.appVersion,
    ...(input.bundleId ? { bundleId: input.bundleId } : {}),
    ...(input.apsEnvironment ? { apsEnvironment: input.apsEnvironment } : {}),
    ...(input.pushToken ? { pushToken: input.pushToken } : {}),
    preferences,
  };

  if (input.platform === "android") {
    return {
      ...shared,
      platform: "android",
      androidSdkVersion: input.androidSdkVersion ?? 26,
    };
  }

  return {
    ...shared,
    platform: "ios",
    iosMajorVersion: input.iosMajorVersion ?? 18,
    ...(input.pushToStartToken ? { pushToStartToken: input.pushToStartToken } : {}),
  };
}
