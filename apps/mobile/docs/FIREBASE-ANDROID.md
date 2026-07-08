# Firebase / FCM — Android dev client

FCM push tokens require a **custom dev client** — not Expo Go.

## Package names by variant

| `APP_VARIANT` | Android package              |
| ------------- | ---------------------------- |
| `development` | `com.t3tools.t3code.dev`     |
| `preview`     | `com.t3tools.t3code.preview` |
| `production`  | `com.t3tools.t3code`         |

`app.config.ts` wires `android.googleServicesFile` per variant:

- Local default: `apps/mobile/secrets/google-services.<variant>.json`
- EAS / CI override: `GOOGLE_SERVICES_JSON` file secret (path injected at build time)

The `withAndroidGoogleServices` config plugin fails prebuild with a clear error when the file is missing.

## Human setup (before GATE-M0 / step s09)

1. Firebase Console → project for T3 Code mobile
2. Register the Android app for the variant package you are building (see table above)
3. Download `google-services.json`
4. Local dev client:

```bash
mkdir -p apps/mobile/secrets
cp ~/Downloads/google-services.json apps/mobile/secrets/google-services.development.json
cd apps/mobile
vp run android:dev
```

5. EAS dev / preview builds:

```bash
cd apps/mobile
eas secret:create --name GOOGLE_SERVICES_JSON --type file --value ./secrets/google-services.development.json
eas build --profile development -p android
```

Use a `google-services.json` whose `package_name` matches the profile's `APP_VARIANT` package. For preview builds, upload the preview Firebase app JSON to the same secret before `eas build --profile preview:dev`.

6. Install the APK on a physical device for push testing.

## Agent wiring (step s08)

- `app.config.ts` — `android.googleServicesFile` + `withAndroidGoogleServices` plugin
- `eas.json` — `development` and `preview:dev` profiles are the Android FCM rebuild targets
- Never commit `google-services.json` or `secrets/google-services.*.json`

## Verify

```bash
cd apps/mobile
vp test src/features/agent-awareness/remoteRegistration.test.ts
vp test src/features/agent-awareness/notificationPermissions.test.ts
```

After sign-in on device, registration should emit `token.type === "android"`.

## Production / Play internal track (tier1+ t18)

Human gates **hg01** / **hg02** (non-blocking for the agent loop — document and continue):

### hg01 — Firebase + EAS secrets (before first production Android build)

1. Firebase Console → register Android app `com.t3tools.t3code` if not already present.
2. Download production `google-services.json`.
3. Local (never commit):

```bash
mkdir -p apps/mobile/secrets
cp ~/Downloads/google-services.json apps/mobile/secrets/google-services.production.json
```

4. Upload to EAS **production** environment (file secret). Prefer environment-scoped env over the legacy project-wide secret when both exist:

```bash
cd apps/mobile
# File secret used by app.config.ts / withAndroidGoogleServices
eas env:create --name GOOGLE_SERVICES_JSON --type file \
  --value ./secrets/google-services.production.json \
  --environment production --visibility secret --non-interactive
```

5. Confirm Play Console has an app with package `com.t3tools.t3code` (create if missing).
6. EAS Android credentials: remote-managed keystore (default for `credentialsSource: "remote"` in `eas.json` production).

```bash
eas credentials -p android
# Profile: production — ensure a keystore exists or let EAS create one.
```

7. Google Play service account for submit (JSON key with Play Developer API access linked to the app):

```bash
eas credentials -p android
# Set Google Service Account key for submit / auto-submit.
```

### hg02 — Internal testing publish

1. CI workflow **Mobile EAS Production** (`workflow_dispatch`):
   - `mode=build`
   - `platform=android` (or `all`)
2. Profile `production` builds an **AAB**, pins tier-1+ env (`EXPO_PUBLIC_TERMINAL_WEBVIEW=0`, `EXPO_PUBLIC_FORCE_NITRO_MARKDOWN=1`), and `--auto-submit`s to Play **internal** track as **draft**.
3. In Play Console → Testing → Internal testing, review the draft release and roll out when ready.
4. Install from the internal testing link on a physical device; confirm FCM registration (`token.type === "android"`) and launcher art (production plate + black T3).

### Local / CI smoke without uploading to Play

```bash
cd apps/mobile
# Inspect resolved config
APP_VARIANT=production expo config --type public | rg 'package|googleServices|adaptiveIcon|icon'

# Kick an EAS build only (no submit)
eas build --profile production -p android --non-interactive --no-wait
```

Package scripts: `vp run eas:android:prod` from `apps/mobile`.
