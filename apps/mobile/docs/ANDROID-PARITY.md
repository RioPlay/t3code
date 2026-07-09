# Android parity

T3 Code Mobile ships a full Android dev client alongside iOS. Android has reached
**tier-2 store-prep parity** on this fork: native terminal and composer, certified JS review,
Nitro markdown, variant launcher art, production cleartext off, and Play internal track prep.

## Tier tables

### Tier-1+ surface defaults

Resolved at build time in `src/platform/capabilities.ts`:

| Surface     | Android default                                       | iOS default                  |
| ----------- | ----------------------------------------------------- | ---------------------------- |
| Review diff | Native `T3ReviewDiffSurface` when linked; JS fallback | Native `T3ReviewDiffSurface` |
| Markdown    | Nitro markdown                                        | Native selectable markdown   |
| Terminal    | Native Ghostty/`T3TerminalView` (WebView override)    | Native `T3TerminalView`      |
| Composer    | Native `T3ComposerEditor`                             | Native `T3ComposerEditor`    |

### Tier-2 program status (t00–t20)

| Area                    | Status | Notes                                                |
| ----------------------- | ------ | ---------------------------------------------------- |
| Correctness / loop      | Done   | t00–t01                                              |
| JS review + REV-007     | Done   | t02–t04, t11 certify; t12–t13 superseded (js-tier1)  |
| Native terminal default | Done   | t05                                                  |
| Chrome passes           | Done   | t06, t15 mail-search toolbar; t15b optional skipped  |
| Composer strip + native | Done   | t07–t10                                              |
| Nitro markdown polish   | Done   | t14                                                  |
| Variant launcher icons  | Done   | t16                                                  |
| Agent notifications     | Done   | t17 ongoing channels + Maestro                       |
| Store / Play prep       | Done   | t18 AAB + internal draft; hg01/hg02 human            |
| Cleartext / nightly CI  | Done   | t19 production cleartext off; native-default nightly |
| Sign-off                | Done   | t20 this document                                    |

Override locally via repository-root `.env` / `.env.local` (see [`.env.example`](../../../.env.example)):

```bash
EXPO_PUBLIC_FORCE_JS_REVIEW=1          # force JS review (CI dogfood / unit tests)
EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1     # force Nitro markdown (pinned on production EAS)
EXPO_PUBLIC_TERMINAL_WEBVIEW=1         # force WebView terminal
EXPO_PUBLIC_TERMINAL_WEBVIEW=0         # force native terminal (also production EAS pin; default when unset is native)
EXPO_PUBLIC_COMPOSER_CHIP_MODE=strip   # force strip composer chips
EXPO_PUBLIC_NATIVE_COMPOSER=0          # opt out of native composer on Android
```

## Native modules

| Module               | Android         | Notes                                                                       |
| -------------------- | --------------- | --------------------------------------------------------------------------- |
| `t3-native-controls` | Yes             | Header button + hardware keyboard shortcuts                                 |
| `t3-terminal`        | Yes             | Ghostty `libghostty-vt` JNI (aligned with upstream #3579); WebView override |
| `t3-composer-editor` | Yes             | Inline chips + clipboard image paste on Android                             |
| `t3-review-diff`     | Yes             | Native canvas surface ported from upstream #3579; JS review still forceable |
| `t3-markdown-text`   | No (selectable) | Nitro markdown covers Android rendering                                     |

Android-specific product features:

- Thread accessory bar (phone + tablet rail layouts)
- Ongoing agent notification + FCM push registration (phase-matched channels)
- Predictive back + edge-to-edge insets (SDK 35+)
- Variant adaptive-icon foregrounds + solid plate colors (dev / preview / production)
- Material mail-search toolbar chrome on key list headers

iOS-only features without Android equivalents:

- Live Activity + home-screen widget (`expo-widgets`)
- Liquid glass chrome (Android uses Material fills)

## Build and run

See [README.md](../README.md#android) for local prerequisites, `vp run android:dev`, and Maestro smoke.

Key build wiring:

- `scripts/with-android-env.mjs` — resolves `JAVA_HOME` / `ANDROID_HOME`, writes `local.properties`
- `plugins/withAndroidBuildFixes.cjs` — expo-dev-client Gradle ordering + SDK path
- `plugins/withAndroidCleartextTraffic.cjs` — cleartext HTTP for **development/preview** only (production = off)
- `plugins/withAndroidGoogleServices.cjs` — fails prebuild with a clear message when FCM config is missing
- `eas.json` production — AAB, remote credentials, Play **internal** draft submit, tier-1+ env pins

FCM + Play human gates: [FIREBASE-ANDROID.md](./FIREBASE-ANDROID.md).

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
- Mobile unit tests with `EXPO_PUBLIC_FORCE_JS_REVIEW=1` and `EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1` (iOS dogfood)
- Nightly / `workflow_dispatch`: native-default unit suite (`EXPO_PUBLIC_TERMINAL_WEBVIEW=0`, nitro markdown)
- Maestro Android smoke on API 34 emulator (**blocking**) with tier-1+ native defaults
- REV-007 review perf gate job

Review perf proxy gate: `src/features/review/reviewPerfGate.test.ts` (REV-007 thresholds). Tier-1+
certified JS review on Android at t11 (median list build well under 50 ms); native port (t12–t13)
skipped unless perf regresses.

Production EAS: `.github/workflows/mobile-eas-production.yml` (`workflow_dispatch`).

## Loop runners

```bash
cp scripts/android-parity/loop-config.example.json scratch/android-parity/loop-config.json
# Edit fork → your GitHub fork (e.g. RioPlay/t3code)
scripts/android-parity/sync-loop-state.sh
scripts/android-parity/run-tier1-plus.sh   # phase tier1_plus (t00–t20)
```

## Remaining gaps (post tier-2)

1. **Human store publish** — hg01/hg02: production `google-services` on EAS + Play internal rollout
2. **Secondary chrome polish** — ongoing design-review of edge screens vs iOS reference
3. **Optional M4** — FGS, widgets, full Ghostty GPU surface (out of scope per DEC-003/DEC-005)

Native review pull-to-refresh (`refreshing` + `onPullToRefresh`) is implemented on Android
to match the iOS / JS contract. Prebuilt `libghostty-vt.so` ABIs ship under
`modules/t3-terminal/android/src/main/jniLibs/`; rebuild with
`modules/t3-terminal/scripts/build-libghostty-android.sh` when upgrading Ghostty.
