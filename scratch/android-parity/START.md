# Start Android Parity (start → finish)

## 1. Preflight (once)

```bash
chmod +x scripts/android-parity/*.sh
./scripts/android-parity/preflight.sh
```

## 2. Say to agent

```
Start android parity implementation — full program through s28.

Follow scratch/android-parity/AGENT-LOOP.md.
completion_mode: automated (skip s09b and s27b unless I say production).
auto_continue per loop-config.json.
Stop on circuit_breaker. On tool/shell failures follow FAULT-TOLERANCE.md.
```

## 3. Completion

Program **COMPLETE** at s28 when `gates.t3_complete` is `pass_ci`.

Optional device hardening: set `completion_mode` to `production` in `loop-config.json` — then s09b and s27b require your `gate pass`.

## 4. Your involvement (automated mode)

| Step            | You                                                  |
| --------------- | ---------------------------------------------------- |
| s01–s28         | Nothing required (agent merges to fork, CI babysits) |
| s09b, s27b      | Skipped                                              |
| Circuit breaker | Triage if agent stops after 3 CI failures            |
