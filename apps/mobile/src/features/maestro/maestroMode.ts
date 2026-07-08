import Constants from "expo-constants";

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
