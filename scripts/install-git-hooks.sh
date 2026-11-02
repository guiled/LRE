#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="${ROOT}/.git/hooks"
SOURCE="${ROOT}/scripts/git-hooks/pre-push"
TARGET="${HOOKS_DIR}/pre-push"

if [[ ! -d "${ROOT}/.git" ]]; then
  echo "Not a git repository; skipping git hook install." >&2
  exit 0
fi

mkdir -p "${HOOKS_DIR}"
ln -sf "../../scripts/git-hooks/pre-push" "${TARGET}"
chmod +x "${SOURCE}"

echo "Installed pre-push hook -> scripts/git-hooks/pre-push"
