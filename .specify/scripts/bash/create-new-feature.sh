#!/usr/bin/env bash
set -euo pipefail

JSON=false
NUMBER=""
SHORT_NAME=""
DESCRIPTION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON=true
      shift
      ;;
    --number)
      NUMBER="${2:-}"
      shift 2
      ;;
    --short-name)
      SHORT_NAME="${2:-}"
      shift 2
      ;;
    *)
      if [[ -z "$DESCRIPTION" ]]; then
        DESCRIPTION="$1"
      else
        DESCRIPTION="$DESCRIPTION $1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$DESCRIPTION" ]]; then
  echo "Feature description is required" >&2
  exit 1
fi

if [[ -z "$SHORT_NAME" ]]; then
  echo "--short-name is required" >&2
  exit 1
fi

if [[ -z "$NUMBER" ]]; then
  echo "--number is required" >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BRANCH_NAME="${NUMBER}-${SHORT_NAME}"
FEATURE_DIR="$ROOT_DIR/specs/$BRANCH_NAME"
SPEC_FILE="$FEATURE_DIR/spec.md"
TEMPLATE_FILE="$ROOT_DIR/.specify/templates/spec-template.md"

git -C "$ROOT_DIR" checkout -b "$BRANCH_NAME" >/dev/null 2>&1 || git -C "$ROOT_DIR" checkout "$BRANCH_NAME" >/dev/null 2>&1

mkdir -p "$FEATURE_DIR"
mkdir -p "$FEATURE_DIR/checklists"
mkdir -p "$FEATURE_DIR/contracts"

if [[ -f "$TEMPLATE_FILE" ]]; then
  cp "$TEMPLATE_FILE" "$SPEC_FILE"
else
  cat > "$SPEC_FILE" <<'EOF'
# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: "$ARGUMENTS"

## User Scenarios & Testing

## Functional Requirements

## Success Criteria

## Assumptions
EOF
fi

if [[ "$JSON" == "true" ]]; then
  printf '{\n'
  printf '  "BRANCH_NAME": "%s",\n' "$BRANCH_NAME"
  printf '  "SPEC_FILE": "%s",\n' "$SPEC_FILE"
  printf '  "FEATURE_DIR": "%s",\n' "$FEATURE_DIR"
  printf '  "DESCRIPTION": "%s"\n' "$DESCRIPTION"
  printf '}\n'
else
  echo "BRANCH_NAME=$BRANCH_NAME"
  echo "SPEC_FILE=$SPEC_FILE"
  echo "FEATURE_DIR=$FEATURE_DIR"
fi
