# Familien-Dashboard

Privates Familien-Dashboard als Vite + React + TypeScript PWA mit Supabase Backend und GitHub-Pages-Deployment.

## Verbindliche Architektur

- Frontend: Vite, React, TypeScript, HashRouter, PWA.
- Hosting: statisches Build auf GitHub Pages.
- Backend: gehostetes Supabase-Projekt mit Postgres, Auth, RLS und Edge Functions.
- Kein Next.js, kein eigener Node-Server, kein Docker, keine `/api/*`-Routen.
- Kein service-role-Key im Frontend. Im Browser werden nur `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` und optional `VITE_VAPID_PUBLIC_KEY` verwendet.
- Bild-/Medienmodul ist im MVP bewusst nicht enthalten.

## Lokaler Start

```powershell
cd "C:\Users\Robin Klein\_Codex-Arbeitsbereich\02_Code\familien-dashboard"
npm install
Copy-Item .env.example .env
```

Danach `.env` ausfüllen:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SEED_ADMIN_EMAIL`
- `SEED_SECOND_EMAIL`
- `SEED_TEST_PASSWORD`

Dann:

```powershell
npm run seed:admin
npm run dev
```

## Supabase-Reihenfolge

1. Supabase-Projekt anlegen.
2. SQL aus `supabase/migrations/20260608143000_initial_schema.sql` ausführen.
3. `.env` lokal mit URL, anon-Key und service-role-Key füllen.
4. `npm run seed:admin` ausführen.
5. Mit den lokalen Seed-Zugangsdaten einloggen.

Das Seed-Skript erzeugt Auth-Nutzer über die Supabase Auth Admin API. Eine reine SQL-Migration würde keine anmeldefähigen Nutzer erzeugen.

## GitHub Pages

Der Build nutzt den Repo-Unterpfad:

```text
VITE_BASE_PATH=/<repository-name>/
```

Für GitHub Pages sind vorbereitet:

- Vite `base`
- HashRouter
- `dist/404.html` als SPA-Fallback
- PWA-Manifest mit Scope unter `/familien-dashboard/`
- `.github/workflows/deploy-pages.yml`

In GitHub Actions müssen diese Secrets gesetzt werden:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`

Der service-role-Key gehört nicht in das Frontend-Build. Für Admin-Seed oder geschützte Deploy-Schritte nur als separates Secret verwenden.

## Web Push

Client:

- registriert Service Worker
- fragt Push Permission ab
- speichert `push_subscriptions` in Supabase

Server:

- `supabase/functions/send-important-push/index.ts`
- Deno Edge Function
- nutzt `@pushforge/builder` über `npm:` Import für VAPID/Web Push
- benötigt Supabase-Secrets `VAPID_PRIVATE_KEY` und `VAPID_ADMIN_CONTACT`

Plattformgrenze:

- iOS Web Push funktioniert nur ab iOS 16.4+.
- Auf iPhone/iPad nur in der zum Home-Bildschirm hinzugefügten PWA.
- Echte Zustellung braucht HTTPS.
- Lokale iOS-Zustellung ist nicht belastbar testbar.
- In-App-Benachrichtigungen bleiben der verbindliche Fallback.

## Tests

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Getestete Kernlogik:

- Abfalldaten: gültige Daten und keine Dubletten pro Tag/Tonne
- naechste Abholungen ab Projektstart
- Trennhilfe-Suche
- Rezeptvorschlaege mit vegetarischer Mindestabdeckung
- Zutatenübernahme in Einkaufsliste
- Aktivitäten-Deduplizierung und isolierte Fehler je Quelle

## Grenzen dieses Stands

- Ohne echte Supabase-Schlüssel zeigt die App nur die Setup-Seite.
- Supabase-Migration, Seed und Login konnten ohne Projektkeys nicht gegen eine echte Cloud getestet werden.
- Web Push ist implementiert, aber echte iOS-Zustellung kann erst nach GitHub-Pages-Deploy und Home-Screen-Installation geprüft werden.
- Aktivitäten arbeiten im MVP aus Seed-Daten. Live-Quellen sind bewusst nicht als HTML-Scraper gebaut.
- Rezepte stammen aus lokalen Seed-Daten. Externe Rezeptvolltexte werden nicht übernommen.
- Das Bildmodul ist gemaess Auftrag nicht gebaut.
