# Android Parity — Implementation Steps (complete program)

Execute **one step per agent session** unless `loop-config.json` has `auto_continue: true`.

Validate: `python3 scripts/validate-plan.py scratch/android-parity/implementation.md`

**Completion:** step `s28` (T3 sign-off). Mirror composer and Ghostty NDK are explicitly out of scope (DEC-003, DEC-005).

---

## PR Plan

### PR 1: s01 — Loop infra, CI stubs, env template

- **step:** s01
- **kind:** infra
- **Files/components affected:** scratch/android-parity/AGENT-LOOP.md, implementation.md, STAGING-RUNBOOK.md, loop-\*.json, scripts/validate-plan.py, scripts/android-parity/gate.sh, .gitignore, .github/workflows/mobile-qa.yml, .github/workflows/deploy-relay-staging.yml, .env.example
- **Dependencies:** none
- **Description:** Agent loop plumbing, gitignore, mobile-qa workflow stub (expo-doctor + FORCE\_\* regression), relay staging workflow_dispatch stub, Android parity env vars in `.env.example`.

### PR 2: s02 — REL-001 REL-002 REL-003 contracts + consumer blast radius

- **step:** s02
- **kind:** implement
- **Files/components affected:** packages/contracts/src/relay.ts, packages/contracts/src/relay.test.ts, packages/client-runtime/src/relay/, apps/web/src/components/clerk/MobileClientsUserProfilePage.logic.ts, apps/web/src/components/clerk/MobileClientsUserProfilePage.logic.test.ts
- **Dependencies:** PR 1
- **Description:** Platform union `ios` | `android`. Discriminated registration schemas. Update client-runtime and web device list tests/labels for Android rows.

### PR 3: s03 — REL-005 relay DB migration Android platform

- **step:** s03
- **kind:** implement
- **Files/components affected:** infra/relay/migrations/postgres/, infra/relay/src/persistence/schema.ts, infra/relay/src/persistence/Devices.ts
- **Dependencies:** PR 2
- **Description:** Drizzle migration: `platform` android, `android_sdk_version` column, nullable `ios_major_version` for Android.

### PR 4: s04 — REL-011 REL-020 FcmDeliveries and publisher routing

- **step:** s04
- **kind:** implement
- **Files/components affected:** infra/relay/src/agentActivity/FcmDeliveries.ts, infra/relay/src/agentActivity/MobileDeliveries.ts, infra/relay/.env.example
- **Dependencies:** PR 3
- **Description:** FCM delivery path, shared sanitizer with APNs. `RELAY_FCM_DELIVERY_ENABLED` default false. SEC-020, SEC-030.

### PR 5: s05 — AGT-001 REL-010 mobile registration split + androidSdkVersion

- **step:** s05
- **kind:** implement
- **Files/components affected:** apps/mobile/src/features/agent-awareness/remoteRegistration.ts, registrationPayload.ts, remoteRegistration.test.ts, registrationPayload.test.ts
- **Dependencies:** PR 2
- **Description:** `canRegisterRemotePush()` iOS+Android. `platform` from `Platform.OS`. `androidSdkVersion` from device APIs. Live Activity stays iOS-only. SEC-010.

### PR 6: s06 — AGT-001 notificationPermissions Android path

- **step:** s06
- **kind:** implement
- **Files/components affected:** apps/mobile/src/features/agent-awareness/notificationPermissions.ts, notificationPermissions.test.ts
- **Dependencies:** PR 5
- **Description:** Android `POST_NOTIFICATIONS` request path — not `unsupported`. iOS path unchanged.

### PR 7: s07 — QA-011 relay Android integration tests

- **step:** s07
- **kind:** implement
- **Files/components affected:** infra/relay/src/persistence/Devices.test.ts, infra/relay/src/agentActivity/FcmDeliveries.test.ts, agentActivityPayloads tests
- **Dependencies:** PR 4, PR 6
- **Description:** Android register round-trip, FCM payload sanitizer, duplicate pushToken claim. Unit/integration only — no staging.

### PR 8: s08 — Firebase Android build wiring (docs + config plugin)

- **step:** s08
- **kind:** implement
- **Files/components affected:** apps/mobile/app.config.ts, apps/mobile/docs/FIREBASE-ANDROID.md, eas.json or EAS docs reference
- **Dependencies:** PR 5
- **Description:** Expo Firebase/google-services plugin wiring for dev/preview variants. Document EAS secret `GOOGLE_SERVICES_JSON` and dev client rebuild. No secrets committed.

### PR 9: s09 — GATE-M0-CI automated verification

