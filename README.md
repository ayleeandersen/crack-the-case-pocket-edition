# Crack the Case Pocket

A private, offline, mobile-first PWA that replaces the *Crack the Case* card deck. React + TypeScript + Vite + Tailwind, no backend, all state in `localStorage` (`ctc:v1`).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Test

```bash
npm test           # Vitest: selection, played rules, scoring, clock, persistence
npm run typecheck
```

## Build and deploy

```bash
npm run build      # outputs static files to dist/
npm run preview    # serve dist/ locally at http://localhost:4173 (service worker active)
```

Upload `dist/` to any static host. Deep links such as `/case/23` need an SPA fallback to `index.html`:

- **Netlify / Cloudflare Pages:** handled by `public/_redirects` (copied into `dist/`).
- **Vercel:** handled by `vercel.json`.
- **Anything else:** configure "serve `index.html` for unknown paths". After the first visit, the service worker serves deep links offline regardless.

The site sends `noindex`. Keep the URL private: official card text is for personal use only.

## Install on a phone

- **iPhone (Safari):** open the site → Share → *Add to Home Screen*.
- **Android (Chrome):** open the site → ⋮ → *Install app*.

Open it once while online so the service worker caches everything; after that it works in airplane mode.

## Layout

```
crack-the-case-cards.json   card data (bundled via static import)
src/
  types.ts                  Card, Store and related types
  data/cards.ts             loads + validates cards, labels, sort order
  lib/                      pure logic (scoring, clock, selection, played, store) + tests
  state/StoreContext.tsx    React store, persistence, group helpers
  components/               UI primitives, header/switcher, case-screen panels
  screens/                  Play, Library, Case, Groups/Settings
```
