#!/usr/bin/env bash
# Resize the booted Android emulator to a tablet split viewport (AND-003 / TAB-001).
set -euo pipefail

TABLET_WIDTH="${MAESTRO_TABLET_WIDTH:-1280}"
TABLET_HEIGHT="${MAESTRO_TABLET_HEIGHT:-800}"

adb shell wm size "${TABLET_WIDTH}x${TABLET_HEIGHT}"