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
  useLayerManager.ts       # Layer CRUD, CSV temp state, data loading, addLayerDirect, config restore
  useProcessing.ts         # Web Worker processing pipeline, progress, results, warnings
  useExport.ts             # CSV and GeoJSON download
views/
  SetupView.tsx            # Setup panel: settings, layer list, file upload
  ResultsView.tsx          # Results panel: downloads, map, warnings (lazy-loaded)
components/
  FileUpload.tsx           # File upload UI (drag-drop, size guard) — delegates parsing to worker
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
  fileParseWorker.ts       # Web Worker for file parsing (CSV, JSON, KML, KMZ, Shapefile)
  fileParseWorkerTypes.ts  # Message types for file parse worker
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
  geoProcessor.test.ts     # Core processing tests + conservation invariants
  geoProcessor.bench.ts    # Benchmark: Approximate vs Exact Area mode performance
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
- `useLayerManager` — layers, editing state, CSV flow, `addLayerDirect` for quick demo, `loadPendingConfigs` for config restore
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

### Column Types
- **ID** — Identifier, kept as-is (first value in hex)
- **Intensive** — Doesn't scale with area (income, density, temperature). Area-weighted average.
- **Extensive** — Scales with area (population, count, volume). Distributed proportionally. Two modes:
  - *Approximate*: `1/N` equal share across cells (fast, conserves totals)
  - *Exact Area*: `turf.intersect()` polygon-hex intersection area (precise, default)
- **Categorical** — Text/string attributes. "Largest overlap wins" for polygons, highest share for lines, first value for points.
- **Ignore** — Not included in output

### Extensive Conservation
- Polygon fast mode: `share = 1 / uniqueCells.length` — guarantees `sum(shares) === 1.0`
- Polygon precise mode: `share = intersectionArea / polygonArea` — exact area-weighted
- Line: `share = sampleCountInCell / totalSamples` — length-weighted distribution
- Both modes pass invariant tests: `sum(output) === sum(input)` within tolerance

### Multi-Ring Aggregation
- `ringSizes: number[]` on ColumnConfig enables multi-band neighborhood output
- Single ring (backward compat): overwrites original column value
- Multiple rings: keeps original + adds `_ring1`, `_ring3` suffix columns
- Intensive: `mean(neighbors)`. Extensive: `sum(neighbors)`.

### File Parse Worker
- `fileParseWorker.ts` handles CSV, GeoJSON, KML, KMZ, Shapefile parsing off main thread
- `FileUpload.tsx` reads file into memory, sends to worker, receives parsed result
- Prevents UI freeze on large file uploads

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

### Add a new column type
1. Add enum value to `ColumnType` in `types.ts`
2. Add handling in `processPolygons()`, `processPoints()`, and `processLines()` in `services/geoProcessor.ts`
3. Skip in `applyRingAggregation()` if not numeric
4. Add option in `LayerConfigModal.tsx` type dropdown
5. Add inference rule in `services/columnInference.ts`
6. Add test in `tests/geoProcessor.test.ts`

### Add a new aggregation type
1. Add enum value to `PointAggregation` in `types.ts`
2. Add case in `processPoints()` switch in `services/geoProcessor.ts`
3. Add option in `LayerConfigModal.tsx` dropdown

### Add a new file format
1. Add file extension detection in `components/FileUpload.tsx`
2. Add parsing logic in `workers/fileParseWorker.ts`
3. File is read in FileUpload, sent to worker, parsed result returned via postMessage

### Add a new column type keyword
1. Add to appropriate token list in `services/columnInference.ts`
2. Add regression test in `tests/columnInference.test.ts`

## Analytics
- Vercel Analytics injected in `index.tsx` via `@vercel/analytics`
- Runs automatically in production on Vercel — no dashboard configuration needed

## SEO
- Meta description and Open Graph tags in `index.html`
- OG image not yet configured — add `og:image` when a screenshot is available
