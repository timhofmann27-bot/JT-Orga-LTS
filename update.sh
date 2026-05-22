#!/bin/bash

# Beende das Skript sofort, falls ein Fehler auftritt
set -e

echo "🔄 Starte Update-Prozess..."

# 1. Neueste Änderungen vom Git-Repository abrufen
# (Passe 'main' an, falls dein Haupt-Branch 'master' heißt)
echo "📥 Lade neueste Änderungen von Git herunter..."
git pull origin main

# 2. Docker Container neu bauen und starten
# WICHTIG: Da in der docker-compose.yml das Volume "./data:/app/data" 
# definiert ist, bleibt die SQLite-Datenbank (data.db) sicher erhalten!
echo "🏗️ Baue und starte Docker-Container neu..."
docker-compose up --build -d

# 3. Alte, ungenutzte Docker-Images aufräumen (spart Speicherplatz auf dem Server)
echo "🧹 Räume alte Docker-Images auf..."
docker image prune -f

echo "✅ Update erfolgreich abgeschlossen! Die Anwendung läuft mit dem neuesten Code."
