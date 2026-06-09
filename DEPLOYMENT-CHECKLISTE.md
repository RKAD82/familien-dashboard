# Deployment-Checkliste Familien-Dashboard

Stand: 08.06.2026

## 1. Lokale Prüfung

Im Projektordner ausführen:

```powershell
npm.cmd run check
```

Erwartung:

- Lint ohne Fehler
- Typecheck ohne Fehler
- Tests grün
- Build erzeugt `dist`
- `dist/404.html` wird als GitHub-Pages-Fallback erzeugt

## 2. GitHub-Veröffentlichung

Aktueller Remote:

```text
https://github.com/RKAD82/familien-dashboard.git
```

Empfohlener Weg auf diesem Rechner:

1. GitHub Desktop installieren oder Git-Credentials für HTTPS reparieren.
2. Lokalen Stand prüfen.
3. Änderungen committen.
4. Nach `main` pushen.
5. GitHub Actions Workflow `Deploy Familien-Dashboard` prüfen.

GitHub CLI ist auf diesem Rechner aktuell nicht installiert.

## 3. GitHub Actions Secrets

Für den Frontend-Build:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
```

Der `SUPABASE_SERVICE_ROLE_KEY` gehört nicht in das Frontend-Build.

## 4. Supabase Edge Functions

Für Einladungen:

```text
supabase/functions/invite-family-member/index.ts
```

Vor Produktivnutzung in Supabase deployen und Secrets setzen:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## 5. Online-Prüfung

Nach erfolgreichem Workflow prüfen:

- Online-App lädt unter `https://rkad82.github.io/familien-dashboard/`
- Login funktioniert
- Systemseite zeigt Mitglieder, Passwortbereich und Quellenstatus
- Passwort-Reset verschickt eine E-Mail
- Einladung funktioniert erst nach Edge-Function-Deploy
- iPhone/iPad PWA: Safari öffnen, Teilen, Zum Home-Bildschirm

## 6. Bekannte Grenzen

- Push ist erst mit echtem VAPID-Schlüssel und installierter PWA produktiv prüfbar.
- Abfalltermine und Aktivitäten bleiben prüfpflichtig, solange keine aktuelle Originalquelle direkt angebunden ist.
- GitHub-Webupload bleibt nur Notlösung, weil versteckte Ordner und Dateimengen dabei leicht fehlschlagen.
