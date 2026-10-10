#!/bin/bash
# SEVA VAANI - Start React/Vite Frontend Server
set -e
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR/frontend"

echo "🚀 Starting SEVA VAANI Frontend at http://localhost:5173..."
exec npm run dev
