# AGENTS.md – JT Orga

Diese Datei enth"alt Build-Steps, Konventionen und architektonische Entscheidungen, die f"ur zuk"unftige Agenten relevant sind.

## Build & Development

| Befehl | Zweck |
|--------|-------|
| `npm run dev` | Entwicklung (Vite Dev Server + Express API) |
| `npm run build` | Produktions-Build (`dist/`) |
| `npm start` | Produktionsserver (Node + Express) |
| `npm run lint` | TypeScript-Check (`tsc --noEmit`) |

**Start-Befehl:** `tsx start.ts` l"adt `.env.local` und importiert `server.ts`. Der Server startet Express und mountet Vite im Dev-Modus oder serviert `dist/` im Produktionsmodus.

## Architektur-Entscheidungen

### Monolith → Modular (API)
Die API war urspr"unglich ein 1219-Zeilen-Monolith in `src/api/index.ts`. Sie wurde aufgeteilt in:
- `src/api/index.ts` – Router-Zusammensetzung (20 Zeilen)
- `src/api/middleware.ts` – Auth, Rate-Limiting, JWT-Config
- `src/api/schemas.ts` – Alle Zod-Schemas + `sanitizeText`
- `src/api/routes/auth.ts` – Admin-Authentifizierung
- `src/api/routes/admin.ts` – Alle Admin-Endpunkte
- `src/api/routes/public.ts` – Alle Public-Endpunkte + Google OAuth

**Wichtig:** Neue API-Endpunkte geh"oren in die entsprechende Route-Datei, NICHT zur"uck in `index.ts`.

### Auth-Middleware
- `requireAuth` – Pr"uft `admin_token`-Cookie
- `requirePersonAuth` – Pr"uft `person_token`-Cookie, f"allt auf Admin-Token zur"uck (f"ur Admin-Zugriff auf Mitglieder-Routen)
- `loginLimiter` – Rate-Limiting auf Login-Endpunkten (5 Versuche / 15 Minuten)

### Datenbank
- SQLite via `better-sqlite3` mit WAL-Modus
- Datei: `data/data.db`
- Migrationen sind inline in `src/db/index.ts` und idempotent (try/catch mit `duplicate column name`-Check)
- **Niemals** Schema-Dateien l"oschen oder Migrationen zur"uckdrehen ohne Backup

## Code-Konventionen

### Imports
- Pfad-Aliase werden NICHT verwendet (kein `@/components/...`)
- Relative Pfade: `../components/...`, `../../db/index.ts`
- Extension `.ts` wird in Imports mitgeschrieben (f"ur Node `--experimental-strip-types`)

### Styling
- Tailwind CSS v4 (keine `tailwind.config.js` mehr n"otig)
- Mobile-First, dunkles Theme (`bg-black`, `text-white`)
- Touch-Targets mindestens 44px
- Inputs/Selects/Textareas mit `text-base` (16px) f"ur iOS-No-Zoom

### Sicherheit
- **XSS:** Alle Text-Eingaben durch `sanitizeHtml(..., {allowedTags: [], allowedAttributes: {}})` in Schemas
- **Auth:** JWT in HttpOnly-Cookies, `secure: true`, `sameSite` je nach Umgebung
- **Rate-Limiting:** `express-rate-limit` auf API-Level und Login-Level
- **Account-Lockout:** 5 Fehlversuche = 30 Minuten Sperre
- **Passwort-Hashing:** bcryptjs mit Salt-Rounds 10

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `server.ts` | Express-App-Einstieg |
| `start.ts` | L"adt `.env.local`, startet Server |
| `src/db/index.ts` | DB-Initialisierung + alle Migrationen |
| `src/api/middleware.ts` | JWT_SECRET-Validierung (prozess-beendend bei Fehlen!) |
| `src/api/schemas.ts` | Zentralisierte Zod-Validierung |
| `src/vite-env.d.ts` | Vite-Types f"ur `import.meta.env` |

## Umgebungsvariablen

```bash
# KRITISCH – muss in Production gesetzt sein
JWT_SECRET=<64+ zuf"allige Zeichen>

# Optional – f"ur Google Login
VITE_GOOGLE_CLIENT_ID=<Google Client ID>

# Optional – f"ur Gemini-Integration
GEMINI_API_KEY=<API Key>

# Server
PORT=3000
NODE_ENV=production
```

## Backup

Vor jedem Deploy oder DB-Schema-Update:
```bash
node scripts/backup-db.js
```
Erstellt `backups/data-<timestamp>.db`, beh"alt die letzten 10 Backups.

## Was NIEMALS ge"andert werden sollte

1. **Bestehende API-Routen** ohne R"uckw"artskompatibilit"at pr"ufen
2. **SQLite-Schema** ohne Migration in `src/db/index.ts`
3. **JWT_SECRET** in einer laufenden Instanz (alle Sessions werden ung"ultig)
4. **Cookie-Settings** (`httpOnly`, `secure`, `sameSite`) – diese sind absichtlich streng

## Smoke-Test nach Deploy

1. Admin-Login (`/login?type=admin`)
2. Mitglied-Login (`/login`)
3. Google Sign-In (falls konfiguriert)
4. Event erstellen/bearbeiten (Datum-Validierung pr"ufen)
5. Person einladen
6. "Offentlichen Einladungslink aufrufen und R"uckmeldung geben
7. Nachricht im Event posten
8. In Umfrage abstimmen
9. Mobile-Ansicht pr"ufen (Zoom, Touch-Targets)
