#!/usr/bin/env bash
# Land required post-program PRs on your fork after s28.
# Usage: run-post-program.sh [--dry-run] [--step pp01]
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

DRY_RUN=false
ONLY_STEP=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --step) ONLY_STEP="${2:?}"; shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
  shift
done

CONFIG_FILE="scratch/android-parity/loop-config.json"
STATE_FILE="scratch/android-parity/loop-state.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE" >&2
  echo "Copy scripts/android-parity/loop-config.example.json to scratch/android-parity/loop-config.json" >&2
  exit 1
fi

PHASE="$(jq -r '.phase // "program"' "$CONFIG_FILE")"
if [[ "$PHASE" != "post_program" ]]; then
  echo "loop-config phase is '$PHASE' — set phase to post_program to run this script" >&2
  exit 1
fi

# Refresh state from GitHub before running.
scripts/android-parity/sync-loop-state.sh

CURRENT="$(jq -r '.current_step' "$STATE_FILE")"
if [[ "$CURRENT" == "done" ]]; then
  echo "==> Post-program already complete"
  exit 0
fi

if [[ -n "$ONLY_STEP" ]]; then
  CURRENT="$ONLY_STEP"
fi

pr="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].pr // empty' "$CONFIG_FILE")"
branch="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].branch // empty' "$CONFIG_FILE")"
required="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
title="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].title // $s' "$CONFIG_FILE")"

if [[ -z "$pr" ]]; then
  echo "No PR configured for step $CURRENT" >&2
  exit 1
fi

echo "==> Post-program step $CURRENT: PR #$pr ($title)"

status="$(jq -r --arg s "$CURRENT" '.steps[$s].status // "pending"' "$STATE_FILE")"
if [[ "$status" == "merged" ]]; then
  echo "==> Already merged — run sync-loop-state.sh"
  exit 0
fi

if [[ "$required" != "true" ]]; then
  echo "==> Step $CURRENT is optional — skip with: jq '.post_program.steps.${CURRENT}.status=\"skipped\"' loop-config.json"
  echo "    Or merge manually: gh pr merge $pr --repo $(jq -r .fork "$CONFIG_FILE") --squash"
  exit 0
fi

if $DRY_RUN; then
  echo "Would: checkout $branch, gate.sh --quick, advance-pr.sh $pr $CURRENT"
  exit 0
fi

if [[ -n "$branch" ]]; then
  git fetch origin "$branch" 2>/dev/null || true
  git checkout "$branch"
  git pull origin "$branch" 2>/dev/null || true
fi

echo "==> Running local gate"
scripts/android-parity/gate.sh --quick

# Determine next step.
NEXT="done"
for pp in $(jq -r '.post_program.steps | to_entries | sort_by(.key) | .[].key' "$CONFIG_FILE"); do
  if [[ "$pp" > "$CURRENT" ]]; then
    req="$(jq -r --arg s "$pp" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
    opt="$(jq -r --arg s "$pp" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"
    if [[ "$req" == "true" ]]; then
      NEXT="$pp"
      break
    fi
    if [[ "$opt" != "skipped" && "$opt" != "superseded" ]]; then
      continue
    fi
  fi
done

scripts/android-parity/advance-pr.sh "$pr" "$CURRENT" "$NEXT"

echo "==> Post-program step $CURRENT complete → $NEXT"