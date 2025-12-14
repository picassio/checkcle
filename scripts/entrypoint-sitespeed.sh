#!/bin/bash
set -e

# CheckCle entrypoint with sitespeed.io support
# This script starts XVFB, PocketBase, and the service-operation

echo "=========================================="
echo "CheckCle with sitespeed.io integration"
echo "=========================================="

# Start XVFB for headless browser support
echo "[ENTRYPOINT] Starting Xvfb..."
# Clean up any stale lock files from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
XVFB_PID=$!
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 2

# Verify Xvfb is running
if ! kill -0 $XVFB_PID 2>/dev/null; then
    echo "[ENTRYPOINT] ERROR: Xvfb failed to start"
    exit 1
fi
echo "[ENTRYPOINT] Xvfb started successfully (PID: $XVFB_PID)"

# Verify browsers are available
echo "[ENTRYPOINT] Checking browser installations..."
if command -v google-chrome &> /dev/null; then
    echo "[ENTRYPOINT] Chrome: $(google-chrome --version)"
else
    echo "[ENTRYPOINT] WARNING: Chrome not found"
fi

if command -v firefox &> /dev/null; then
    echo "[ENTRYPOINT] Firefox: $(firefox --version 2>/dev/null || echo 'version check failed')"
else
    echo "[ENTRYPOINT] WARNING: Firefox not found"
fi

if command -v microsoft-edge &> /dev/null; then
    echo "[ENTRYPOINT] Edge: $(microsoft-edge --version)"
else
    echo "[ENTRYPOINT] WARNING: Edge not found"
fi

# Verify sitespeed.io is available
if command -v sitespeed.io &> /dev/null; then
    echo "[ENTRYPOINT] sitespeed.io: $(sitespeed.io --version)"
else
    echo "[ENTRYPOINT] ERROR: sitespeed.io not found"
    exit 1
fi

# Apply database migrations before starting
echo "[ENTRYPOINT] Applying database migrations..."
/app/pocketbase migrate up --dir /mnt/pb_data --migrationsDir /app/pb_migrations 2>&1 || true

# Start PocketBase in background
echo "[ENTRYPOINT] Starting PocketBase..."
/app/pocketbase serve --http=0.0.0.0:8090 --dir=/mnt/pb_data --migrationsDir=/app/pb_migrations &
PB_PID=$!

# Wait for PocketBase to be ready
sleep 3

# Verify PocketBase is running
if ! kill -0 $PB_PID 2>/dev/null; then
    echo "[ENTRYPOINT] ERROR: PocketBase failed to start"
    exit 1
fi
echo "[ENTRYPOINT] PocketBase started successfully (PID: $PB_PID)"

# Handle shutdown gracefully
cleanup() {
    echo "[ENTRYPOINT] Shutting down..."
    kill $PB_PID 2>/dev/null || true
    kill $XVFB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start service-operation (foreground)
echo "[ENTRYPOINT] Starting service-operation..."
exec /app/service-operation
