#!/bin/bash
# SEVA VAANI - Start FastAPI Backend Server
set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Check if port 8000 is occupied
EXISTING_PID=$(lsof -ti :8000 || true)
if [ -n "$EXISTING_PID" ]; then
  echo "Notice: Port 8000 is currently occupied by PID(s): $EXISTING_PID"
  echo "Reusing/restarting backend process..."
  kill -9 $EXISTING_PID 2>/dev/null || true
  sleep 1
fi

export PYTHONPATH="$ROOT_DIR/backend:$PYTHONPATH"
echo "🚀 Starting SEVA VAANI Backend at http://127.0.0.1:8000..."
exec "$ROOT_DIR/backend/venv/bin/python3" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
