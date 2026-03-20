# Changelog

## 2026-03-19 — UI Redesign & Bug Fixes

### Added
- **About page** — New full-page view explaining H3, methodology (intensive/extensive/categorical), privacy (all browser-side), open source status, and author info. Accessible via "About" nav link.
- **Navbar navigation** — Top banner now has "H3-fy" (main app) and "About" tabs with active state indicators.

### Changed
- **LayerConfigModal redesign** — Compact horizontal 3-column layout (Source | Output | Type) replaces the old 2x2 grid. Source column is now a dropdown (changeable after adding). Help text moved to (i) tooltip. Ring aggregation uses pill-style toggle switches. Delete button always visible.

### Fixed
- **Shapefile parsing in Web Worker** — `.zip` shapefile uploads failed with "nodebuffer is not supported" because shpjs internally uses `JSZip.async('nodebuffer')` which only works in Node.js. Fix: bypass shpjs's unzip and call `parseShp`/`parseDbf`/`combine` directly with browser-safe `arraybuffer` extraction.

---

## 2026-03-17 — Correctness & Method Alignment

### Fixed
- **Polygon fast mode conservation** — Fast extensive mode now conserves totals exactly (was 13% over-count). Uses `1/N` cell share instead of `polygonArea/hexArea` ratio.
- **Line length-weighted distribution** — Line extensive values now distribute by sample-point density per cell (length-weighted), not equal `1/cellCount` split. Intensive uses length-weighted average.

### Added
- **Categorical column type** — New `Categorical (Text)` type for text/string attributes. Uses "largest overlap wins" strategy for polygons (precise mode), highest line-length share for lines, first value for points.
- **Multi-ring aggregation** — Select multiple ring sizes (1, 2, 3, 6) per column. Generates `_ring1`, `_ring3` etc. suffix columns for neighborhood analysis at different spatial scales. Single-ring backward compatible.
- **Mixed geometry warning at upload** — Detects mixed geometry types when file is loaded and shows warning in the layer card (setup view), not just in results.
- **QA summary in results** — Results page now shows processing summary: layer count, column count, warnings, conservation checks per extensive column with delta percentages.
- **Bbox pre-filter for precise mode** — Skips `turf.intersect()` for hex cells whose bounding box doesn't overlap the source polygon. Significant speedup for large polygons.
- **File parsing Web Worker** — CSV, GeoJSON, KML, KMZ, and Shapefile parsing now runs off the main thread. Large file uploads no longer freeze the UI.
- **Benchmark suite** — `npm run bench` runs performance comparison of Approximate vs Exact Area modes.
- **Invariant tests** — Polygon extensive conservation (fast + precise), line extensive conservation, intensive stability across overlapping polygons, mixed geometry warnings.

### Changed
- **Default polygon mode → Exact Area** — New polygon extensive columns default to precise (intersection-based) mode instead of approximate.
- **Mode labels renamed** — "Fast" → "Approximate (Faster)", "Precise" → "Exact Area". Help text explains the tradeoff.
- **Ring UI → multi-toggle buttons** — Ring aggregation changed from single dropdown to multi-select toggle buttons.

---

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
