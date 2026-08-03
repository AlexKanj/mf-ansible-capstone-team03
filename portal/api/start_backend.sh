#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f ".venv/bin/activate" ]]; then
  echo "Missing virtual environment: .venv/bin/activate" >&2
  exit 1
fi

if [[ ! -f ".env.local" ]]; then
  echo "Missing local environment file: .env.local" >&2
  exit 1
fi

source .venv/bin/activate
set -a
source .env.local
set +a

exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
