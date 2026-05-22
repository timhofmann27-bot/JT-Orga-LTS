#!/bin/bash

# Configuration
APP_NAME="JT-ORGA"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- Starting Deployment for $APP_NAME ---${NC}"

# Check for .env file and run setup if missing
if [ ! -f .env ]; then
    echo -e "${YELLOW}.env Datei fehlt. Starte automatisches Setup...${NC}"
    chmod +x setup.sh
    ./setup.sh
fi

# Ensure data directory exists with correct permissions
mkdir -p data
# chmod 777 data # Optional: Ensure docker user can write to it if needed

# Pull/Build and restart containers
echo "Building and starting containers..."
docker compose up -d --build

# Clean up old images to save space
echo "Cleaning up old images..."
docker image prune -f

echo "--- $APP_NAME deployed successfully! ---"
echo "App should be reachable at http://your-vps-ip:3000"
