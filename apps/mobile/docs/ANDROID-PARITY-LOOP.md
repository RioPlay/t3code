# Android parity loop (mobile)

Operator docs for the autonomous Android parity loop live in the local-only
`scratch/android-parity/` tree (gitignored). Copy that folder to each machine
that runs the loop.

## Quick reference

| Item            | Location                                   |
| --------------- | ------------------------------------------ |
| Agent playbook  | `scratch/android-parity/AGENT-LOOP.md`     |
| Tier-1+ kickoff | `scratch/android-parity/TIER1-PLUS.md`     |
| PR DAG          | `scratch/android-parity/implementation.md` |
| Loop config     | `scratch/android-parity/loop-config.json`  |
| Loop state      | `scratch/android-parity/loop-state.json`   |

## Scripts

```bash
chmod +x scripts/android-parity/*.sh
./scripts/android-parity/preflight.sh
scripts/android-parity/run-tier1-plus.sh   # tier1_plus phase
```

## Gates

- Per-PR: `scripts/android-parity/gate.sh`
- Review paths also run `reviewPerfGate.test.ts` (REV-007)
- Maestro flows: register new flows in `scripts/android-parity/run-maestro-android.sh`

## Capability flags (dogfood)

Tier-1+ uses `loop-config.json` → `env` for Android dogfood defaults during
development. Production capability flips land in individual tier steps (terminal,
composer, review).
