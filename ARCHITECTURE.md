# HexaScale Architecture

## System Overview
HexaScale runs entirely client-side (React + Vite). No backend, no API calls. All geospatial processing happens in the browser using JavaScript implementations of H3 and Turf.js.

## Data Flow
```
User uploads file
  → FileUpload parses to GeoJSON FeatureCollection
  → handleDataLoaded detects geometry type + runs column inference
  → User configures columns in LayerConfigModal
  → handleProcess iterates layers
    → processGeoJsonToH3 routes by geometry type
      → processPolygons / processPoints / processLines
      → applyRingAggregation (optional spatial smoothing)
    → Merge results by hexId across layers
  → ResultsView renders map + export options
```

## Design Decisions

### Client-Only
All processing runs in the browser. No server means no data leaves the user's machine — important for sensitive geospatial data. Trade-off: limited by browser memory and single-thread performance.

### H3 Hexagonal Grid
H3 provides a globally consistent hexagonal grid. Hexagons minimize edge effects in spatial analysis compared to square grids. The h3-js library (compiled via WASM) provides fast cell operations.

### Intensive vs. Extensive Variables
- **Intensive** (density, rate, temperature): Values that don't change with area. Aggregated by weighted average.
- **Extensive** (population, count, volume): Values that scale with area. Distributed proportionally across hexagons.

This distinction is critical for correct spatial disaggregation of polygon data.

### Fast vs. Precise Polygon Mode
- **Fast**: Uses average hex area / polygon area ratio. O(n) where n = number of hexes.
- **Precise**: Computes exact intersection area via `turf.intersect()`. O(n * m) where m = polygon complexity. Much slower but more accurate for irregular polygons.

## Component Architecture
```
App.tsx (orchestrator)
├── useLayerManager (state: layers, CSV flow)
├── useProcessing (state: status, results, warnings)
├── useExport (functions: downloadCsv, downloadGeoJson)
│
├── SetupView
│   ├── OnboardingBanner
│   ├── ResolutionTooltip
│   ├── FileUpload (drag-drop, size guard)
│   └── DataPreviewModal (layer preview)
│
├── ResultsView
│   ├── HexMap
│   │   ├── HexRenderer (choropleth, click inspect, viewport filter)
│   │   └── MapSizer (ResizeObserver)
│   └── DataPreviewModal (results preview)
│
├── LayerConfigModal (cross-layer output name validation)
└── CsvColumnMapper
```

## Performance Notes
- Map rendering limited to 1000 hexes (solid) or 5000 (viewport-filtered with choropleth)
- Ring aggregation uses `Map<string, HexResult>` for O(1) neighbor lookup
- Progress callbacks at every ~200 features to keep UI responsive
- `useMemo` on polygon boundary calculations to prevent re-renders
- Viewport filtering: only render hexes visible in current map bounds
