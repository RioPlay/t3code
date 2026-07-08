#!/usr/bin/env bash
# Shared helpers for Android parity / Maestro runners.

if ! declare -f log >/dev/null 2>&1; then
  log() {
    echo "==> $*" >&2
  }
fi

is_android_emulator() {
  [[ "${1}" == emulator-* ]]
}

# Pick adb target. Physical USB devices win over local emulators unless ANDROID_USE_EMULATOR=1
# or ANDROID_SERIAL is already set.
select_android_device() {
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    export ANDROID_SERIAL
    log "Using ANDROID_SERIAL=${ANDROID_SERIAL}"
    return
  fi

  local devices=()
  while IFS= read -r serial; do
    [[ -z "${serial}" ]] && continue
    devices+=("${serial}")
  done < <(adb devices 2>/dev/null | awk 'NR > 1 && $2 == "device" { print $1 }')

  if ((${#devices[@]} == 0)); then
    echo "No Android devices connected" >&2
    exit 1
  fi

  if ((${#devices[@]} == 1)); then
    export ANDROID_SERIAL="${devices[0]}"
    log "Using device ${ANDROID_SERIAL}"
    return
  fi

  if [[ "${ANDROID_USE_EMULATOR:-}" == "1" ]]; then
    local serial=""
    for serial in "${devices[@]}"; do
      if is_android_emulator "${serial}"; then
        export ANDROID_SERIAL="${serial}"
        log "ANDROID_USE_EMULATOR=1; using emulator ${ANDROID_SERIAL}"
        return
      fi
    done
  fi

  local serial=""
  for serial in "${devices[@]}"; do
    if ! is_android_emulator "${serial}"; then
      export ANDROID_SERIAL="${serial}"
      log "Multiple devices connected; using physical device ${ANDROID_SERIAL}"
      return
    fi
  done

  export ANDROID_SERIAL="${devices[0]}"
  log "Using device ${ANDROID_SERIAL}"
}

# Gradle -PreactNativeArchitectures for the selected device class.
android_gradle_architectures() {
  if [[ -n "${ANDROID_NATIVE_ARCHITECTURES:-}" ]]; then
    echo "${ANDROID_NATIVE_ARCHITECTURES}"
    return
  fi
  if is_android_emulator "${ANDROID_SERIAL:-}"; then
    echo "x86_64"
    return
  fi
  echo "arm64-v8a"
}

# Primary personal profile user id (skips work / managed profiles).
# Override with ANDROID_INSTALL_USER when needed.
android_main_user_id() {
  if [[ -n "${ANDROID_INSTALL_USER:-}" ]]; then
    echo "${ANDROID_INSTALL_USER}"
    return
  fi

  local users=""
  users="$(adb shell pm list users 2>/dev/null | tr -d '\r' || true)"

  # Stock Android personal profile is user 0 ("Owner" on Pixel).
  local owner=""
  owner="$(printf '%s\n' "${users}" | sed -nE 's/.*UserInfo\{([0-9]+):Owner:.*/\1/p' | head -n 1)"
  if [[ -n "${owner}" ]]; then
    echo "${owner}"
    return
  fi

  local primary=""
  primary="$(
    printf '%s\n' "${users}" | sed -nE 's/.*UserInfo\{([0-9]+):[^}]*:(PRIMARY|OWNER).*/\1/p' | head -n 1
  )"
  if [[ -n "${primary}" ]]; then
    echo "${primary}"
    return
  fi

  echo 0
}

install_apk_main_profile() {
  local apk="$1"
  local user_id=""
  user_id="$(android_main_user_id)"
  log "Installing ${apk} to main profile (user ${user_id})"
  adb install -r --user "${user_id}" "${apk}"
}

# Wake the screen and dismiss keyguard so Maestro can interact with the foreground app.
prepare_android_device_ui() {
  adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
  adb shell wm dismiss-keyguard >/dev/null 2>&1 || true
}

resolve_metro_bundle_url() {
  if [[ -n "${METRO_BUNDLE_URL:-}" ]]; then
    echo "${METRO_BUNDLE_URL}"
    return
  fi
  # adb reverse (set in wait_for_android_device) exposes host Metro as 127.0.0.1 on device.
  echo "http://127.0.0.1:8081"
}

resolve_metro_dev_client_url() {
  if [[ -n "${METRO_DEV_CLIENT_URL:-}" ]]; then
    echo "${METRO_DEV_CLIENT_URL}"
    return
  fi
  local bundle_url=""
  bundle_url="$(resolve_metro_bundle_url)"
  python3 -c "import urllib.parse; print('exp+t3-code://expo-development-client/?url=' + urllib.parse.quote('${bundle_url}', safe=''))"
}