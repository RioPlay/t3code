const fs = require("node:fs");
const path = require("node:path");

const { withDangerousMod, withMainApplication } = require("expo/config-plugins");

const SOURCE_DIR = path.join(__dirname, "android-multi-network-routing");
const SOURCE_FILES = ["MultiNetworkRouting.kt", "MultiNetworkSocketFactory.kt"];

const INSTALL_IMPORT = "import com.t3tools.t3code.network.MultiNetworkRouting";
const INSTALL_CALL = "MultiNetworkRouting.install(this)";
const INSTALL_MARKER = "MultiNetworkRouting.install";

/**
 * Resolve the on-disk Java/Kotlin package path for the app id.
 * Variant packages (dev/preview) still share the network helper package name
 * under com.t3tools.t3code.network so imports stay stable across variants.
 */
function networkPackageDir(androidProjectRoot) {
  return path.join(
    androidProjectRoot,
    "app",
    "src",
    "main",
    "java",
    "com",
    "t3tools",
    "t3code",
    "network",
  );
}

function copyNetworkRoutingSources(androidProjectRoot) {
  const targetDir = networkPackageDir(androidProjectRoot);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const fileName of SOURCE_FILES) {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const targetPath = path.join(targetDir, fileName);
    const contents = fs.readFileSync(sourcePath, "utf8");
    if (!fs.existsSync(targetPath) || fs.readFileSync(targetPath, "utf8") !== contents) {
      fs.writeFileSync(targetPath, contents);
    }
  }
}

/**
 * Ensure MainApplication installs multi-network OkHttp routing before RN loads.
 * @param {string} contents
 * @returns {string}
 */
function ensureMainApplicationInstall(contents) {
  if (contents.includes(INSTALL_MARKER)) {
    return contents;
  }

  let next = contents;
  if (!next.includes(INSTALL_IMPORT)) {
    // Insert import after the package declaration block's first import group.
    if (next.includes("import expo.modules.ApplicationLifecycleDispatcher")) {
      next = next.replace(
        "import expo.modules.ApplicationLifecycleDispatcher",
        `${INSTALL_IMPORT}\nimport expo.modules.ApplicationLifecycleDispatcher`,
      );
    } else {
      next = next.replace(/(package [^\n]+\n)/, `$1\n${INSTALL_IMPORT}\n`);
    }
  }

  if (next.includes("loadReactNative(this)")) {
    next = next.replace("loadReactNative(this)", `${INSTALL_CALL}\n    loadReactNative(this)`);
  } else if (next.includes("super.onCreate()")) {
    next = next.replace("super.onCreate()", `super.onCreate()\n    ${INSTALL_CALL}`);
  } else {
    throw new Error(
      "withAndroidMultiNetworkRouting: could not find a MainApplication insertion point for MultiNetworkRouting.install",
    );
  }

  return next;
}

module.exports = function withAndroidMultiNetworkRouting(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      copyNetworkRoutingSources(modConfig.modRequest.platformProjectRoot);
      return modConfig;
    },
  ]);

  config = withMainApplication(config, (modConfig) => {
    modConfig.modResults.contents = ensureMainApplicationInstall(modConfig.modResults.contents);
    return modConfig;
  });

  return config;
};

module.exports.ensureMainApplicationInstall = ensureMainApplicationInstall;
module.exports.copyNetworkRoutingSources = copyNetworkRoutingSources;
module.exports.SOURCE_FILES = SOURCE_FILES;
