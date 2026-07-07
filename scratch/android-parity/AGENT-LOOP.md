# Android Parity — Agent Implementation Loop (full program)

**Authority:** This file wins on conflict with `plan.adoc` for execution.  
**Steps:** `implementation.md` (s01 → s28 = complete).  
**No timelines:** Do not estimate weeks or schedule sprints.

---

## Start command (human)

```
Start android parity implementation — full program through s28.

Follow scratch/android-parity/AGENT-LOOP.md.
Resume from loop-state.json (copy loop-state.template.json if missing).
auto_continue: follow loop-config.json.
Stop on circuit_breaker. In automated mode skip s09b/s27b. On tool failure follow FAULT-TOLERANCE.md.
Do not read plan.adoc unless a step cites it.
```

---

## Agent loop (one step → next)

```
LOAD state → PREFLIGHT → IMPLEMENT → gate.sh → PR → BABYSIT CI → UPDATE state → NEXT or STOP
```

### 1. Load

- `loop-state.json` (gitignored; copy from `loop-state.template.json`)
- `loop-config.json`
- Current step block in `implementation.md` only
- `decisions.adoc` (frozen)

### 2. Preflight

```bash
python3 scripts/validate-plan.py scratch/android-parity/implementation.md
scripts/android-parity/gate.sh --quick
```

Read `completion_mode` from `loop-config.json` (default `automated`).

M0 unblock: `gates.m0_staging` in `pass_ci` | `pass_device` before s10.

T3 unblock: `gates.t3_complete` in `pass_ci` | `pass_device` before s28.

**Skip optional steps** when `completion_mode === "automated"`: `s09b`, `s27b`.

If `gates.t3_complete == pass` and `current_step` == s28 → program done.

### 3. Implement

- Branch: `android-parity/<step-id>`
- Scope: files listed in step only
- Before commit: `scripts/android-parity/gate.sh`
- PR title: `<REQ-IDs>: <imperative>`
- Target: fork `main` per `loop-config.json`

### 4. Babysit CI

Use `/pr-babysit add <n>` and poll until green. Fix on branch. Max 3 attempts then `circuit_breaker`.

### 5. Advance

Update `loop-state.json`, `PROGRESS.md`, `smoke-matrix.adoc` rows cited in step.

| `loop-config`                   | Behavior after CI green                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `require_merge_approval: true`  | STOP; human merges + `continue`                                      |
| `require_merge_approval: false` | Agent merges to fork `main`, then next step if `auto_continue: true` |

### 6. Gates

| Mode           | M0 (s09)                      | T3 (s27)                      | Optional device |
| -------------- | ----------------------------- | ----------------------------- | --------------- |
| **automated**  | `verify-m0-ci.sh` → `pass_ci` | `verify-t3-ci.sh` → `pass_ci` | Skip s09b, s27b |
| **production** | s09 + **s09b** human device   | s27 + **s27b** human device   | Required        |

Agent never fakes PASS. CI scripts are the automated authority.

---

## Human touchpoints (minimal)

| When                     | You do                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| **Before s09**           | EAS Firebase secret + staging relay creds (STAGING-RUNBOOK §Secrets) |
| **s09**                  | ~15 min device E2E → `gate pass`                                     |
| **Each step** (optional) | Merge PR if `require_merge_approval: true`                           |
| **s27**                  | Confirm hardware keys + Android 16 on device → `gate pass`           |

Everything else: agent + CI.

---

## Completion criteria

| Gate     | Step | Meaning                           |
| -------- | ---- | --------------------------------- |
| T1       | s16  | Control-plane baseline            |
| T2 (GA)  | s23  | Professional Android agent client |
| T3       | s27  | Platform fit                      |
| **DONE** | s28  | `PROGRESS.md` shows COMPLETE      |

Out of scope unless new DEC: mirror composer (DEC-005), Ghostty NDK (DEC-003), FGS/widgets (M4).

---

## Weak-part fixes (built into steps)

| Issue                            | Step                           |
| -------------------------------- | ------------------------------ |
| No staging deploy                | s01 workflow + STAGING-RUNBOOK |
| No Firebase build                | s08 + FIREBASE-ANDROID.md      |
| notificationPermissions iOS-only | s06                            |
| registrationPayload hardcoded    | s05 + androidSdkVersion        |
| SEC-040 missing                  | s13                            |
| client-runtime blast radius      | s02                            |
| mobile-qa late                   | s01 stub, s16 full             |
| Maestro harness missing          | s14 seed script                |
| M2 cliff                         | s17–s23                        |
| M3 cliff                         | s24–s27                        |
| .env.example flags               | s01                            |
| Review crash until caps          | s10–s11 (after s09 gate)       |

---

## Circuit breaker

After 3 failures on the **same step** (CI, `gate.sh`, or unrecoverable tool error): set `circuit_breaker.tripped: true`, STOP, report.

Human fixes → reset breaker → reply **`continue`**.

---

## Tool call and failure precautions

**Full playbook:** `FAULT-TOLERANCE.md` (required reading for agents).

Summary:

| Risk                    | Precaution                                                |
| ----------------------- | --------------------------------------------------------- |
| Tool-less hallucination | No claim without tool result in context                   |
| Compaction amnesia      | `loop-state.json` + step block only + `gh pr list`        |
| CI red                  | `/pr-babysit`, max 3 fixes, then breaker                  |
| Shell flake             | Git lock: 3× retry; gate base: `ANDROID_PARITY_DIFF_BASE` |
| Wrong scope             | Revert drive-by edits; stay in step file list             |
| validate-plan fail      | Fail closed — fix DAG, do not code                        |
| Subagent crash          | Retry same step, same branch; do not skip                 |

---

## File map

| File                  | Role                    |
| --------------------- | ----------------------- |
| `implementation.md`   | s01–s28 DAG             |
| `STAGING-RUNBOOK.md`  | Human+agent staging ops |
| `loop-state.json`     | Resume pointer          |
| `PROGRESS.md`         | Dashboard               |
| `signoff-GATE-*.adoc` | Gate evidence           |
