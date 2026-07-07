#!/usr/bin/env bash
# Trigger staging agent-awareness push for Maestro / manual E2E (QA-010).
set -euo pipefail

RELAY_STAGING_URL="${RELAY_STAGING_URL:-}"
RELAY_STAGING_TEST_SECRET="${RELAY_STAGING_TEST_SECRET:-}"
RELAY_TEST_DEVICE_ID="${RELAY_TEST_DEVICE_ID:-}"
RELAY_TEST_ENVIRONMENT_ID="${RELAY_TEST_ENVIRONMENT_ID:-}"
RELAY_TEST_THREAD_ID="${RELAY_TEST_THREAD_ID:-maestro-test-thread}"
RELAY_TEST_PHASE="${RELAY_TEST_PHASE:-waiting_for_approval}"

missing=()
[[ -z "$RELAY_STAGING_URL" ]] && missing+=("RELAY_STAGING_URL")
[[ -z "$RELAY_STAGING_TEST_SECRET" ]] && missing+=("RELAY_STAGING_TEST_SECRET")
[[ -z "$RELAY_TEST_DEVICE_ID" ]] && missing+=("RELAY_TEST_DEVICE_ID")
[[ -z "$RELAY_TEST_ENVIRONMENT_ID" ]] && missing+=("RELAY_TEST_ENVIRONMENT_ID")

if ((${#missing[@]} > 0)); then
  echo "seed-relay-push: missing required environment variables:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo "See scratch/android-parity/STAGING-RUNBOOK.md" >&2
  exit 1
fi

endpoint="${RELAY_STAGING_URL%/}/v1/staging/test/agent-push"
payload="$(jq -nc \
  --arg deviceId "$RELAY_TEST_DEVICE_ID" \
  --arg environmentId "$RELAY_TEST_ENVIRONMENT_ID" \
  --arg threadId "$RELAY_TEST_THREAD_ID" \
  --arg phase "$RELAY_TEST_PHASE" \
  '{deviceId:$deviceId, environmentId:$environmentId, threadId:$threadId, phase:$phase}')"

echo "seed-relay-push: POST $endpoint (device=$RELAY_TEST_DEVICE_ID phase=$RELAY_TEST_PHASE)"

response="$(curl -fsS \
  -X POST "$endpoint" \
  -H "content-type: application/json" \
  -H "x-relay-staging-test-secret: $RELAY_STAGING_TEST_SECRET" \
  --data "$payload")"

echo "$response" | jq .

if ! echo "$response" | jq -e '.ok == true' >/dev/null; then
  echo "seed-relay-push: relay staging test hook returned unexpected payload" >&2
  exit 1
fi