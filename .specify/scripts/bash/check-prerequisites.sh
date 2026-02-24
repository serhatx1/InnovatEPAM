#!/usr/bin/env bash
set -euo pipefail

JSON=false
PATHS_ONLY=false
REQUIRE_TASKS=false
INCLUDE_TASKS=false

for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    --paths-only|-PathsOnly) PATHS_ONLY=true ;;
    --require-tasks) REQUIRE_TASKS=true ;;
    --include-tasks) INCLUDE_TASKS=true ;;
  esac
done

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SPECS_DIR="$ROOT_DIR/specs"

if [[ ! -d "$SPECS_DIR" ]]; then
  echo "Specs directory not found: $SPECS_DIR" >&2
  exit 1
fi

choose_feature_dir() {
  if [[ -n "${FEATURE_DIR:-}" && -d "$FEATURE_DIR" ]]; then
    echo "$FEATURE_DIR"
    return 0
  fi

  local branch
  branch="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if [[ -n "$branch" && -d "$SPECS_DIR/$branch" ]]; then
    echo "$SPECS_DIR/$branch"
    return 0
  fi

  local selected=""
  while IFS= read -r dir; do
    [[ -z "$dir" ]] && continue
    if [[ "$REQUIRE_TASKS" == "true" && ! -f "$dir/tasks.md" ]]; then
      continue
    fi
    selected="$dir"
  done < <(find "$SPECS_DIR" -mindepth 1 -maxdepth 1 -type d | sort -V)

  if [[ -z "$selected" ]]; then
    selected="$(find "$SPECS_DIR" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
  fi

  echo "$selected"
}

FEATURE_DIR="$(choose_feature_dir)"
if [[ -z "$FEATURE_DIR" || ! -d "$FEATURE_DIR" ]]; then
  echo "No feature directory found under $SPECS_DIR" >&2
  exit 1
fi

FEATURE_SPEC="$FEATURE_DIR/spec.md"
[[ -f "$FEATURE_SPEC" ]] || { echo "Missing spec file: $FEATURE_SPEC" >&2; exit 1; }

IMPL_PLAN="$FEATURE_DIR/impl-plan.md"
if [[ ! -f "$IMPL_PLAN" && -f "$FEATURE_DIR/plan.md" ]]; then
  IMPL_PLAN="$FEATURE_DIR/plan.md"
fi

TASKS="$FEATURE_DIR/tasks.md"
if [[ "$REQUIRE_TASKS" == "true" && ! -f "$TASKS" ]]; then
  echo "Missing required tasks file: $TASKS" >&2
  exit 1
fi

AVAILABLE_DOCS=()
[[ -f "$FEATURE_SPEC" ]] && AVAILABLE_DOCS+=("spec.md")
[[ -f "$IMPL_PLAN" ]] && AVAILABLE_DOCS+=("impl-plan.md")
[[ -f "$FEATURE_DIR/plan.md" ]] && AVAILABLE_DOCS+=("plan.md")
[[ -f "$FEATURE_DIR/tasks.md" ]] && AVAILABLE_DOCS+=("tasks.md")
[[ -f "$FEATURE_DIR/research.md" ]] && AVAILABLE_DOCS+=("research.md")
[[ -f "$FEATURE_DIR/data-model.md" ]] && AVAILABLE_DOCS+=("data-model.md")
[[ -f "$FEATURE_DIR/quickstart.md" ]] && AVAILABLE_DOCS+=("quickstart.md")
[[ -d "$FEATURE_DIR/contracts" ]] && AVAILABLE_DOCS+=("contracts/")

if [[ "$INCLUDE_TASKS" == "true" && -f "$FEATURE_DIR/tasks.md" ]]; then
  if [[ ! " ${AVAILABLE_DOCS[*]} " =~ " tasks.md " ]]; then
    AVAILABLE_DOCS+=("tasks.md")
  fi
fi

if [[ "$JSON" == "true" ]]; then
  printf '{\n'
  printf '  "FEATURE_DIR": "%s",\n' "$FEATURE_DIR"
  printf '  "FEATURE_SPEC": "%s",\n' "$FEATURE_SPEC"
  printf '  "IMPL_PLAN": "%s",\n' "$IMPL_PLAN"
  printf '  "TASKS": "%s",\n' "$TASKS"
  printf '  "SPECS_DIR": "%s",\n' "$SPECS_DIR"
  printf '  "BRANCH": "%s",\n' "$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  printf '  "AVAILABLE_DOCS": ['
  for i in "${!AVAILABLE_DOCS[@]}"; do
    printf '"%s"' "${AVAILABLE_DOCS[$i]}"
    if [[ "$i" -lt $((${#AVAILABLE_DOCS[@]} - 1)) ]]; then
      printf ', '
    fi
  done
  printf ']\n'
  printf '}\n'
  exit 0
fi

if [[ "$PATHS_ONLY" == "true" ]]; then
  echo "$FEATURE_DIR"
  echo "$FEATURE_SPEC"
  exit 0
fi

echo "FEATURE_DIR=$FEATURE_DIR"
echo "FEATURE_SPEC=$FEATURE_SPEC"
echo "IMPL_PLAN=$IMPL_PLAN"
echo "TASKS=$TASKS"
