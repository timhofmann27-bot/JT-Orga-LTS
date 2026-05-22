#!/bin/bash

# JT-ORGA Automated Environment Setup
# This script prepares the .env file with secure defaults.

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}--- JT-ORGA Environment Setup ---${NC}"

# 1. Check if .env already exists
if [ -f .env ]; then
    echo -e "${YELLOW}Hinweis: Eine .env Datei existiert bereits.${NC}"
    read -p "Möchtest du sie überschreiben? (y/n): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        echo "Setup abgebrochen. Bestehende .env wird beibehalten."
        exit 0
    fi
fi

# 2. Copy from example
echo "Erstelle .env aus .env.example..."
cp .env.example .env

# 3. Generate a secure JWT Secret
echo "Generiere sicheres JWT_SECRET..."
# Using openssl for hex generation, falling back to /dev/urandom if needed
if command -v openssl >/dev/null 2>&1; then
    NEW_JWT_SECRET=$(openssl rand -hex 32)
else
    NEW_JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
fi

# Use sed to replace the placeholder
# Note: Using | as delimiter in case the secret contains /
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$NEW_JWT_SECRET|g" .env

# 4. Handle Admin Password
read -p "Gib ein Admin-Passwort ein (leer lassen für Zufallspasswort): " INPUT_PASS
if [ -z "$INPUT_PASS" ]; then
    if command -v openssl >/dev/null 2>&1; then
        INPUT_PASS=$(openssl rand -base64 12)
    else
        INPUT_PASS=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 12 | head -n 1)
    fi
    echo -e "${YELLOW}Generiertes Admin-Passwort: ${GREEN}$INPUT_PASS${NC}"
    echo "Bitte notiere dir dieses Passwort!"
fi

sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$INPUT_PASS|g" .env

# 5. Fix permissions for data folder
mkdir -p data
# chmod 777 data # Optional

echo -e "${GREEN}✔ .env Datei erfolgreich konfiguriert!${NC}"
echo "Du kannst jetzt ./deploy.sh ausführen."
