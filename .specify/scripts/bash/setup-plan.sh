#!/usr/bin/env bash
set -euo pipefail

JSON=false
for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
  esac
done

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

PREREQ_JSON="$ROOT_DIR/.specify/scripts/bash/check-prerequisites.sh --json"
RAW="$($PREREQ_JSON)"

extract_json_value() {
  local key="$1"
  echo "$RAW" | sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -n 1
}

FEATURE_DIR="$(extract_json_value FEATURE_DIR)"
FEATURE_SPEC="$(extract_json_value FEATURE_SPEC)"
IMPL_PLAN="$(extract_json_value IMPL_PLAN)"
SPECS_DIR="$(extract_json_value SPECS_DIR)"

if [[ -z "$IMPL_PLAN" ]]; then
  IMPL_PLAN="$FEATURE_DIR/impl-plan.md"
fi

if [[ "$JSON" == "true" ]]; then
  printf '{\n'
  printf '  "FEATURE_SPEC": "%s",\n' "$FEATURE_SPEC"
  printf '  "IMPL_PLAN": "%s",\n' "$IMPL_PLAN"
  printf '  "SPECS_DIR": "%s",\n' "$SPECS_DIR"
  printf '  "BRANCH": "%s"\n' "$BRANCH"
  printf '}\n'
  exit 0
fi

echo "FEATURE_SPEC=$FEATURE_SPEC"
echo "IMPL_PLAN=$IMPL_PLAN"
echo "SPECS_DIR=$SPECS_DIR"
echo "BRANCH=$BRANCH"
