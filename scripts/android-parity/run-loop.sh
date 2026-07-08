#!/usr/bin/env bash
# Land loop PRs for the active phase (post_program | tier1_plus).
# Usage: run-loop.sh [--dry-run] [--step pp01|t00] [--phase post_program|tier1_plus]
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DRY_RUN=false
ONLY_STEP=""
PHASE_OVERRIDE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --step) ONLY_STEP="${2:?}"; shift ;;
    --phase) PHASE_OVERRIDE="${2:?}"; shift ;;
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

PHASE="${PHASE_OVERRIDE:-$(jq -r '.phase // "program"' "$CONFIG_FILE")}"
case "$PHASE" in
  post_program | tier1_plus) ;;
  *)
    echo "Unsupported phase '$PHASE' — set phase to post_program or tier1_plus" >&2
    exit 1
    ;;
esac

STEPS_KEY="$PHASE"
FORK="$(jq -r '.fork // empty' "$CONFIG_FILE")"
GH_REPO=()
[[ -n "$FORK" ]] && GH_REPO=(--repo "$FORK")

resolve_next_step() {
  jq -r --arg phase "$STEPS_KEY" '.[$phase].steps | to_entries | sort_by(.key) | .[].key' "$CONFIG_FILE"
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
  local step_id req opt st
  while IFS= read -r step_id; do
    [[ -z "$step_id" ]] && continue
    st="$(jq -r --arg s "$step_id" '.steps[$s].status // "pending"' "$STATE_FILE")"
    req="$(jq -r --arg phase "$STEPS_KEY" --arg s "$step_id" '.[$phase].steps[$s].required // false' "$CONFIG_FILE")"
    opt="$(jq -r --arg phase "$STEPS_KEY" --arg s "$step_id" '.[$phase].steps[$s].status // empty' "$CONFIG_FILE")"
    if [[ "$req" == "true" && "$st" != "merged" ]]; then
      echo "$step_id"
      return
    fi
    if [[ "$req" != "true" && "$opt" == "superseded" && "$st" != "superseded" && "$st" != "merged" ]]; then
      echo "$step_id"
      return
    fi
  done < <(resolve_next_step)
  echo "done"
}

compute_next_after() {
  local current="$1"
  local step_id req opt st found=false
  COMPLETION_MODE="$(jq -r '.completion_mode // "automated"' "$CONFIG_FILE")"
  for step_id in $(resolve_next_step); do
    if $found; then
      if [[ "$COMPLETION_MODE" == "automated" && "$step_id" == "t15b" ]]; then
        continue
      fi
      req="$(jq -r --arg phase "$STEPS_KEY" --arg s "$step_id" '.[$phase].steps[$s].required // false' "$CONFIG_FILE")"
      opt="$(jq -r --arg phase "$STEPS_KEY" --arg s "$step_id" '.[$phase].steps[$s].status // empty' "$CONFIG_FILE")"
      st="$(jq -r --arg s "$step_id" '.steps[$s].status // "pending"' "$STATE_FILE")"
      if [[ "$req" == "true" && "$st" != "merged" ]]; then
        echo "$step_id"
        return
      fi
      if [[ "$req" != "true" && "$opt" == "superseded" && "$st" != "superseded" ]]; then
        echo "$step_id"
        return
      fi
    fi
    [[ "$step_id" == "$current" ]] && found=true
  done
  echo "done"
}

process_step() {
  local CURRENT="$1"
  local pr branch required title opt_status NEXT

  pr="$(jq -r --arg phase "$STEPS_KEY" --arg s "$CURRENT" '.[$phase].steps[$s].pr // empty' "$CONFIG_FILE")"
  branch="$(jq -r --arg phase "$STEPS_KEY" --arg s "$CURRENT" '.[$phase].steps[$s].branch // empty' "$CONFIG_FILE")"
  required="$(jq -r --arg phase "$STEPS_KEY" --arg s "$CURRENT" '.[$phase].steps[$s].required // false' "$CONFIG_FILE")"
  title="$(jq -r --arg phase "$STEPS_KEY" --arg s "$CURRENT" '.[$phase].steps[$s].title // $s' "$CONFIG_FILE")"
  opt_status="$(jq -r --arg phase "$STEPS_KEY" --arg s "$CURRENT" '.[$phase].steps[$s].status // empty' "$CONFIG_FILE")"

  echo "==> Loop step $CURRENT ($PHASE): $title"
  local status
  status="$(jq -r --arg s "$CURRENT" '.steps[$s].status // "pending"' "$STATE_FILE")"

  if [[ "$status" == "merged" ]]; then
    echo "==> Already merged"
    return 0
  fi

  if [[ "$required" != "true" ]]; then
    if [[ "$opt_status" == "superseded" ]]; then
      echo "==> Superseded — closing PR ${pr:-none}"
      if ! $DRY_RUN && [[ -n "$pr" && "$pr" != "null" ]]; then
        NO_COLOR=1 gh pr close "$pr" "${GH_REPO[@]}" \
          --comment "Superseded by main + loop completion." 2>/dev/null || true
        local TMP
        TMP="$(mktemp)"
        NEXT="$(compute_next_after "$CURRENT")"
        jq --arg s "$CURRENT" --arg next "$NEXT" \
          '.steps[$s] = {status: "superseded", pr: null, merged_at: null} | .current_step = $next' \
          "$STATE_FILE" > "$TMP" && mv "$TMP" "$STATE_FILE"
      fi
      echo "==> Closed optional step $CURRENT"
      return 0
    fi
    echo "==> Optional step skipped: $CURRENT"
    return 0
  fi

  if [[ -z "$pr" || "$pr" == "null" ]]; then
    echo "==> No PR number for $CURRENT — implement on '$branch', create PR, update config or call advance-pr.sh" >&2
    if [[ -n "$branch" ]]; then
      if $DRY_RUN; then
        echo "Would: checkout $branch, gate.sh, gh pr create, advance-pr.sh <PR> $CURRENT"
      else
        git fetch origin "$branch" 2>/dev/null || true
        if git show-ref --verify --quiet "refs/heads/$branch"; then
          git checkout "$branch"
        elif git ls-remote --exit-code origin "$branch" >/dev/null 2>&1; then
          git checkout -b "$branch" "origin/$branch"
        else
          git checkout -b "$branch" origin/main 2>/dev/null || git checkout -b "$branch"
        fi
        echo "==> Checked out $branch — implement, gate.sh, gh pr create, advance-pr.sh"
      fi
    fi
    return 1
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

scripts/android-parity/sync-loop-state.sh
while true; do
  CURRENT="$(find_current_step)"
  if [[ "$CURRENT" == "done" ]]; then
    echo "==> Loop complete (phase=$PHASE)"
    scripts/android-parity/sync-loop-state.sh
    jq '{current_step, phase}' "$STATE_FILE"
    exit 0
  fi

  if process_step "$CURRENT"; then
    :
  else
    echo "==> Step $CURRENT needs implementation before merge — stopping loop" >&2
    exit 1
  fi

  if [[ -n "$ONLY_STEP" ]]; then
    break
  fi
done

echo "==> Loop finished (phase=$PHASE)"
scripts/android-parity/sync-loop-state.sh