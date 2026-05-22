#!/bin/bash
set -euo pipefail

# JT Orga - Sicheres Deploy-Skript
# Funktioniert mit compose.yaml oder docker-compose.yml

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE=""
BACKUP_DIR="$APP_DIR/backups"
DATA_DIR="$APP_DIR/data"

echo "=========================================="
echo "  JT Orga - Sicheres Deploy"
echo "=========================================="

# 1. Prüfe ob compose.yaml oder docker-compose.yml existiert
if [ -f "$APP_DIR/compose.yaml" ]; then
  COMPOSE_FILE="$APP_DIR/compose.yaml"
elif [ -f "$APP_DIR/docker-compose.yml" ]; then
  COMPOSE_FILE="$APP_DIR/docker-compose.yml"
elif [ -f "$APP_DIR/docker-compose.yaml" ]; then
  COMPOSE_FILE="$APP_DIR/docker-compose.yaml"
else
  echo "FEHLER: Keine compose.yaml oder docker-compose.yml gefunden!"
  exit 1
fi

echo "Compose-Datei: $COMPOSE_FILE"

# 2. Prüfe ob .env existiert
if [ ! -f "$APP_DIR/.env" ]; then
  echo "WARNUNG: .env nicht gefunden! Stelle sicher, dass Umgebungsvariablen gesetzt sind."
  echo "         Benötigt: JWT_SECRET, VITE_GOOGLE_CLIENT_ID (optional), GEMINI_API_KEY (optional)"
  read -p "Trotzdem fortfahren? (j/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    exit 1
  fi
fi

# 3. Backup der Datenbank
if [ -f "$DATA_DIR/data.db" ]; then
  echo ""
  echo "Erstelle Datenbank-Backup..."
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/data-$TIMESTAMP.db"
  cp "$DATA_DIR/data.db" "$BACKUP_FILE"
  echo "Backup erstellt: $BACKUP_FILE"

  # Alte Backups aufräumen (nur die letzten 10 behalten)
  ls -t "$BACKUP_DIR"/data-*.db 2>/dev/null | tail -n +11 | xargs -r rm -f
  echo "Alte Backups aufgeräumt (max. 10 behalten)"
else
  echo "WARNUNG: Keine data.db gefunden. Ist dies das erste Deploy?"
fi

# 4. Git Pull (Code aktualisieren)
echo ""
echo "Hole neuesten Code von GitHub..."
cd "$APP_DIR"
git pull origin main

# 5. Docker Compose neu bauen und starten
echo ""
echo "Baue und starte Container neu..."
docker compose -f "$COMPOSE_FILE" down
docker compose -f "$COMPOSE_FILE" up --build -d

# 6. Warte auf Healthcheck
echo ""
echo "Warte auf App-Start (max. 60 Sekunden)..."
for i in {1..60}; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "App läuft! Healthcheck erfolgreich."
    break
  fi
  if [ $i -eq 60 ]; then
    echo "WARNUNG: Healthcheck hat nicht innerhalb von 60 Sekunden geantwortet."
    echo "Prüfe die Logs: docker compose -f $COMPOSE_FILE logs jt-orga"
    exit 1
  fi
  sleep 1
done

# 7. Aufräumen alter Docker Images
echo ""
echo "Räume alte Docker Images auf..."
docker image prune -f

echo ""
echo "=========================================="
echo "  Deploy erfolgreich!"
echo "=========================================="
echo "App läuft unter: https://$(grep -E '^\s+[a-z0-9.-]+\s*\{' "$COMPOSE_FILE" -A 100 | grep -oP '(?<=\s)[a-z0-9.-]+\.[a-z]+' | head -1 || echo 'deine-domain.de')"
echo "Datenbank-Backup: $BACKUP_FILE"
echo ""
