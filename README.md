# VOLEA — Padel Club Buchungs-App

WebApp für eine Padel-Anlage mit 10 Plätzen. Spieler können Plätze buchen, Ausrüstung leihen und die Live-Auslastung sehen. Admins verwalten Buchungen, Plätze und sehen Umsatz-Statistiken.

**Live:** [volea.lauer.team](https://volea.lauer.team) · **Version:** 0.3.0

## Features

- **Spieler:** Live-Auslastung, Platz buchen (90-Min-Slots), Ausrüstung leihen, Konto & Buchungen
- **Admin:** Übersicht mit Charts, Buchungen verwalten, Platz-Inventar
- **Design:** Dark/Light Theme, 4 Akzentfarben, DE/EN, responsive (Sidebar + Mobile Tab-Bar)
- **Landingpage:** Öffentliche Startseite unter `/`, App unter `/app/`
- **Backend:** App-API (`/api/...`) → Domain-API → Postgres (`volea`)

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router, static export)
- React 19 + TypeScript
- nginx serves `out/` in production (see `Dockerfile`)
- Tailwind CSS 4 + CSS Custom Properties (Design Tokens)

## Lokaler Start

```bash
npm install
npm run dev
```

`next dev` erwartet die App-API unter `/api` (nginx/Caddy oder `VOLEA_DEV_API_URL` Rewrite).

Ohne laufende API sind Login und Buchung nicht möglich — es gibt keinen Demo-Bypass mehr.

## Deployment

Production image: `npm run build` → static `out/` copied into nginx. `CMD npm run start` is not used.

GitHub Actions (`ghcr.yml`) publishes `ghcr.io/volea1/volea-app-web:<git-sha>`.

## Projektstruktur

```
src/
  app/              # Next.js App Router (/, /app/)
  components/       # UI-Komponenten & Screens
  lib/              # Daten, i18n, Types, API-Client
```

## Changelog

Siehe [CHANGELOG.md](./CHANGELOG.md).

## Design

Basierend auf der VOLEA Design-Vorlage (Clubhouse Night/Day, Brass-Akzent, Marcellus + Hanken Grotesk).
