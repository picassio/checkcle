#!/bin/sh

echo "Running on architecture: $(uname -m)"

# Copy PocketBase data if empty
if [ ! -f /mnt/pb_data/data.db ] && [ -d /app/pb_data ] && [ "$(ls -A /app/pb_data)" ]; then
  cp -a /app/pb_data/. /mnt/pb_data/
fi

# Apply database migrations before starting
echo "Applying database migrations..."
/app/pocketbase migrate up --dir /mnt/pb_data --migrationsDir /app/pb_migrations 2>&1 || true

# Start PocketBase in the background
echo "Starting CheckCle Application..."
/app/pocketbase serve --http=0.0.0.0:8090 --dir /mnt/pb_data 2>&1 | grep -vE 'REST API|Dashboard' &

# Wait for PocketBase to become available
echo "Waiting for Backend Server to become available..."
until curl -s http://localhost:8090/api/health >/dev/null; do
  echo "Waiting on http://localhost:8090..."
  sleep 1
done

echo "Backend Server is up!"

# Start Go service
echo "Starting Go Operational service..."
/app/service-operation &

echo "Default Access: admin@example.com/Admin123456"
# Keep container alive
wait
