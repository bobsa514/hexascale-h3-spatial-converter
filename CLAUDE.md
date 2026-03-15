# HexaScale — AI Agent Instructions

## Project Overview
HexaScale is a client-side React+Vite app that converts geospatial data (GeoJSON, CSV, KML, Shapefile) into H3 hexagonal grid outputs. It runs entirely in the browser — no backend.

## Build & Test Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm test         # Run tests via vitest
```

## File Structure
```
App.tsx                    # Slim orchestrator — hooks + conditional views + quick demo
hooks/
  useLayerManager.ts       # Layer CRUD, CSV temp state, data loading, addLayerDirect
  useProcessing.ts         # Web Worker processing pipeline, progress, results, warnings
  useExport.ts             # CSV and GeoJSON download
views/
  SetupView.tsx            # Setup panel: settings, layer list, file upload
  ResultsView.tsx          # Results panel: downloads, map, warnings (lazy-loaded)
components/
  FileUpload.tsx           # File parsing (drag-drop, size guard)
  HexMap.tsx               # Leaflet map with choropleth, click inspect, viewport filter
  DataPreviewModal.tsx     # Table preview of results
  CsvColumnMapper.tsx      # CSV lat/lon column mapper
  LayerConfigModal.tsx     # Per-layer column configuration (cross-layer name validation)
  OnboardingBanner.tsx     # Welcome banner with sample dataset + "See it in action" quick demo
  ResolutionTooltip.tsx    # H3 resolution reference tooltip
services/
  geoProcessor.ts          # Core H3 processing (polygon/point/line + ring aggregation)
  columnInference.ts       # Token-based column type classification
workers/
  geoWorker.ts             # Web Worker that runs geoProcessor off the main thread
  workerTypes.ts           # Message types for worker communication (PROCESS/PROGRESS/RESULT/ERROR)
utils/
  constants.ts             # Named constants (resolutions, limits, sizes)
  errors.ts                # AppError class + ProcessingWarnings accumulator
  errorMessages.ts         # Technical-to-user error message mapping
  colorScale.ts            # Blue-to-red choropleth color scale
  projectConfig.ts         # Save/load project settings as JSON
  geoType.ts               # getGeoType() — geometry type detection (extracted to break turf import chain)
types/
  shpjs.d.ts               # Type declarations for shpjs
assets/
  sample-data.json         # Sample GeoJSON dataset (~50 polygons)
tests/
  geoProcessor.test.ts     # Core processing tests
  columnInference.test.ts  # Classification accuracy + false positive regression
  colorScale.test.ts       # Color gradient and numeric column detection
  projectConfig.test.ts    # Config serialization/deserialization
  errorMessages.test.ts    # Error message mapping
  errors.test.ts           # AppError and ProcessingWarnings
  fixtures/                # Small GeoJSON test data
docs/
  pm-briefing.md           # PM briefing (latest: 2026-03-14)
  cto-briefing.md          # CTO briefing (latest: 2026-03-14)
  gtm-briefing.md          # GTM briefing (latest: 2026-03-14)
```

## Key Patterns

### Hooks Own State
App.tsx is a thin orchestrator. All state lives in custom hooks:
- `useLayerManager` — layers, editing state, CSV flow, `addLayerDirect` for quick demo
- `useProcessing` — Web Worker processing, progress, results, warnings, cancel
- `useExport` — download functions

### Web Worker Processing
- `useProcessing` sends each layer to a Web Worker via `processLayerInWorker()`
- Worker uses `geoWorker.ts` which imports and runs `processGeoJsonToH3`
- Messages: `PROCESS` (in), `PROGRESS`/`RESULT`/`ERROR` (out)
- Heavy libs (turf, h3) run off the main thread — no UI freezing
- One worker per layer, terminated after completion

### Bundle Splitting
- `ResultsView` is lazy-loaded via `React.lazy()` (defers leaflet/map)
- `geoType.ts` extracted from `geoProcessor.ts` to break main-thread → turf import chain
- `manualChunks` splits h3-js and leaflet into separate vendor chunks
- Worker bundle (`geoWorker`) is automatically separate (Vite worker bundling)

### AppError + ProcessingWarnings
- Services throw `AppError` for fatal errors
- `ProcessingWarnings` accumulates non-fatal issues during processing
- `{ results, warnings }` returned from `processGeoJsonToH3`
- Worker serializes warnings via `.toSummary()` before posting back

### Column Inference (Token-Based)
- `tokenize(name)` splits on `_` and non-alphanumeric
- `hasAnyToken(tokens, needles)` checks full token equality — no substring matching
- Prevents false positives like "treatment" matching "rate"

### TypeScript Strict Mode
- `strict: true` and `noUncheckedIndexedAccess: true` enabled
- Array index access returns `T | undefined` — use `!` assertion or guard
- All `any` types should have explicit type annotations or be justified

### Processing Pipeline
`FileUpload → handleDataLoaded → analyzeColumnsLocally → LayerConfigModal → processGeoJsonToH3 (via Worker) → ResultsView`

Quick demo flow: `OnboardingBanner → handleQuickDemo → auto-configure columns → processGeoJsonToH3 (via Worker) → ResultsView`

## Common Tasks

### Add a new export format
1. Add download function in `hooks/useExport.ts`
2. Add button in `views/ResultsView.tsx`

### Add a new aggregation type
1. Add enum value to `PointAggregation` in `types.ts`
2. Add case in `processPoints()` switch in `services/geoProcessor.ts`
3. Add option in `LayerConfigModal.tsx` dropdown

### Add a new file format
1. Add file extension detection in `components/FileUpload.tsx`
2. Add parsing logic and call `validateAndLoad()`

### Add a new column type keyword
1. Add to appropriate token list in `services/columnInference.ts`
2. Add regression test in `tests/columnInference.test.ts`

## Analytics
- Vercel Analytics injected in `index.tsx` via `@vercel/analytics`
- Runs automatically in production on Vercel — no dashboard configuration needed

## SEO
- Meta description and Open Graph tags in `index.html`
- OG image not yet configured — add `og:image` when a screenshot is available
