#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
for i in {1..60}; do
  echo "Attempt $i: Testing MySQL connection..."
  if mysqladmin ping -h mysql -u root -p"$MYSQL_ROOT_PASSWORD" --skip-ssl --silent; then
    echo "MySQL is ready!"
    break
  fi
  echo "Waiting for MySQL... (attempt $i/60)"
  sleep 2
done

# Check if we exited the loop without breaking
if [ $i -eq 60 ]; then
  echo "ERROR: MySQL did not become ready in time"
  exit 1
fi

echo "MySQL is ready, starting application..."

# Run the application
exec "$@"