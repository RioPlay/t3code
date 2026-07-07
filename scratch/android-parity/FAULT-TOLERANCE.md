# Fault Tolerance — Tool calls, agent failures, recovery

Agents implementing Android parity **must** follow this when tools fail, hang, or lie.

---

## Golden rules

1. **No tool call = no claim.** Never say a step is done unless the tool result is in context.
2. **Persist before advance.** Update `loop-state.json` after every merge; git is the artifact of truth.
3. **Fail closed.** If preflight or `gate.sh` fails, do not advance `current_step`.
4. **Same-step retry budget.** Max 3 attempts per step (config: `max_ci_retries_per_step`), then circuit breaker.
5. **Scope discipline.** Tool errors from drive-by edits → revert unrelated files, retry within step scope only.

---

## Failure modes and responses

### A. Shell / gate script failures

| Symptom                                         | Response                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `vp check` / `vpr typecheck` fail               | Fix code on **same branch**; re-run `gate.sh`. Counts toward retry budget.  |
| `gate.sh` skips mobile tests (no `origin/main`) | Set `ANDROID_PARITY_DIFF_BASE=main` and re-run.                             |
| `expo-doctor` fail                              | Fix `apps/mobile` config in step scope; do not skip.                        |
| Git lock error                                  | `sleep 2`; retry commit up to 3× (execute-plan pattern).                    |
| `validate-plan.py` fail                         | **STOP.** Fix `implementation.md` DAG only — do not implement product code. |

### B. Tool call / agent integrity failures

| Symptom                            | Response                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Announced work without tool output | Treat as **not done**. Re-execute with explicit tool calls.                                                       |
| Context compaction / session reset | Read `loop-state.json` → `current_step`; read that step block only; `gh pr list --head android-parity/*`; resume. |
| Subagent timeout or crash          | Same step retry: new branch commit or continue branch; do not skip to next step.                                  |
| Partial file write / edit conflict | `git status`; complete or revert; never leave conflict markers.                                                   |

### C. CI / PR failures (`/pr-babysit`)

| Symptom                     | Response                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| CI red on PR                | Fix on PR branch; push; re-poll. Attempt 1–3.                                                                          |
| 3rd CI failure on same step | Set `circuit_breaker.tripped: true`, `circuit_breaker.step`, `circuit_breaker.reason`; **STOP**; report logs + PR URL. |
| Merge conflict with `main`  | Rebase step branch onto fork `main`; re-run `gate.sh`; force-with-lease push.                                          |
| Flaky Maestro (after s16)   | One retry; if still red, mark smoke row `DEGRADED` in matrix + open issue; do not fake PASS.                           |

### D. Infrastructure / environment failures

| Symptom                         | Response                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gh` not authenticated          | **STOP.** Human runs `gh auth login`.                                                                                                                                             |
| Network denied in sandbox       | Re-run with `full_network` or required permissions; do not simulate success.                                                                                                      |
| Missing secrets (Firebase, FCM) | In `automated` mode: continue through s08 with docs only; s09 uses `verify-m0-ci.sh` (no live FCM). In `production` mode: **STOP** at s09b until human completes STAGING-RUNBOOK. |
| Relay staging deploy fails      | Do not set `pass_device`. Automated path uses `pass_ci` only.                                                                                                                     |

### E. Logic / scope failures

| Symptom                               | Response                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Implemented wrong step                | Revert commits on branch; re-read step block; retry.                      |
| Skipped `s09b` in production mode     | **STOP** before s10 if `gates.m0_staging` not `pass_ci` or `pass_device`. |
| Advanced `current_step` without merge | Roll back `loop-state.json` to last merged step; redo.                    |
| DEC-\* violation                      | **STOP.** New DEC entry requires human ack.                               |

---

## `loop-state.json` fields for failures

```json
{
  "current_step": "s12",
  "steps": {
    "s12": {
      "status": "in_progress",
      "branch": "android-parity/s12-maestro",
      "pr": 47,
      "attempts": 2,
      "last_error": "vp check failed: contracts drift"
    }
  },
  "circuit_breaker": {
    "tripped": false,
    "reason": null,
    "step": null
  }
}
```

On each attempt increment `steps.<id>.attempts`. At 3 → trip breaker.

---

## Recovery commands (human or agent)

```bash
# Where am I?
jq '{current_step, gates, circuit_breaker}' scratch/android-parity/loop-state.json

# Reset breaker after human fix
jq '.circuit_breaker = {tripped: false, reason: null, step: null}' \
  scratch/android-parity/loop-state.json > /tmp/ls.json && mv /tmp/ls.json scratch/android-parity/loop-state.json

# Retry same step
# Set current_step to failed step; agent re-runs AGENT-LOOP from §3

# Skip step (human only — document why in PROGRESS.md)
# Edit implementation.md to mark step cancelled + add DEC note
```

---

## Orchestration patterns (recommended)

| Pattern                  | Use when                                                 |
| ------------------------ | -------------------------------------------------------- |
| **One step per session** | Default — limits compaction damage                       |
| **`/pr-babysit`**        | After every PR; one poller per PR                        |
| **`/check-work`**        | After s09, s16, s23, s27 gates                           |
| **Worktree isolation**   | If using `/execute-plan` for parallel work inside a step |
| **No parallel steps**    | M0–M2 unless DAG explicitly allows                       |

---

## Anti-patterns (never do)

- Mark smoke-matrix `PASS` without evidence
- Set `pass_ci` / `pass_device` without running verify scripts
- Commit secrets (`google-services.json`, `*.pem`, service accounts)
- Use `resolveNative*()!` (CAP-002)
- Re-extract `composerInlineTokens` (DEC-006)
- Advance past failed `validate-plan.py`
- Claim "CI green" without `gh pr checks` output

---

## Human escalation checklist

When circuit breaker trips, human receives:

1. `current_step` + `last_error`
2. PR URL and failing CI job name
3. Diff stat vs step file list
4. Recommendation: fix and `continue` | split step | amend `implementation.md`

Reply **`continue`** after fix to reset breaker and retry same step.
