#!/usr/bin/env bash
set -euo pipefail

# create-new-feature.sh
# Creates a new feature branch and initializes the spec structure.
#
# Usage:
#   ./create-new-feature.sh --json "Feature description" --number N --short-name "short-name"

JSON_OUTPUT=false
NUMBER=""
SHORT_NAME=""
DESCRIPTION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    --number)
      NUMBER="$2"
      shift 2
      ;;
    --short-name)
      SHORT_NAME="$2"
      shift 2
      ;;
    *)
      DESCRIPTION="$1"
      shift
      ;;
  esac
done

if [[ -z "$NUMBER" || -z "$SHORT_NAME" ]]; then
  echo "Error: --number and --short-name are required" >&2
  exit 1
fi

BRANCH_NAME="${NUMBER}-${SHORT_NAME}"
FEATURE_DIR="specs/${BRANCH_NAME}"
SPEC_FILE="${FEATURE_DIR}/spec.md"

# Create the feature branch from main
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Create directory structure
mkdir -p "${FEATURE_DIR}/checklists"

# Create initial spec file placeholder
cat > "$SPEC_FILE" << 'EOF'
<!-- Specification will be written by speckit.specify -->
EOF

if [[ "$JSON_OUTPUT" == "true" ]]; then
  cat <<JSONEOF
{
  "BRANCH_NAME": "${BRANCH_NAME}",
  "FEATURE_DIR": "${FEATURE_DIR}",
  "SPEC_FILE": "${SPEC_FILE}",
  "DESCRIPTION": "${DESCRIPTION}"
}
JSONEOF
fi
