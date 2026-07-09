const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

/**
 * Embeds DM Sans TTF + font-family XML so native Alert/PopupMenu styles can
 * reference @font/xml_dm_sans_regular and @font/dm_sans_500medium.
 * Runtime JS still loads fonts via expo-font / @expo-google-fonts/dm-sans.
 */

const FONT_FAMILY_XML = `<?xml version="1.0" encoding="utf-8"?>
<font-family xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto">
    <font
        android:fontStyle="normal"
        android:fontWeight="400"
        android:font="@font/dm_sans_400regular"
        app:fontStyle="normal"
        app:fontWeight="400"
        app:font="@font/dm_sans_400regular" />
</font-family>
`;

function resolveDmSansPackageRoot(projectRoot) {
  try {
    return path.dirname(
      require.resolve("@expo-google-fonts/dm-sans/package.json", { paths: [projectRoot] }),
    );
  } catch {
    return null;
  }
}

function withAndroidDmSansFonts(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const dmSansRoot = resolveDmSansPackageRoot(projectRoot);
      if (dmSansRoot == null) {
        throw new Error(
          "withAndroidDmSansFonts: @expo-google-fonts/dm-sans is not installed (required for native dialog fonts).",
        );
      }

      const fontDir = path.join(modConfig.modRequest.platformProjectRoot, "app/src/main/res/font");
      fs.mkdirSync(fontDir, { recursive: true });

      const copies = [
        {
          from: path.join(dmSansRoot, "400Regular/DMSans_400Regular.ttf"),
          to: path.join(fontDir, "dm_sans_400regular.ttf"),
        },
        {
          from: path.join(dmSansRoot, "500Medium/DMSans_500Medium.ttf"),
          to: path.join(fontDir, "dm_sans_500medium.ttf"),
        },
      ];

      for (const { from, to } of copies) {
        if (!fs.existsSync(from)) {
          throw new Error(`withAndroidDmSansFonts: missing font file ${from}`);
        }
        fs.copyFileSync(from, to);
      }

      fs.writeFileSync(path.join(fontDir, "xml_dm_sans_regular.xml"), FONT_FAMILY_XML);
      return modConfig;
    },
  ]);
}

module.exports = withAndroidDmSansFonts;
