# Android parity completion loop

This document defines how T3 Code Mobile closes the Android ↔ iOS gap from **tier-0 parity** (all flows work via fallbacks) to **tier-1 parity** (native surfaces + polish on par with iOS), with continuous polish baked into every iteration.

Execution artifacts live in `scratch/android-parity/` (gitignored, local). Scripts in `scripts/android-parity/` are committed and shared.

## Goal

| Tier       | Definition                                                                         | Status          |
| ---------- | ---------------------------------------------------------------------------------- | --------------- |
| **Tier-0** | Every core flow works on Android via JS or cross-platform native fallbacks         | **Done**        |
| **Tier-1** | Native surfaces match iOS defaults; chrome feels platform-native; perf gates green | **In progress** |
| **Tier-2** | Play Store ready; Maestro + perf regression suite blocks regressions               | **Planned**     |

iOS-only system integrations (Live Activity, home-screen widget, liquid glass) stay iOS-only. Android gets platform-appropriate equivalents (ongoing notification already ships).

## Gaps → workstreams

| Gap                                         | Workstream             | Target                                                                     |
| ------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| Native composer (`t3-composer-editor`)      | **WS-NATIVE-COMPOSER** | Inline tokens + rich paste on Android                                      |
| Native review (`t3-review-diff`) or fast JS | **WS-REVIEW**          | Large-diff scroll stays under REV-007 budget                               |
| Native selectable markdown                  | **WS-MARKDOWN**        | Text selection parity with iOS                                             |
| WebView terminal default                    | **WS-TERMINAL**        | Flip Android default to native `T3TerminalView`                            |
| Header / toolbar chrome                     | **WS-CHROME**          | Android headers align with iOS mail-search patterns (Material equivalents) |
| Launcher art                                | **WS-BRAND**           | Distinct foreground icons per variant                                      |
| Store readiness                             | **WS-STORE**           | Signing, cleartext policy, Play internal track                             |

## The development loop (every PR)

Each Android parity PR runs the same closed loop. Gstack skills map to phases.

```mermaid
flowchart LR
  A[Pick step from loop-state] --> B[Implement]
  B --> C[gate.sh]
  C --> D{UI change?}
  D -->|yes| E[Maestro smoke]
  D -->|no| F[/review]
  E --> F
  F --> G{Polish / chrome?}
  G -->|yes| H[/design-review]
  G -->|no| I[PR + CI]
  H --> I
  I --> J{Green?}
  J -->|no| B
  J -->|yes| K[advance-pr.sh]
  K --> L[Next step]
```

### Per-PR checklist

1. **Scope** — Read `scratch/android-parity/implementation.md` step; touch only listed files.
2. **Gate** — `scripts/android-parity/gate.sh` (or `--quick` for docs-only).
3. **Perf** — If review touched: `vp test run apps/mobile/src/features/review/reviewPerfGate.test.ts`.
4. **Smoke** — If UI touched: `./scripts/android-parity/run-maestro-android.sh` on booted emulator.
5. **Review** — `/review` (gstack) on the diff; `/design-review` when chrome or spacing changes.
6. **Ship** — `/ship` or `advance-pr.sh <pr> <step-id>` when `completion_mode=automated`.
7. **State** — `loop-state.json` advances via `advance-pr.sh`; never edit by hand after merge.

### Gstack skill routing (Android parity)

| Phase              | Skill                      | When                                                         |
| ------------------ | -------------------------- | ------------------------------------------------------------ |
| Shape backlog item | `/spec`                    | New gap discovered mid-loop                                  |
| Lock architecture  | `/plan-eng-review`         | Before native module ports (WS-NATIVE-\*)                    |
| Visual polish      | `/design-review`           | Every WS-CHROME PR + weekly audit                            |
| Pre-land diff      | `/review`                  | Every PR before merge                                        |
| Emulator QA        | Maestro + `/qa-only`       | UI PRs; nightly CI already runs smoke                        |
| Debug regression   | `/investigate`             | Maestro or perf gate failure                                 |
| Land stack         | `/ship` or `/execute-plan` | Batch landing via `scratch/android-parity/implementation.md` |
| Health trend       | `/health`                  | Weekly; track typecheck + test + perf scores                 |

