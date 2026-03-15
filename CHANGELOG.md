# Changelog

## 2026-03-14

### Added
- **Vercel Analytics** — Usage tracking via `@vercel/analytics` (runs automatically on Vercel)
- **SEO meta + Open Graph tags** — Proper link previews when shared on social media
- **Web Worker processing** — H3 processing now runs off the main thread, preventing browser freezes on large datasets
- **One-click demo** — "See it in action" button auto-configures and processes the sample dataset instantly
- **TypeScript strict mode** — `strict: true` + `noUncheckedIndexedAccess` for better type safety
- **Bundle splitting** — ResultsView lazy-loaded, vendor chunks for h3-js and leaflet, worker bundle separate
- **Type declarations** — `@types/react`, `@types/react-dom`, `@types/leaflet`, `@types/papaparse`, `shpjs.d.ts`

### Fixed
- **npm audit vulnerability** — Resolved high-severity rollup CVE (GHSA-mw96-cpmx-2vgc)
- **31 `any` type annotations** — Replaced with proper types across all source files
- **Empty vendor chunks** — Cleaned up manualChunks to only split modules that actually exist in main bundle

### Changed
- **`getGeoType()` extracted** to `utils/geoType.ts` — breaks the import chain that pulled turf.js (500KB) into the main thread bundle
- **`useProcessing`** now uses `processLayerInWorker()` instead of calling `processGeoJsonToH3` directly
- **`useLayerManager`** exposes `addLayerDirect()` for programmatic layer creation (used by quick demo)
- **`OnboardingBanner`** now has two buttons: "See it in action" (quick demo) and "Load sample dataset" (manual config)

### Architecture
- Worker infrastructure (`workers/geoWorker.ts`) that was previously dead code is now wired in
- Initial page load reduced from 305KB gzipped (single chunk) to ~176KB gzipped + lazy chunks
