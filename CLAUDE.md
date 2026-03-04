# HexaScale — AI Agent Instructions

## Project Overview
HexaScale is a client-side React+Vite app that converts geospatial data (GeoJSON, CSV, KML, Shapefile) into H3 hexagonal grid outputs. It runs entirely in the browser — no backend.

## Build & Test Commands
```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm test         # Run tests via vitest
```

## File Structure (Post-Refactor)
```
App.tsx                    # Slim orchestrator (~120 lines) — hooks + conditional views
hooks/
  useLayerManager.ts       # Layer CRUD, CSV temp state, data loading
  useProcessing.ts         # Processing pipeline, progress, results, warnings
  useExport.ts             # CSV and GeoJSON download
views/
  SetupView.tsx            # Setup panel: settings, layer list, file upload
  ResultsView.tsx          # Results panel: downloads, map, warnings
components/
  FileUpload.tsx           # File parsing (drag-drop, size guard)
  HexMap.tsx               # Leaflet map with choropleth, click inspect, viewport filter
  DataPreviewModal.tsx     # Table preview of results
  CsvColumnMapper.tsx      # CSV lat/lon column mapper
  LayerConfigModal.tsx     # Per-layer column configuration (cross-layer name validation)
  OnboardingBanner.tsx     # Welcome banner with sample dataset
  ResolutionTooltip.tsx    # H3 resolution reference tooltip
services/
  geoProcessor.ts          # Core H3 processing (polygon/point/line + ring aggregation)
  columnInference.ts       # Token-based column type classification
utils/
  constants.ts             # Named constants (resolutions, limits, sizes)
  errors.ts                # AppError class + ProcessingWarnings accumulator
  errorMessages.ts         # Technical-to-user error message mapping
  colorScale.ts            # Blue-to-red choropleth color scale
  projectConfig.ts         # Save/load project settings as JSON
assets/
  sample-data.json         # Sample GeoJSON dataset (~50 polygons)
tests/
  geoProcessor.test.ts     # Core processing tests
  columnInference.test.ts  # Classification accuracy + false positive regression
  fixtures/                # Small GeoJSON test data
```

## Key Patterns

### Hooks Own State
App.tsx is a thin orchestrator. All state lives in custom hooks:
- `useLayerManager` — layers, editing state, CSV flow
- `useProcessing` — processing status, results, progress, warnings, cancel
- `useExport` — download functions

### AppError + ProcessingWarnings
- Services throw `AppError` for fatal errors
- `ProcessingWarnings` accumulates non-fatal issues during processing
- `{ results, warnings }` returned from `processGeoJsonToH3`
- Hooks catch errors → views display

### Column Inference (Token-Based)
- `tokenize(name)` splits on `_` and non-alphanumeric
- `hasAnyToken(tokens, needles)` checks full token equality — no substring matching
- Prevents false positives like "treatment" matching "rate"

### Processing Pipeline
`FileUpload → handleDataLoaded → analyzeColumnsLocally → LayerConfigModal → processGeoJsonToH3 → ResultsView`

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