### Continuous polish (not a one-off phase)

Polish is a **horizontal gate**, not a final PR:

- **Chrome audit** — After every WS-CHROME step, capture emulator screenshots (phone + tablet) and run `/design-review` against iOS reference.
- **Perf budget** — `reviewPerfGate.test.ts` blocks REV-007 regression; thresholds in `reviewPerfGate.ts`.
- **Maestro expansion** — New native surfaces add flows under `apps/mobile/.maestro/flows/`.
- **Capability defaults** — Flip defaults in `src/platform/capabilities.ts` only when the native path is Maestro-green.
- **Dogfood env** — CI keeps `EXPO_PUBLIC_FORCE_JS_REVIEW=1` on iOS unit tests so Android fallbacks stay tested on Apple builds.

## Starting the loop

```bash
# 1. Ensure scratch artifacts exist (created locally; gitignored)
scripts/android-parity/preflight.sh

# 2. Read current step
jq .current_step scratch/android-parity/loop-state.json

# 3. Follow AGENT-LOOP.md for the active step
cat scratch/android-parity/AGENT-LOOP.md

# 4. After green PR
scripts/android-parity/advance-pr.sh <pr-number> <step-id>
```

## CI alignment

| Check                       | Where                                                  | Blocks                                            |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `vp check` + typecheck      | `gate.sh`, `mobile-qa.yml`                             | Every PR                                          |
| FORCE\_\* mobile unit tests | `mobile-qa.yml`                                        | Every mobile PR                                   |
| Maestro Android smoke       | `mobile-qa.yml` (API 34)                               | Every mobile PR                                   |
| `reviewPerfGate.test.ts`    | `gate.sh`, `mobile-qa.yml` (`mobile_review_perf_gate`) | When `apps/mobile/src/features/review/**` changes |
| Maestro flow registration   | `scripts/android-parity/run-maestro-android.sh`        | Same PR as any new `.maestro/flows/*.yaml`        |
| `expo-doctor`               | `mobile-qa.yml`                                        | Every mobile PR                                   |

## Key decisions

1. **JS-first for review** — Optimize JS review before porting `t3-review-diff` to Android; port only if perf gate still fails after REV-007 optimizations.
2. **Native terminal before composer** — Lower risk; `t3-terminal` Android already builds; flip default once Maestro terminal flow exists.
3. **Chrome uses Material patterns** — Do not fake iOS liquid glass; align information hierarchy and search placement with Material 3.
4. **Scratch for execution, docs for intent** — `implementation.md` + `loop-state.json` stay local; this file + `ANDROID-PARITY.md` stay committed.
5. **Supervised advance with mandatory polish gates** — `completion_mode=supervised` by default; `force_polish_gates=true` makes `s09b` / `s27b` blocking.
6. **Material, not faux glass** — Android chrome uses M3 app bars and solid surfaces; `GlassSurface` uses Material fills, not glass mimicry.

### Design-review checkpoints

`s06`, `s07`, `s09b`, `s14`, `s15`, `s16`, `s27b` — each requires emulator screenshots (phone + tablet × light + dark) before advance.

## Open questions

1. **Review native port** — Proceed with Kotlin `t3-review-diff` if JS stays above 300ms sustained jank proxy, or invest only in JS virtualization?
2. **Play track** — Internal testing first vs. closed alpha with FCM production keys?
3. **Markdown selectable** — Port `t3-markdown-text` or extend Nitro markdown with selection handles?

Resolve `review_strategy` at **s11** after perf gate (+ scroll jank check). Other decisions in `loop-config.json` before **s08**.

## Related docs

- [ANDROID-PARITY.md](./ANDROID-PARITY.md) — tier-0 defaults and module matrix
- [FIREBASE-ANDROID.md](./FIREBASE-ANDROID.md) — FCM setup
- `scratch/android-parity/implementation.md` — full PR DAG (local)
- `scratch/android-parity/AGENT-LOOP.md` — step-by-step agent playbook (local)
