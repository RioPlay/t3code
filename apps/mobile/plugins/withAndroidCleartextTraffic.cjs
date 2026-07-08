const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Cleartext HTTP is required for local/tailnet relay discovery in development and
 * preview builds. Production store builds must not allow cleartext by default.
 *
 * @param {string | undefined} appVariant
 * @returns {boolean}
 */
function shouldAllowCleartextTraffic(appVariant) {
  return appVariant === "development" || appVariant === "preview";
}

module.exports = function withAndroidCleartextTraffic(config) {
  const appVariant =
    typeof config.extra?.appVariant === "string" ? config.extra.appVariant : "production";
  const allowCleartext = shouldAllowCleartextTraffic(appVariant);

  return withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];

    if (application == null) {
      throw new Error(
        "AndroidManifest.xml is missing the application element required for cleartext traffic configuration.",
      );
    }

    application.$ ??= {};
    application.$["android:usesCleartextTraffic"] = allowCleartext ? "true" : "false";

    return nextConfig;
  });
};

module.exports.shouldAllowCleartextTraffic = shouldAllowCleartextTraffic;
