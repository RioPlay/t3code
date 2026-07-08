#!/usr/bin/env bash
# Land post-program PRs on your fork after s28. Loops until current_step is done.
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

FORK="$(jq -r '.fork // empty' "$CONFIG_FILE")"
GH_REPO=()
[[ -n "$FORK" ]] && GH_REPO=(--repo "$FORK")

resolve_next_required() {
  jq -r '.post_program.steps | to_entries | sort_by(.key) | .[].key' "$CONFIG_FILE"
}

find_current_step() {
  if [[ -n "$ONLY_STEP" ]]; then
    echo "$ONLY_STEP"
    return
  fi
  local current
  current="$(jq -r '.current_step' "$STATE_FILE")"
  if [[ "$current" != "done" ]]; then
    echo "$current"
    return
  fi
  local pp st req
  while IFS= read -r pp; do
    [[ -z "$pp" ]] && continue
    st="$(jq -r --arg s "$pp" '.steps[$s].status // "pending"' "$STATE_FILE")"
    req="$(jq -r --arg s "$pp" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
    opt="$(jq -r --arg s "$pp" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"
    if [[ "$req" == "true" && "$st" != "merged" ]]; then
      echo "$pp"
      return
    fi
    if [[ "$req" != "true" && "$opt" == "superseded" && "$st" != "superseded" && "$st" != "merged" ]]; then
      echo "$pp"
      return
    fi
  done < <(resolve_next_required)
  echo "done"
}

compute_next_after() {
  local current="$1"
  local pp req opt found=false
  for pp in $(resolve_next_required); do
    if $found; then
      req="$(jq -r --arg s "$pp" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
      opt="$(jq -r --arg s "$pp" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"
      st="$(jq -r --arg s "$pp" '.steps[$s].status // "pending"' "$STATE_FILE")"
      if [[ "$req" == "true" && "$st" != "merged" ]]; then
        echo "$pp"
        return
      fi
      if [[ "$req" != "true" && "$opt" == "superseded" && "$st" != "superseded" ]]; then
        echo "$pp"
        return
      fi
    fi
    [[ "$pp" == "$current" ]] && found=true
  done
  echo "done"
}

process_step() {
  local CURRENT="$1"
  local pr branch required title status opt_status NEXT

  pr="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].pr // empty' "$CONFIG_FILE")"
  branch="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].branch // empty' "$CONFIG_FILE")"
  required="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
  title="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].title // $s' "$CONFIG_FILE")"
  opt_status="$(jq -r --arg s "$CURRENT" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"

  if [[ -z "$pr" ]]; then
    echo "No PR configured for step $CURRENT" >&2
    return 1
  fi

  echo "==> Post-program step $CURRENT: PR #$pr ($title)"
  status="$(jq -r --arg s "$CURRENT" '.steps[$s].status // "pending"' "$STATE_FILE")"

  if [[ "$status" == "merged" ]]; then
    echo "==> Already merged"
    return 0
  fi

  if [[ "$required" != "true" ]]; then
    if [[ "$opt_status" == "superseded" ]]; then
      echo "==> Superseded — closing PR #$pr"
      if ! $DRY_RUN; then
        NO_COLOR=1 gh pr close "$pr" "${GH_REPO[@]}" \
          --comment "Superseded by main + post-program completion. Optional M4 stretch — reopen if rebased." 2>/dev/null || true
        local TMP
        TMP="$(mktemp)"
        NEXT="$(compute_next_after "$CURRENT")"
        jq --arg s "$CURRENT" --arg next "$NEXT" \
          '.steps[$s] = {status: "superseded", pr: null, merged_at: null} | .current_step = $next' \
          "$STATE_FILE" > "$TMP" && mv "$TMP" "$STATE_FILE"
      fi
      echo "==> Closed #$pr"
      return 0
    fi
    echo "==> Optional step skipped: $CURRENT"
    return 0
  fi

  if $DRY_RUN; then
    echo "Would: checkout $branch, gate.sh --quick, advance-pr.sh $pr $CURRENT"
    return 0
  fi

  if [[ -n "$branch" ]]; then
    git fetch origin "$branch" 2>/dev/null || true
    git checkout "$branch"
    git pull origin "$branch" 2>/dev/null || true
  fi

  echo "==> Running local gate"
  scripts/android-parity/gate.sh --quick

  NEXT="$(compute_next_after "$CURRENT")"
  scripts/android-parity/advance-pr.sh "$pr" "$CURRENT" "$NEXT"
  echo "==> Step $CURRENT complete → $NEXT"
}

# Main loop
scripts/android-parity/sync-loop-state.sh
while true; do
  CURRENT="$(find_current_step)"
  if [[ "$CURRENT" == "done" ]]; then
    echo "==> Post-program complete"
    scripts/android-parity/sync-loop-state.sh
    jq '{current_step, phase, pp01: .steps.pp01, pp02: .steps.pp02}' "$STATE_FILE"
    exit 0
  fi

  process_step "$CURRENT"

  if [[ -n "$ONLY_STEP" ]]; then
    break
  fi
done

echo "==> Post-program loop finished"
scripts/android-parity/sync-loop-state.sh