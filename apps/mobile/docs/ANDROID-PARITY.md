# Android parity

T3 Code Mobile ships a full Android dev client alongside iOS. Android targets **tier-1+ parity**:
native terminal and composer, certified JS review, and Nitro markdown, while iOS-only modules
remain available on Apple platforms.

## Tier-1+ defaults

Resolved at build time in `src/platform/capabilities.ts`:

| Surface     | Android default                          | iOS default                  |
| ----------- | ---------------------------------------- | ---------------------------- |
| Review diff | JS list + highlighter (tier-1 certified) | Native `T3ReviewDiffSurface` |
| Markdown    | Nitro markdown                           | Native selectable markdown   |
| Terminal    | Native `T3TerminalView`                  | Native `T3TerminalView`      |
| Composer    | Native `T3ComposerEditor`                | Native `T3ComposerEditor`    |

Override locally via repository-root `.env` / `.env.local` (see [`.env.example`](../../../.env.example)):

```bash
EXPO_PUBLIC_FORCE_JS_REVIEW=1          # force JS review (CI/unit tests; unset for tier-1+ local defaults)
EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1     # force Nitro markdown
EXPO_PUBLIC_TERMINAL_WEBVIEW=1         # force WebView terminal (Android default when unset)
EXPO_PUBLIC_TERMINAL_WEBVIEW=0         # opt into native terminal on Android
EXPO_PUBLIC_COMPOSER_CHIP_MODE=strip   # force strip composer chips
EXPO_PUBLIC_NATIVE_COMPOSER=0          # opt out of native composer on Android
```

## Native modules

| Module               | Android         | Notes                                               |
| -------------------- | --------------- | --------------------------------------------------- |
| `t3-native-controls` | Yes             | Hardware keyboard shortcuts                         |
| `t3-terminal`        | Yes             | Native default on Android; WebView via env override |
| `t3-composer-editor` | Yes             | Inline chips + clipboard image paste on Android     |
| `t3-review-diff`     | No              | iOS only — Android uses tier-1 certified JS review  |
| `t3-markdown-text`   | No (selectable) | Nitro markdown covers Android rendering             |

Android-specific product features:

- Thread accessory bar (phone + tablet rail layouts)
- Ongoing agent notification + FCM push registration
- Predictive back + edge-to-edge insets (SDK 35+)
- Variant adaptive-icon background colors (dev / preview / production)

iOS-only features without Android equivalents:

- Live Activity + home-screen widget (`expo-widgets`)
- Liquid glass / native mail-search toolbar chrome

## Build and run

See [README.md](../README.md#android) for local prerequisites, `vp run android:dev`, and Maestro smoke.

Key build wiring:

- `scripts/with-android-env.mjs` — resolves `JAVA_HOME` / `ANDROID_HOME`, writes `local.properties`
- `plugins/withAndroidBuildFixes.cjs` — expo-dev-client Gradle ordering + SDK path
- `plugins/withAndroidCleartextTraffic.cjs` — HTTP for tailnet / local relay
- `plugins/withAndroidGoogleServices.cjs` — fails prebuild with a clear message when FCM config is missing

FCM setup: [FIREBASE-ANDROID.md](./FIREBASE-ANDROID.md).

## Verification

Per-PR gate (local):

```bash
scripts/android-parity/gate.sh          # full
scripts/android-parity/gate.sh --quick  # check + typecheck only
```

Maestro smoke (booted emulator):

```bash
./scripts/android-parity/run-maestro-android.sh
```

CI (`/.github/workflows/mobile-qa.yml`):

- `expo-doctor`
- Mobile unit tests with `EXPO_PUBLIC_FORCE_JS_REVIEW=1` and `EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1`
- Maestro Android smoke on API 34 emulator (**blocking**)

Review perf proxy gate: `src/features/review/reviewPerfGate.test.ts` (REV-007 thresholds). Tier-1+
certified JS review on Android at t11 (median list build well under 50 ms); native port (t12–t13)
skipped unless perf regresses.

## Post-program (fork completion)

After the s01–s26 stack lands on your fork, run the post-program loop to merge
follow-up PRs (new-thread entry points, LAN pairing, UX polish):

```bash
cp scripts/android-parity/loop-config.example.json scratch/android-parity/loop-config.json
# Edit fork → your GitHub fork (e.g. RioPlay/t3code)
scripts/android-parity/sync-loop-state.sh
scripts/android-parity/run-post-program.sh
```

`run-post-program.sh` runs `gate.sh --quick`, merges required PRs via `advance-pr.sh`,
and pulls `main`. Optional stretch PRs (native terminal default, composer scaffold) are
skipped unless you merge them manually.

## Remaining gaps (priority)

1. **Secondary chrome** — continue aligning Android header toolbars with iOS mail-search patterns
2. ~~**Variant launcher art**~~ — done (t16): distinct foregrounds per development/preview/production + solid adaptive plates
3. **Store readiness** — t18: production EAS AAB + Play internal draft submit documented (hg01/hg02 human); t19 cleartext hardening remains