- **step:** s09
- **kind:** implement
- **Files/components affected:** scripts/android-parity/verify-m0-ci.sh, scratch/android-parity/smoke-matrix.adoc, loop-state.json
- **Dependencies:** PR 7, PR 8
- **Description:** Run `verify-m0-ci.sh`. On pass set `gates.m0_staging=pass_ci` — unblocks s10 in `completion_mode: automated`. Mark smoke-matrix M0 unit/integration rows PASS.

### PR 9b: s09b — GATE-M0 device E2E (optional)

- **step:** s09b
- **kind:** gate
- **Files/components affected:** scratch/android-parity/signoff-GATE-M0.adoc, STAGING-RUNBOOK.md
- **Dependencies:** PR 9
- **Description:** Optional human gate for `completion_mode: production` only. Staging FCM + physical device. Sets `pass_device`. Skip when automated.

### PR 10: s10 — CAP-001 CAP-002 CAP-003 capabilities registry

- **step:** s10
- **kind:** implement
- **Files/components affected:** apps/mobile/src/platform/capabilities.ts, capabilities.test.ts, ReviewSheet.tsx, SourceFileSurface.tsx, ThreadFeed.tsx
- **Dependencies:** PR 9
- **Description:** Create `capabilities.ts`. Remove `resolveNativeReviewDiffView()!`. FORCE\_\* overrides. Requires `gates.m0_staging` is `pass_ci` or `pass_device`.

### PR 11: s11 — REV-001 REV-002 REV-003 JavaScriptReviewDiffList

- **step:** s11
- **kind:** implement
- **Files/components affected:** apps/mobile/src/features/review/JavaScriptReviewDiffList.tsx, ReviewSheet.tsx
- **Dependencies:** PR 10
- **Description:** Tier-0 virtualized review list. Collapse, line tap, pull-to-refresh.

### PR 12: s12 — CMP-001 CMP-002 CMP-004 strip composer

- **step:** s12
- **kind:** implement
- **Files/components affected:** apps/mobile/modules/t3-composer-editor/T3ComposerEditor.tsx
- **Dependencies:** PR 10
- **Description:** `@t3tools/shared/composerInlineTokens` on Android send. Strip-mode chips. DEC-006.

### PR 13: s13 — AGT-002 AGT-003 AGT-004 SEC-040 notification channels and deep link ACL

- **step:** s13
- **kind:** implement
- **Files/components affected:** apps/mobile agent notification channels, notificationPayload.ts, useAgentNotificationNavigation, SettingsRouteScreen.tsx, notificationNavigation.test.ts
- **Dependencies:** PR 9, PR 10
- **Description:** Per-phase channels. Cold-start deep link. Settings not `unsupported`. **SEC-040:** fail closed if environment not linked.

### PR 14: s14 — QA-010 relay push seed script and staging test hook

- **step:** s14
- **kind:** implement
- **Files/components affected:** apps/mobile/.maestro/scripts/seed-relay-push.sh, infra/relay staging test publish doc or endpoint stub, scratch/android-parity/STAGING-RUNBOOK.md
- **Dependencies:** PR 9
- **Description:** Script to trigger staging `waiting_for_approval` event for Maestro/CI. Documents required env vars; fails with clear message if staging unset.

### PR 15: s15 — QA-006 QA-012 Maestro flows and auth bypass

- **step:** s15
- **kind:** implement
- **Files/components affected:** apps/mobile/.maestro/config.yaml, flows/smoke-launch.yaml, smoke-review.yaml, smoke-agent-push.yaml, fixtures/auth-bypass.yaml, EXPO_PUBLIC_MAESTRO_AUTH_BYPASS, testID props
- **Dependencies:** PR 11, PR 12, PR 13, PR 14
- **Description:** M1 Maestro flows. Auth bypass for CI. testID contract per QA-006.

### PR 16: s16 — STR-002 T1 sign-off CI and smoke matrix

- **step:** s16
- **kind:** implement
- **Files/components affected:** .github/workflows/mobile-qa.yml, scratch/android-parity/smoke-matrix.adoc, signoff-GATE-T1.adoc, PROGRESS.md
- **Dependencies:** PR 15
- **Description:** Enable Maestro job (continue-on-error until stable). Mark T1 smoke rows PASS/DEGRADED. T1 gate artifact.

### PR 17: s17 — REV-006 shared review view-model

- **step:** s17
- **kind:** implement
- **Files/components affected:** packages/shared/src/review/, apps/mobile reviewModel alignment, apps/web/src/lib/diffRendering.ts shared keys
- **Dependencies:** PR 16
- **Description:** Shared cache keys with web. No Pierre RN components.

