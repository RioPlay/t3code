#!/usr/bin/env node
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

const mobileRoot = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const repoRoot = NodePath.resolve(mobileRoot, "../..");
const apkPath = NodePath.join(mobileRoot, "android/app/build/outputs/apk/release/app-release.apk");
const expectedPackage = "com.t3tools.t3code";
const expectedActivity = "com.t3tools.t3code.MainActivity";

function run(command, args, options = {}) {
  const result = NodeChildProcess.spawnSync(command, args, {
    cwd: options.cwd ?? mobileRoot,
    env: {
      ...process.env,
      APP_VARIANT: "production",
      EXPO_NO_GIT_STATUS: "1",
      ...options.env,
    },
    encoding: "utf8",
    stdio: options.capture === true ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture === true) {
      process.stderr.write(result.stderr ?? "");
      process.stderr.write(result.stdout ?? "");
    }
    process.exit(result.status ?? 1);
  }

  return result.stdout ?? "";
}

function firstExisting(paths) {
  return paths.find((candidate) => candidate != null && NodeFS.existsSync(candidate)) ?? null;
}

function resolveAndroidHome() {
  const configured =
    process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_SDK_HOME;
  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.trim();
  }

  return firstExisting([
    NodePath.join(NodeOS.homedir(), "Android/Sdk"),
    "/opt/android-sdk",
    "/usr/lib/android-sdk",
  ]);
}

function resolveTool(name) {
  const fromPath = NodeChildProcess.spawnSync("command", ["-v", name], {
    encoding: "utf8",
    shell: true,
  }).stdout?.trim();
  if (fromPath) {
    return fromPath;
  }

  const androidHome = resolveAndroidHome();
  if (androidHome == null) {
    return null;
  }

  const buildTools = NodePath.join(androidHome, "build-tools");
  if (!NodeFS.existsSync(buildTools)) {
    return null;
  }

  const versions = NodeFS.readdirSync(buildTools).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  for (const version of versions.toReversed()) {
    const candidate = NodePath.join(buildTools, version, name);
    if (NodeFS.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    console.error(`Refusing to install production APK: ${label} did not include ${expected}.`);
    process.exit(1);
  }
}

const aapt = resolveTool("aapt");
if (aapt == null) {
  console.error("Refusing to install production APK: Android aapt was not found.");
  process.exit(1);
}

console.log("Preparing production Android project...");
run(process.execPath, [
  "scripts/with-android-env.mjs",
  "bunx",
  "expo",
  "prebuild",
  "--clean",
  "--platform",
  "android",
]);

console.log("Building production release APK...");
run(process.execPath, [
  "scripts/with-android-env.mjs",
  "./android/gradlew",
  "-p",
  "android",
  "assembleRelease",
]);

if (!NodeFS.existsSync(apkPath)) {
  console.error(
    `Refusing to install production APK: missing ${NodePath.relative(repoRoot, apkPath)}.`,
  );
  process.exit(1);
}

console.log("Validating production APK...");
const badging = run(aapt, ["dump", "badging", apkPath], { capture: true });
assertIncludes(badging, `package: name='${expectedPackage}'`, "package name");
assertIncludes(badging, `launchable-activity: name='${expectedActivity}'`, "launchable activity");

const manifest = run(aapt, ["dump", "xmltree", apkPath, "AndroidManifest.xml"], { capture: true });
if (manifest.includes("expo.modules.devlauncher.launcher.DevLauncherActivity")) {
  console.error("Refusing to install production APK: Expo DevLauncherActivity is present.");
  process.exit(1);
}

console.log("Installing production APK...");
run("adb", ["install", "-r", apkPath]);

console.log("Launching production app...");
run("adb", ["shell", "am", "start", "-n", `${expectedPackage}/.MainActivity`]);

const packageInfo = run("adb", ["shell", "dumpsys", "package", expectedPackage], { capture: true });
const updateLine = packageInfo
  .split("\n")
  .map((line) => line.trim())
  .find((line) => line.startsWith("lastUpdateTime="));
console.log(`Installed ${expectedPackage}${updateLine ? ` (${updateLine})` : ""}.`);
