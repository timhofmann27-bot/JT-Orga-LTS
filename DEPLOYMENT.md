# 🚀 JT-ORGA Deployment Guide
## Hostinger VPS Docker Container Setup

---

## 📋 Voraussetzungen

- Hostinger VPS mit Ubuntu 20.04/22.04
- Domain oder Subdomain (optional)
- SSH-Zugang zum VPS
- Git installiert

---

## 🔧 SCHRITT 1: VPS Vorbereiten

### 1.1 SSH Verbindung herstellen
```bash
ssh root@deine-vps-ip
```

### 1.2 System aktualisieren
```bash
apt update && apt upgrade -y
```

### 1.3 Docker installieren
```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose installieren
apt install docker-compose-plugin -y

# Docker Benutzergruppe erstellen
usermod -aG docker $USER
```

**Wichtig:** Nach dem letzten Befehl einmal ausloggen und wieder einloggen!

```bash
exit
# Dann wieder einloggen
ssh root@deine-vps-ip
```

### 1.4 Docker testen
```bash
docker --version
docker compose version
```

---

## 📦 SCHRITT 2: Projekt Klonen

### 2.1 Repository klonen
```bash
cd /var/www
git clone https://github.com/timhofmann27-bot/JT-Orga.git jt-orga
cd jt-orga
```

### 2.2 Environment Datei erstellen
```bash
cp .env.example .env
nano .env
```

### 2.3 .env Datei bearbeiten

Füge deine secrets ein:
```bash
# JWT Secret (zufälligen String generieren)
JWT_SECRET=$(openssl rand -base64 32)

# In .env eintragen:
JWT_SECRET=dein_generierter_secret_hier

# Optional: Firebase für Push Notifications
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...

# Optional: Sentry für Error Tracking
VITE_SENTRY_DSN=https://...

# Server Config
PORT=3000
NODE_ENV=production
```

**Speichern:** STRG+O, ENTER, STRG+X

---

## 🐳 SCHRITT 3: Docker Setup

### 3.1 Dockerfile prüfen
Das Projekt enthält bereits ein `Dockerfile`. Inhalt sollte sein:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 3.2 Docker Compose prüfen
`docker-compose.yml` sollte existieren:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    networks:
      - jt-orga-network

networks:
  jt-orga-network:
    driver: bridge
```

### 3.3 Docker Build & Start
```bash
# Container bauen und starten
docker compose up -d --build
```

### 3.4 Logs prüfen
```bash
# Live Logs
docker compose logs -f

# Nur letzte 50 Zeilen
docker compose logs --tail=50
```

---

## 🌐 SCHRITT 4: Domain Einrichten (Optional)

### 4.1 DNS Record setzen
Bei Hostinger oder deinem Domain Provider:

```
Type: A
Name: @ oder subdomain
Value: deine-vps-ip
TTL: 3600
```

### 4.2 Warten bis DNS propagated (5-30 Min)
```bash
ping deine-domain.de
```

---

## 🔒 SCHRITT 5: SSL/HTTPS mit Caddy (Empfohlen)

### 5.1 Caddy Docker Container hinzufügen

`docker-compose.yml` erweitern:

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    depends_on:
      - app

  app:
    build: .
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    networks:
      - jt-orga-network

volumes:
  caddy_data:
  caddy_config:

networks:
  jt-orga-network:
    driver: bridge
```

### 5.2 Caddyfile erstellen
```bash
nano Caddyfile
```

Inhalt:
```caddy
deine-domain.de {
    reverse_proxy app:3000
}

www.deine-domain.de {
    redir https://deine-domain.de{uri}
}
```

**Speichern:** STRG+O, ENTER, STRG+X

### 5.3 Container neu starten
```bash
docker compose down
docker compose up -d --build
```

### 5.4 Caddy Logs prüfen
```bash
docker compose logs caddy
```

SSL Zertifikat wird automatisch erstellt!

---

## 🔥 SCHRITT 6: Firewall Einrichten

### 6.1 UFW installieren (falls nicht vorhanden)
```bash
apt install ufw -y
```

### 6.2 Firewall konfigurieren
```bash
# Standardmäßig alles blockieren
ufw default deny incoming
ufw default allow outgoing

# SSH erlauben
ufw allow 22/tcp

# HTTP/HTTPS erlauben
ufw allow 80/tcp
ufw allow 443/tcp

# Firewall aktivieren
ufw enable
```

### 6.3 Status prüfen
```bash
ufw status
```

---

## 📊 SCHRITT 7: Monitoring & Wartung

### 7.1 Container Status prüfen
```bash
docker compose ps
```

### 7.2 Logs anzeigen
```bash
# Alle Logs
docker compose logs

# Spezifischer Service
docker compose logs app

# Live
docker compose logs -f
```

### 7.3 Resource Usage
```bash
docker stats
```

---

## 🔄 SCHRITT 8: Updates Deployen

### 8.1 Update vom Git Repository
```bash
cd /var/www/jt-orga
git pull origin main
```

### 8.2 Container neu bauen & starten
```bash
docker compose down
docker compose up -d --build
```

### 8.3 Alte Images aufräumen
```bash
docker image prune -f
```

---

## 🆘 TROUBLESHOOTING

### Container startet nicht
```bash
# Logs prüfen
docker compose logs app

# Container neu starten
docker compose restart app

# Alles neu bauen
docker compose down
docker compose up -d --build --force-recreate
```

### Permission Errors
```bash
# Rechte setzen
chown -R 1000:1000 /var/www/jt-orga/data
chmod -R 755 /var/www/jt-orga
```

### Port bereits belegt
```bash
# Belegte Ports prüfen
netstat -tulpn | grep :3000

# Anderen Port in .env setzen
PORT=3001
```

### Database Connection Failed
```bash
# Data Volume prüfen
ls -la /var/www/jt-orga/data

# Rechte setzen
chown -R 1000:1000 /var/www/jt-orga/data
```

---

## 📧 NACH DEM DEPLOY

### 1. App testen
```
http://deine-vps-ip:3000
oder
https://deine-domain.de
```

### 2. Admin Login
- URL: `/login`
- Username: `admin`
- Passwort: (aus deiner Datenbank/Setup)

### 3. Erste Schritte
1. Admin Account erstellen
2. Erste Aktion/Event anlegen
3. Mitglieder einladen
4. Push Notifications testen

---

## 🔐 SICHERHEITSCHECKLISTE

- [ ] JWT_SECRET ist ein starker, zufälliger String
- [ ] Firewall ist aktiv (UFW)
- [ ] SSL/HTTPS ist eingerichtet (Caddy)
- [ ] Regelmäßige Updates (`apt update`)
- [ ] Docker Images aktuell halten
- [ ] `.env` Datei ist nicht im Git
- [ ] Database Backups einrichten
- [ ] Logs überwachen

---

## 📚 NÜTZLICHE BEFEHLE

```bash
# Alle Container anzeigen
docker ps -a

# Container stoppen
docker compose down

# Container starten
docker compose up -d

# Logs ansehen
docker compose logs -f

# Resource Usage
docker stats

# Alte Images löschen
docker image prune -a

# Database Backup
docker cp jt-orga-app-1:/app/data/jt-orga.db ./backup.db
```

---

## 🎉 FERTIG!

Deine JT-ORGA App läuft jetzt auf deinem Hostinger VPS in einem Docker Container!

**Support & Hilfe:**
- GitHub Issues: https://github.com/timhofmann27-bot/JT-Orga/issues
- Docker Docs: https://docs.docker.com
- Caddy Docs: https://caddyserver.com/docs

---

**Viel Erfolg! 🚀**