### PR 18: s18 — MD-001 MD-002 nitro markdown parity

- **step:** s18
- **kind:** implement
- **Files/components affected:** apps/mobile nitro CustomRenderers, ThreadFeed.tsx, NativeMarkdownBlock shared renderers
- **Dependencies:** PR 17
- **Description:** File icons, skill chips, code copy. Enhanced nitro on Android.

### PR 19: s19 — NAV-001 UX-003 accessory bar and phase indicator

- **step:** s19
- **kind:** implement
- **Files/components affected:** apps/mobile thread chrome, bottom accessory bar, agent phase indicator components
- **Dependencies:** PR 17
- **Description:** Files | Terminal | Review | Git bar. Phase indicator per ux-spec.

### PR 20: s20 — AGT-005 ongoing agent notification

- **step:** s20
- **kind:** implement
- **Files/components affected:** apps/mobile ongoing notification builder, Android notification manager integration
- **Dependencies:** PR 13, PR 19
- **Description:** Expandable ongoing notification while running/waiting. SEC-032 PII ceiling.

### PR 21: s21 — TRM-002 SEC-050 SEC-051 SEC-052 WebView terminal

- **step:** s21
- **kind:** implement
- **Files/components affected:** apps/mobile terminal WebView surface, modules/t3-terminal/, @xterm/xterm bundle, capabilities terminal.webView
- **Dependencies:** PR 10
- **Description:** Bundled xterm only. No `originWhitelist *`. Validated postMessage bridge. Default on Android.

### PR 22: s22 — AND-003 QA tablet split and smoke-tablet Maestro

- **step:** s22
- **kind:** implement
- **Files/components affected:** apps/mobile/.maestro/flows/smoke-tablet-split.yaml, smoke-matrix tablet rows
- **Dependencies:** PR 19, PR 11
- **Description:** Tablet/foldable split validation at 720×600.

### PR 23: s23 — STR-003 T2 sign-off

- **step:** s23
- **kind:** implement
- **Files/components affected:** scratch/android-parity/signoff-GATE-T2.adoc, smoke-matrix.adoc, .maestro/smoke-composer.yaml
- **Dependencies:** PR 18, PR 19, PR 20, PR 21, PR 22
- **Description:** Maestro M2 flows. T2 smoke rows. Composer send flow. GA bar for Android agent client.

### PR 24: s24 — TRM-005 AND-001 hardware keyboard shortcuts

- **step:** s24
- **kind:** implement
- **Files/components affected:** apps/mobile hardware keyboard dispatcher, T3KeyboardCommands Android path
- **Dependencies:** PR 23
- **Description:** Ctrl+N/F, thread tool shortcuts. DeX/tablet compatible.

### PR 25: s25 — AND-002 AND-004 edge-to-edge and predictive back

- **step:** s25
- **kind:** implement
- **Files/components affected:** apps/mobile screens inset audit, app.config.ts orientation/tablet, react-native-screens back
- **Dependencies:** PR 23
- **Description:** targetSdk 35+ insets. Predictive back verified. Tablet orientation policy.

### PR 26: s26 — REV-007 perf gate documentation

- **step:** s26
- **kind:** implement
- **Files/components affected:** scratch/android-parity/perf-results.adoc, profile scripts usage doc
- **Dependencies:** PR 11
- **Description:** Benchmark 10-file JS review on Hermes. Document gate result. No Kotlin unless gate fails.

### PR 27: s27 — GATE-T3-CI automated verification

- **step:** s27
- **kind:** implement
- **Files/components affected:** scripts/android-parity/verify-t3-ci.sh, scratch/android-parity/signoff-GATE-T3.adoc, smoke-matrix.adoc
- **Dependencies:** PR 24, PR 25, PR 26
- **Description:** Run `verify-t3-ci.sh`. Set `gates.t3_complete=pass_ci`. Mark T3 smoke rows PASS from CI evidence.

### PR 27b: s27b — GATE-T3 device verification (optional)

- **step:** s27b
- **kind:** gate
- **Dependencies:** PR 27
- **Description:** Optional human device pass for `completion_mode: production`. Sets `pass_device`.

### PR 28: s28 — Program complete marker

- **step:** s28
- **kind:** infra
- **Files/components affected:** scratch/android-parity/PROGRESS.md, loop-state.template.json, README.adoc
- **Dependencies:** PR 27
- **Description:** Mark program COMPLETE in PROGRESS.md when `gates.t3_complete` is `pass_ci` or `pass_device`. Optional M4 in plan.adoc only.
