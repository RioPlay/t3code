#!/usr/bin/env bash
# Rebuild scratch/android-parity/loop-state.json from fork merge history + local config.
# Usage: sync-loop-state.sh [--dry-run]
set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

STATE_FILE="scratch/android-parity/loop-state.json"
CONFIG_FILE="scratch/android-parity/loop-config.json"
TEMPLATE_FILE="scratch/android-parity/loop-state.template.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE — copy scripts/android-parity/loop-config.example.json" >&2
  exit 1
fi

FORK="$(jq -r '.fork // empty' "$CONFIG_FILE")"
GH_REPO_ARGS=()
if [[ -n "$FORK" ]]; then
  GH_REPO_ARGS=(--repo "$FORK")
fi

PHASE="$(jq -r '.phase // "program"' "$CONFIG_FILE")"

echo "==> Syncing loop state (fork=${FORK:-origin}, phase=$PHASE)"

# Program steps s01–s26: map merged PR numbers to step ids via PROGRESS.md or gh.
declare -A PR_TO_STEP=(
  [1]=s01 [2]=s02 [3]=s03 [4]=s04 [5]=s05 [6]=s06 [7]=s07 [8]=s08 [9]=s09
  [10]=s10 [11]=s11 [12]=s12 [13]=s13 [14]=s14 [15]=s15 [16]=s16 [17]=s17
  [18]=s18 [19]=s19 [20]=s20 [21]=s21 [22]=s22 [23]=s23 [24]=s24 [25]=s25 [26]=s26
)

MERGED_JSON="$(NO_COLOR=1 gh pr list "${GH_REPO_ARGS[@]}" --state merged --limit 50 --json number,url,mergedAt 2>/dev/null \
  | sed 's/\x1b\[[0-9;]*m//g')"
CLOSED_JSON="$(NO_COLOR=1 gh pr list "${GH_REPO_ARGS[@]}" --state closed --limit 50 --json number,state 2>/dev/null \
  | sed 's/\x1b\[[0-9;]*m//g')"

if [[ -z "$MERGED_JSON" || "$MERGED_JSON" == "[]" ]]; then
  echo "No merged PRs found on ${FORK:-default repo}" >&2
  exit 1
fi

# Start from template for step keys.
BASE="$(cat "$TEMPLATE_FILE")"
for step in s01 s02 s03 s04 s05 s06 s07 s08 s09 s10 s11 s12 s13 s14 s15 s16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26; do
  BASE="$(echo "$BASE" | jq --arg s "$step" '.steps[$s] = {status: "pending", pr: null, merged_at: null}')"
done
BASE="$(echo "$BASE" | jq '.steps.s27 = {status: "gate_pass", pr: null, merged_at: null}')"
BASE="$(echo "$BASE" | jq '.steps.s28 = {status: "complete", pr: null, merged_at: null}')"

# Apply merged program PRs.
for pr in $(echo "$MERGED_JSON" | jq -r '.[].number'); do
  step="${PR_TO_STEP[$pr]:-}"
  if [[ -z "$step" ]]; then
    continue
  fi
  url="$(echo "$MERGED_JSON" | jq -r --argjson n "$pr" '.[] | select(.number == $n) | .url')"
  merged="$(echo "$MERGED_JSON" | jq -r --argjson n "$pr" '.[] | select(.number == $n) | .mergedAt')"
  BASE="$(echo "$BASE" | jq --arg s "$step" --arg url "$url" --arg merged "$merged" \
    '.steps[$s] = {status: "merged", pr: $url, merged_at: $merged}')"
done

