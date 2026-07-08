#!/usr/bin/env bash
# Capture a full T3 Code Android UI screenshot tour for chat-based visual validation.
#
# Usage:
#   ./scripts/android-parity/run-screenshot-tour.sh [--skip-build] [--phone-only] [--tablet-only] [--theme light|dark|both]
#
# Output:
#   apps/mobile/screenshot-tour/output/<timestamp>/
#   apps/mobile/screenshot-tour/output/latest -> <timestamp>
#
# Upload to chat:
#   1. Attach all PNGs from the output folder (app UI only — Maestro crops to in-app roots).
#   2. Paste validation-prompt.txt (or report.json) so the reviewer knows what to check.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
# shellcheck source=scripts/android-parity/lib.sh
source "${ROOT}/scripts/android-parity/lib.sh"

SKIP_BUILD=false
PHONE_ONLY=false
TABLET_ONLY=false
THEME_MODE="light"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --phone-only)
      PHONE_ONLY=true
      shift
      ;;
    --tablet-only)
      TABLET_ONLY=true
      shift
      ;;
    --theme)
      THEME_MODE="${2:-light}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if $PHONE_ONLY && $TABLET_ONLY; then
  echo "Choose at most one of --phone-only or --tablet-only" >&2
  exit 1
fi

export APP_VARIANT=development
export EXPO_PUBLIC_MAESTRO_AUTH_BYPASS=1
export EXPO_NO_GIT_STATUS=1
export CI="${CI:-false}"
export APP_ID=com.t3tools.t3code.dev
export METRO_DEV_CLIENT_URL

PHONE_FLOW="apps/mobile/.maestro/flows/screenshot-tour-phone.yaml"
TABLET_FLOW="apps/mobile/.maestro/flows/screenshot-tour-tablet.yaml"
TABLET_RESIZE_SCRIPT="apps/mobile/.maestro/scripts/resize-tablet-emulator.sh"
MAESTRO_WORKSPACE="apps/mobile/.maestro"

log() {
  echo "==> $*" >&2
}

ensure_maestro() {
  if [[ -z "${JAVA_HOME:-}" ]]; then
    for candidate in /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-17-openjdk; do
      if [[ -d "${candidate}" ]]; then
        export JAVA_HOME="${candidate}"
        break
      fi
    done
  fi
  if command -v maestro >/dev/null 2>&1; then
    return
  fi
  log "Installing Maestro CLI"
  curl -Ls "https://get.maestro.mobile.dev" | bash
  export PATH="${HOME}/.maestro/bin:${PATH}"
}

ensure_google_services() {
  local target="apps/mobile/secrets/google-services.development.json"
  mkdir -p apps/mobile/secrets
  if [[ -n "${GOOGLE_SERVICES_JSON:-}" && -f "${GOOGLE_SERVICES_JSON}" ]]; then
    cp "${GOOGLE_SERVICES_JSON}" "${target}"
    return
  fi
  if [[ -f "${target}" ]]; then
    return
  fi
  log "Using CI stub google-services.json"
  cp scripts/android-parity/fixtures/google-services.ci.json "${target}"
}

wait_for_android_device() {
  select_android_device
  METRO_DEV_CLIENT_URL="$(resolve_metro_dev_client_url)"
  export METRO_DEV_CLIENT_URL
  log "Metro dev-client URL: ${METRO_DEV_CLIENT_URL}"
  log "Waiting for device ${ANDROID_SERIAL}"
  adb wait-for-device
  local booted=""
  for _ in $(seq 1 60); do
    booted="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "${booted}" == "1" ]]; then
      break
    fi
    sleep 2
  done
  adb shell settings put global animator_duration_scale 0 >/dev/null 2>&1 || true
  adb shell settings put global transition_animation_scale 0 >/dev/null 2>&1 || true
  adb shell settings put global window_animation_scale 0 >/dev/null 2>&1 || true
  log "Reverse Metro port 8081 for dev client"
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  prepare_android_device_ui
}

set_ui_theme() {
  local theme="$1"
  case "${theme}" in
    dark)
      adb shell cmd uimode night yes >/dev/null 2>&1 || adb shell "settings put system ui_night_mode 2" >/dev/null 2>&1 || true
      ;;
    light)
      adb shell cmd uimode night no >/dev/null 2>&1 || adb shell "settings put system ui_night_mode 1" >/dev/null 2>&1 || true
      ;;
    *)
      echo "Unsupported theme: ${theme}" >&2
      exit 1
      ;;
  esac
}

build_dev_client_apk() {
  log "Prebuild Android (development)"
  (
    cd apps/mobile
    node scripts/with-android-env.mjs bunx expo prebuild --platform android --clean
  )

  local arch=""
  arch="$(android_gradle_architectures)"
  log "Assemble debug APK (${arch} for ${ANDROID_SERIAL})"
  (
    cd apps/mobile
    node scripts/with-android-env.mjs sh -c "chmod +x android/gradlew && cd android && ./gradlew assembleDebug -x lint --no-daemon -PreactNativeArchitectures=${arch}"
  )

  local apk=""
  apk="$(find apps/mobile/android/app/build/outputs/apk -name '*-debug.apk' -print -quit)"
  if [[ -z "${apk}" ]]; then
    echo "Could not find debug APK" >&2
    exit 1
  fi
  echo "${apk}"
}

