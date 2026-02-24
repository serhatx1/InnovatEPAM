#!/usr/bin/env bash
set -euo pipefail

# update-agent-context.sh
# Updates the agent-specific context file with technology info from the current plan.
#
# Usage:
#   ./update-agent-context.sh copilot

AGENT="${1:-copilot}"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

case "$AGENT" in
  copilot)
    TARGET="$REPO_ROOT/.github/copilot-instructions.md"
    ;;
  *)
    echo "Unknown agent: $AGENT" >&2
    exit 1
    ;;
esac

# Create file if it doesn't exist
if [[ ! -f "$TARGET" ]]; then
  cat > "$TARGET" << 'EOF'
# Copilot Instructions

<!-- AUTO-GENERATED SECTION: DO NOT EDIT BETWEEN MARKERS -->
<!-- BEGIN SPECKIT CONTEXT -->
<!-- END SPECKIT CONTEXT -->

## Manual Instructions

Add any manual Copilot instructions below this line.
EOF
  echo "Created $TARGET"
else
  echo "Updated $TARGET"
fi

echo "Agent context file: $TARGET"
