#!/usr/bin/env bash
# Tier-1+ completion loop (t00–t20).
exec "$(dirname "$0")/run-loop.sh" --phase tier1_plus "$@"