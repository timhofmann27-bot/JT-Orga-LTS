# JT Orga

JT Orga ist eine interne Event-Management- und Teilnehmer-Organisationsplattform für den JT (Junge T"atige / Verein). Die App verwaltet Events, Einladungen, Teilnehmer-R"uckmeldungen, Mitbringlisten, Umfragen und ein Benachrichtigungssystem – alles in einer sicheren, mobil-optimierten Webanwendung.

## Tech Stack

| Layer | Technologie |
|-------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Vite |
| Backend | Express.js, Node.js (mit `--experimental-strip-types`) |
| Datenbank | SQLite (better-sqlite3) mit WAL-Modus |
| Auth | JWT (HttpOnly-Cookies), bcryptjs, Account-Lockout |
| OAuth | Google Identity Services (GIS) |
| Maps | Leaflet / OpenStreetMap |
| Charts | Recharts |

## Features

- **Event-Management:** Erstellen, Bearbeiten, Archivieren von Aktionen
- **Einladungen:** Token-basierte Einladungen mit individuellen Links
- **Teilnehmer:** R"uckmeldungen (Ja/Nein/Vielleicht), G"aste, Kommentare
- **Mitbringlisten:** Gemeinsame Checklisten mit Claim-Funktion
- **Umfragen:** Mehrfachauswahl-Umfragen pro Event
- **Nachrichten:** Event-Chat (Admin + Mitglieder) mit XSS-Schutz
- **Benachrichtigungen:** Internes Notification-System f"ur Admins und Mitglieder
- **Registrierung:** Anfrage-Workflow mit Admin-Genehmigung und Code
- **Google Login:** Alternativer Login f"ur Mitglieder ohne Passwort
- **Statistiken:** Teilnehmerquoten, Event-Auswertungen, Archiv
- **Wetter:** Open-Meteo-Integration f"ur Event-Standorte
- **Route:** "Offentliche-Verkehrs-Routenplanung (Leaflet)

## Lokale Entwicklung

**Voraussetzungen:** Node.js 20+

```bash
# 1. Dependencies installieren
npm install

# 2. Umgebungsvariablen konfigurieren
# Kopiere .env.example nach .env.local und f"ulle aus:
# - JWT_SECRET (min. 32 zuf"allige Zeichen!)
# - VITE_GOOGLE_CLIENT_ID (optional, f"ur Google Login)
# - GEMINI_API_KEY (optional)

# 3. Entwicklungsserver starten
npm run dev
# Server l"auft auf http://localhost:3000
```

## Produktions-Deploy

```bash
# 1. Build
npm run build

# 2. Datenbank sichern (vor jedem Update!)
node scripts/backup-db.js

# 3. Server starten
npm start
```

### Wichtige Sicherheitshinweise f"ur Production

- **JWT_SECRET** muss ein starkes, zuf"alliges Secret sein (niemals `test123` verwenden!)
- **NODE_ENV=production** setzen
- `.env.local` niemals ins Git committen (ist bereits in `.gitignore`)
- HTTPS erforderlich (Cookies sind `secure: true`)

## Projektstruktur

```
src/
  api/              # Express-API (modularisiert)
    index.ts        # Router-Zusammensetzung
    middleware.ts   # Auth, Rate-Limiting
    schemas.ts      # Zod-Validierung
    routes/
      auth.ts       # Admin-Auth
      admin.ts      # Admin-Endpunkte
      public.ts     # Public-Endpunkte + Google OAuth
  components/       # React-Komponenten
    event-details/  # EventDetails-Subkomponenten
    public-invite/  # PublicInvite-Subkomponenten
  db/
    index.ts        # SQLite-Initialisierung + Migrationen
  lib/              # Hilfsfunktionen
  pages/            # Route-Pages
scripts/
  backup-db.js      # Datenbank-Backup
```

## Datenbank-Migrationen

Migrationen werden automatisch beim Server-Start in `src/db/index.ts` ausgef"uhrt (idempotent via `try/catch`). Neue Spalten:
- `person_id` in `admin_users`
- `failed_login_attempts`, `locked_until` in `admin_users` + `persons`
- `meeting_point`, `is_archived`, `type` in `events`
- `username`, `email`, `password_hash`, `avatar_url` in `persons`
- `google_id`, `google_email` in `persons` (f"ur OAuth)

## API-Endpunkte

| Pfad | Auth | Beschreibung |
|------|------|--------------|
| `/api/auth/login` | - | Admin-Login |
| `/api/public/login` | - | Mitglied-Login |
| `/api/public/auth/google` | - | Google OAuth Login |
| `/api/admin/events` | Admin | CRUD Events |
| `/api/admin/persons` | Admin | CRUD Personen |
| `/api/admin/stats` | Admin | Statistiken |
| `/api/public/dashboard` | Mitglied | Einladungen |
| `/api/public/invite/:token` | - | "Offentliche Event-Seite |
| `/api/public/notifications` | Mitglied | Benachrichtigungen |

## Lizenz

Interne Software – Alle Rechte vorbehalten.