# Post-program steps from config.
POST_STEPS="$(jq -r '.post_program.steps // {} | keys[]' "$CONFIG_FILE" 2>/dev/null || true)"
CURRENT_STEP="s28"
if [[ "$PHASE" == "post_program" ]]; then
  CURRENT_STEP="pp01"
  for pp in $POST_STEPS; do
    BASE="$(echo "$BASE" | jq --arg s "$pp" '.steps[$s] = {status: "pending", pr: null, merged_at: null}')"
    pr_num="$(jq -r --arg s "$pp" '.post_program.steps[$s].pr // empty' "$CONFIG_FILE")"
    required="$(jq -r --arg s "$pp" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
    optional_status="$(jq -r --arg s "$pp" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"
    if [[ "$optional_status" == "superseded" && "$required" != "true" ]]; then
      BASE="$(echo "$BASE" | jq --arg s "$pp" '.steps[$s].status = "superseded"')"
    elif [[ "$optional_status" == "optional" && "$required" != "true" ]]; then
      BASE="$(echo "$BASE" | jq --arg s "$pp" '.steps[$s].status = "optional"')"
    fi
    if [[ -n "$pr_num" ]]; then
      url="$(echo "$MERGED_JSON" | jq -r --argjson n "$pr_num" '.[] | select(.number == $n) | .url' 2>/dev/null || true)"
      merged="$(echo "$MERGED_JSON" | jq -r --argjson n "$pr_num" '.[] | select(.number == $n) | .mergedAt' 2>/dev/null || true)"
      if [[ -n "$url" && "$url" != "null" ]]; then
        BASE="$(echo "$BASE" | jq --arg s "$pp" --arg url "$url" --arg merged "$merged" \
          '.steps[$s] = {status: "merged", pr: $url, merged_at: $merged}')"
      else
        closed_state="$(echo "$CLOSED_JSON" | jq -r --argjson n "$pr_num" '.[] | select(.number == $n) | .state' 2>/dev/null || true)"
        if [[ "$closed_state" == "CLOSED" && "$required" != "true" ]]; then
          BASE="$(echo "$BASE" | jq --arg s "$pp" '.steps[$s] = {status: "superseded", pr: null, merged_at: null}')"
        fi
      fi
    fi
  done
  # Resolve current post-program step.
  CURRENT_STEP="done"
  for pp in $(jq -r '.post_program.steps | to_entries | sort_by(.key) | .[].key' "$CONFIG_FILE"); do
    status="$(echo "$BASE" | jq -r --arg s "$pp" '.steps[$s].status')"
    required="$(jq -r --arg s "$pp" '.post_program.steps[$s].required // false' "$CONFIG_FILE")"
    opt="$(jq -r --arg s "$pp" '.post_program.steps[$s].status // empty' "$CONFIG_FILE")"
    if [[ "$status" == "pending" && "$required" == "true" ]]; then
      CURRENT_STEP="$pp"
      break
    fi
    if [[ "$status" == "pending" && "$required" != "true" && "$opt" == "superseded" ]]; then
      CURRENT_STEP="$pp"
      break
    fi
  done
  # If all required merged, advance to done.
  pending_required="$(echo "$BASE" | jq -r '
    [. as $root | keys[] | select(startswith("pp")) | . as $s |
      select($root.steps[$s].status == "pending")] | length
  ' 2>/dev/null || echo 0)"
  all_required_merged=true
  while IFS= read -r pp; do
    [[ -z "$pp" ]] && continue
    st="$(echo "$BASE" | jq -r --arg s "$pp" '.steps[$s].status')"
    if [[ "$st" != "merged" ]]; then
      all_required_merged=false
      break
    fi
  done < <(jq -r '.post_program.steps | to_entries[] | select(.value.required == true) | .key' "$CONFIG_FILE")
  if $all_required_merged; then
    CURRENT_STEP="done"
  fi
fi

BASE="$(echo "$BASE" | jq \
  --arg phase "$PHASE" \
  --arg current "$CURRENT_STEP" \
  --arg synced "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '.phase = $phase | .current_step = $current | .synced_at = $synced')"

if $DRY_RUN; then
  echo "$BASE" | jq .
  exit 0
fi

mkdir -p "$(dirname "$STATE_FILE")"
echo "$BASE" | jq . > "$STATE_FILE"
echo "==> Wrote $STATE_FILE (phase=$PHASE, current_step=$CURRENT_STEP)"