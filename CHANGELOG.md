# Changelog

Alle wichtigen Änderungen an VOLEA. Neuere Versionen stehen oben.

## [0.3.0] — 2026-08-20

### Added
- Auth und Buchungen über `/api` (App-API → Domain-API → Postgres)
- Live-Belegung und Storno gegen eigene Datenbank

### Changed
- Supabase-Client entfernt; statischer nginx-Export bleibt
- GitHub Pages Workflow entfernt (kämpft mit DNS)

### Removed
- `public/CNAME` (`volea.lauer.team`)
- `@supabase/supabase-js`

## [0.2.0] — 2026-06-06

### Added
- Öffentliche Landingpage unter `/` mit Club-Infos und Einstieg zur App
- App unter `/app/` (Login, Buchung, Konto, Admin)
- GitHub Pages Deploy auf [volea.lauer.team](https://volea.lauer.team)
- Supabase-Backend (Auth, Courts, Equipment, Buchungen, Auslastung)
- Optik-Einstellungen im Konto (Theme, Akzent, Schrift, Dichte, Sprache)
- `robots.txt` und `noindex`-Meta-Tags — Seite nur per Link erreichbar, nicht indexiert
- VOLEA-Link auf [lauer.team](https://www.lauer.team)

### Changed
- Standardtextfarbe auf helles Theme (Dark Mode als Default)
- Schwebendes Zahnrad entfernt — Einstellungen nur noch unter Konto
- Statischer Next.js-Export für GitHub Pages

### Fixed
- Lesbarkeit von Labels und Überschriften auf dunklem Hintergrund beim ersten Laden

## [0.1.0] — 2026-06-06

### Added
- Initiale VOLEA Padel Club Buchungs-App
- Spieler- und Admin-Ansichten mit Mock-Daten
- Dark/Light Theme, 4 Akzentfarben, DE/EN
- Live-Auslastung, Platz buchen, Ausrüstung leihen
