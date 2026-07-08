#!/usr/bin/env node
/**
 * Build a chat-ready validation report from Maestro screenshot tour output.
 *
 * Usage:
 *   node scripts/android-parity/build-screenshot-report.mjs <output-dir>
 */

import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

const outputDir = NodePath.resolve(process.argv[2] ?? "");
if (!outputDir) {
  console.error("Usage: build-screenshot-report.mjs <output-dir>");
  process.exit(1);
}

const manifestPath = NodePath.resolve("apps/mobile/.maestro/screenshot-tour/manifest.json");
const manifest = JSON.parse(NodeFS.readFileSync(manifestPath, "utf8"));

function collectPngFiles(dir) {
  const entries = [];
  for (const name of NodeFS.readdirSync(dir)) {
    const path = NodePath.join(dir, name);
    const stat = NodeFS.statSync(path);
    if (stat.isDirectory()) {
      entries.push(...collectPngFiles(path));
      continue;
    }
    if (name.endsWith(".png")) {
      entries.push(path);
    }
  }
  return entries;
}

const pngFiles = collectPngFiles(outputDir).sort();

function findShotFile(shotId, themePrefix) {
  const candidates = [
    `${themePrefix}${shotId}.png`,
    `${shotId}.png`,
    `${themePrefix}${shotId}`,
    shotId,
  ];
  for (const file of pngFiles) {
    const base =
      file
        .split("/")
        .pop()
        ?.replace(/\.png$/u, "") ?? "";
    if (candidates.some((candidate) => base === candidate || base.endsWith(`-${candidate}`))) {
      return file;
    }
    if (base.includes(shotId)) {
      return file;
    }
  }
  return null;
}

const metaPath = NodePath.join(outputDir, "run-meta.json");
let runMeta = {};
try {
  runMeta = JSON.parse(NodeFS.readFileSync(metaPath, "utf8"));
} catch {
  runMeta = {};
}

const theme = runMeta.theme ?? "light";
const themePrefixes = theme === "both" ? ["", "dark-"] : theme === "light" ? [""] : [`${theme}-`];

const shots = manifest.shots.flatMap((shot) =>
  themePrefixes.map((themePrefix) => {
    const themeLabel = themePrefix.length === 0 ? "light" : themePrefix.replace(/-$/u, "");
    const file = findShotFile(shot.id, themePrefix);
    return {
      id: shot.id,
      theme: themeLabel,
      screen: shot.screen,
      layout: shot.layout ?? "phone",
      file: file ? file.replace(`${outputDir}/`, "") : null,
      cropTestId: shot.cropTestId,
      expect: shot.expect,
      status: file ? "captured" : "missing",
    };
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  app: manifest.app,
  package: manifest.package,
  theme,
  outputDir,
  captured: shots.filter((shot) => shot.status === "captured").length,
  missing: shots.filter((shot) => shot.status === "missing").length,
  shots,
};

NodeFS.writeFileSync(
  NodePath.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const promptLines = [
  "T3 Code Android screenshot validation request",
  "",
  `App: ${manifest.app}`,
  `Theme: ${theme}`,
  `Captured: ${report.captured}/${shots.length}`,
  "",
  "Please validate each screenshot against the expectations below.",
  "Flag: layout bugs, clipped text, wrong colors, missing controls, bad touch targets,",
  "inconsistent spacing, broken empty states, and anything that does not match the screen name.",
  "",
  ...shots.flatMap((shot) => [
    `## ${shot.id} (${shot.theme}) — ${shot.screen}`,
    shot.file ? `File: ${shot.file}` : "File: MISSING",
    "Expect:",
    ...shot.expect.map((line) => `- ${line}`),
    "",
  ]),
  "Upload the PNG files from this folder together with this prompt.",
];

NodeFS.writeFileSync(
  NodePath.join(outputDir, "validation-prompt.txt"),
  `${promptLines.join("\n")}\n`,
);

console.log(`Wrote ${NodePath.join(outputDir, "report.json")}`);
console.log(`Wrote ${NodePath.join(outputDir, "validation-prompt.txt")}`);
console.log(`Captured ${report.captured}/${shots.length} screenshots`);
if (report.missing > 0) {
  console.error(`Missing ${report.missing} expected screenshots — check Maestro flow logs.`);
  process.exit(1);
}