install_apk() {
  install_apk_main_profile "$1"
}

start_metro() {
  if curl -fsS "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
    log "Reusing Metro on :8081"
    return
  fi

  log "Starting Metro dev client"
  (
    cd apps/mobile
    APP_VARIANT=development \
      EXPO_PUBLIC_MAESTRO_AUTH_BYPASS=1 \
      T3CODE_RELAY_URL="${T3CODE_RELAY_URL:-https://relay.example.test}" \
      CI=1 \
      bunx expo start --dev-client --scheme t3code-dev
  ) &
  METRO_PID=$!
  trap 'kill "${METRO_PID}" 2>/dev/null || true' EXIT

  for _ in $(seq 1 90); do
    if curl -fsS "http://127.0.0.1:8081/status" >/dev/null 2>&1; then
      log "Metro ready"
      return
    fi
    sleep 2
  done
  echo "Metro did not become ready on :8081" >&2
  exit 1
}

prepare_tablet_viewport() {
  chmod +x "${TABLET_RESIZE_SCRIPT}"
  log "Resize emulator for tablet split (1280x800)"
  "${TABLET_RESIZE_SCRIPT}"
}

reset_emulator_viewport() {
  adb shell wm size reset >/dev/null 2>&1 || true
}

connect_dev_client_bundle() {
  log "Prime dev-client Metro connection"
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  adb shell am start -a android.intent.action.VIEW -d "${METRO_DEV_CLIENT_URL}" >/dev/null 2>&1 || true
  sleep 12
}

run_theme_pass() {
  local theme="$1"
  local output_dir="$2"
  local screenshot_prefix=""
  if [[ "${theme}" != "light" ]]; then
    screenshot_prefix="${theme}-"
  fi

  set_ui_theme "${theme}"
  sleep 1

  local maestro_out="${ROOT}/${output_dir}/maestro-${theme}"
  mkdir -p "${maestro_out}"

  local maestro_args=(
    --device "${ANDROID_SERIAL}"
    --config "${ROOT}/${MAESTRO_WORKSPACE}/config.yaml"
    --test-output-dir "${maestro_out}"
    -e "APP_ID=${APP_ID}"
    -e "SCREENSHOT_PREFIX=${screenshot_prefix}"
    -e "METRO_DEV_CLIENT_URL=${METRO_DEV_CLIENT_URL}"
  )

  connect_dev_client_bundle

  if ! $TABLET_ONLY; then
    log "Maestro phone screenshot tour (${theme}) on ${ANDROID_SERIAL}"
    maestro test "${maestro_args[@]}" "${ROOT}/${PHONE_FLOW}"
  fi

  if ! $PHONE_ONLY; then
    prepare_tablet_viewport
    log "Maestro tablet screenshot tour (${theme}) on ${ANDROID_SERIAL}"
    maestro test "${maestro_args[@]}" "${ROOT}/${TABLET_FLOW}"
    reset_emulator_viewport
  fi

  # Flatten Maestro PNG artifacts into the output root.
  while IFS= read -r png; do
    cp "${png}" "${output_dir}/$(basename "${png}")"
  done < <(find "${maestro_out}" -name '*.png' -type f | sort)
}

main() {
  ensure_maestro
  ensure_google_services
  wait_for_android_device

  if ! $SKIP_BUILD; then
    local apk
    apk="$(build_dev_client_apk)"
    install_apk "${apk}"
  fi

  start_metro

  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local output_dir="apps/mobile/screenshot-tour/output/${stamp}"
  mkdir -p "${output_dir}"

  case "${THEME_MODE}" in
    both)
      run_theme_pass light "${output_dir}"
      run_theme_pass dark "${output_dir}"
      ;;
    light | dark)
      run_theme_pass "${THEME_MODE}" "${output_dir}"
      ;;
    *)
      echo "Unsupported --theme value: ${THEME_MODE}" >&2
      exit 1
      ;;
  esac

  cat > "${output_dir}/run-meta.json" <<EOF
{
  "timestamp": "${stamp}",
  "theme": "${THEME_MODE}",
  "appId": "${APP_ID}",
  "phoneOnly": ${PHONE_ONLY},
  "tabletOnly": ${TABLET_ONLY},
  "skipBuild": ${SKIP_BUILD}
}
EOF

  node scripts/android-parity/build-screenshot-report.mjs "${output_dir}" || true

  ln -sfn "${stamp}" apps/mobile/screenshot-tour/output/latest

  log "Screenshot tour complete"
  echo ""
  echo "Output: ${output_dir}"
  echo "Latest: apps/mobile/screenshot-tour/output/latest"
  echo ""
  echo "Upload to chat:"
  echo "  1. Attach every .png in ${output_dir}"
  echo "  2. Paste ${output_dir}/validation-prompt.txt"
  echo "  3. Ask: validate each screen against expectations; list failures by screenshot id"
  echo ""
  ls -1 "${output_dir}"/*.png 2>/dev/null || true
}

main "$@"