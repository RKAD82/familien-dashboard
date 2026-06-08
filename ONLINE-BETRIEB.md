# Online-Betrieb und Anmeldung

Diese App ist technisch für GitHub Pages plus Supabase vorbereitet. GitHub Pages liefert die Web-App aus, Supabase speichert Kalender, Aufgaben, Einkauf, Links, Notizen, Rezepte, Meldungen und Logins.

## 1. Supabase-Projekt anlegen

1. Neues Supabase-Projekt erstellen.
2. In Supabase unter SQL Editor die Migration ausführen:

```text
supabase/migrations/20260608143000_initial_schema.sql
```

3. In Supabase unter Project Settings > API diese Werte kopieren:
   - Project URL
   - anon public key
   - service_role key

Wichtig: Der `service_role key` darf niemals ins Frontend oder in GitHub Pages.

## 2. Lokale `.env` für Seed und Test

Im Projektordner `.env.example` nach `.env` kopieren und ausfüllen:

```text
VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN-ANON-KEY
VITE_BASE_PATH=/familien-dashboard/

SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=DEIN-SERVICE-ROLE-KEY
SEED_FAMILY_NAME=Familie Klein
SEED_ADMIN_EMAIL=deine-email@example.com
SEED_ADMIN_NAME=Robin
SEED_SECOND_EMAIL=zweite-person@example.com
SEED_SECOND_NAME=Zweite Person
SEED_TEST_PASSWORD=ein-privates-startpasswort
```

Dann lokal ausführen:

```powershell
npm run seed:admin
```

Dadurch entstehen die ersten zwei anmeldefähigen Nutzer in Supabase Auth und die Familiendaten werden angelegt.

## 3. Anmeldung in der App

Nach dem Seed meldest du dich mit diesen Daten an:

- E-Mail: `SEED_ADMIN_EMAIL`
- Passwort: `SEED_TEST_PASSWORD`

Die zweite Person nutzt:

- E-Mail: `SEED_SECOND_EMAIL`
- Passwort: `SEED_TEST_PASSWORD`

Das Startpasswort danach in Supabase Auth oder über den späteren Passwortprozess ändern.

## 4. GitHub Pages veröffentlichen

Das Projekt enthält bereits:

```text
.github/workflows/deploy-pages.yml
```

In GitHub müssen unter Repository Settings > Secrets and variables > Actions diese Secrets gesetzt werden:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

Für den ersten Onlinebetrieb reicht `VITE_VAPID_PUBLIC_KEY` leer oder als Platzhalter, solange Web Push noch nicht produktiv genutzt wird.

Dann:

1. Repository nach GitHub pushen.
2. GitHub Pages auf `GitHub Actions` stellen.
3. Workflow `Deploy Familien-Dashboard` ausführen oder auf `main` pushen.
4. Die App ist danach unter der GitHub-Pages-Adresse erreichbar.

## 5. Was noch nicht automatisch erledigt ist

- Ich kann den echten Online-Deploy in dieser Sitzung nicht durchführen, weil dafür GitHub- und Supabase-Zugriffsdaten sowie Netzwerk-/Push-Rechte nötig sind.
- Weitere Familienmitglieder müssen aktuell über Supabase Auth oder ein erweitertes Seed-/Einladungswerkzeug angelegt werden.
- Web Push auf iPhone/iPad funktioniert erst nach HTTPS-Deploy und Installation der PWA auf den Home-Bildschirm.
