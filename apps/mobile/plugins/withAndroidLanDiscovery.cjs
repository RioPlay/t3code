const { withAndroidManifest } = require("expo/config-plugins");

const MULTICAST_PERMISSION = "android.permission.CHANGE_WIFI_MULTICAST_STATE";
const WIFI_STATE_PERMISSION = "android.permission.ACCESS_WIFI_STATE";

function ensurePermission(manifest, permission) {
  const root = manifest.manifest;
  root["uses-permission"] ??= [];
  const permissions = root["uses-permission"];
  const exists = permissions.some((entry) => entry.$?.["android:name"] === permission);
  if (!exists) {
    permissions.push({ $: { "android:name": permission } });
  }
}

module.exports = function withAndroidLanDiscovery(config) {
  return withAndroidManifest(config, (nextConfig) => {
    ensurePermission(nextConfig.modResults, WIFI_STATE_PERMISSION);
    ensurePermission(nextConfig.modResults, MULTICAST_PERMISSION);
    return nextConfig;
  });
};
