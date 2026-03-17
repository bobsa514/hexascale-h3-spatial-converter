# Changelog

## 2026-03-17

### Fixed
- **Line Extensive conservation (P1)** — Extensive values on lines now distribute by `1/cellCount` instead of replicating the full value to every hex. Totals are now conserved.
- **Point ID column preservation (P2)** — ID columns on point layers are now preserved in output (previously silently dropped)
- **Result schema completeness (P2)** — Output column list and map color selector now scan all result rows, not just the first. Fixes missing columns in sparse multi-layer merges.
- **Config load restores settings (P2)** — Loading a saved config now stores layer configurations and auto-applies them when matching files are re-uploaded
- **Cross-layer name conflict detection (P3)** — Fixed filtering bug that hid cross-layer output name conflicts in the config modal
- **Point column inference (P3)** — Point data now uses token-based classification (same as polygons) instead of blanket EXTENSIVE for all columns
- **Preview modal title (P4)** — Now shows actual row count instead of hardcoded "First 5 Rows"

### Added
- **Mixed geometry warning** — Processing now warns when a FeatureCollection has mixed geometry types, telling users which features will be skipped
- **Empty output name validation** — Config modal and processing pipeline now block empty/whitespace-only output column names
- **Attribute scanning** — Available attributes now scanned from up to 50 features (union of all property keys) instead of only the first feature
- **Fast Extensive UI note** — Config modal now clarifies that Fast mode is approximate and may not conserve totals exactly

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
