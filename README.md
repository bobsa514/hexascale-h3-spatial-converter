# HexaScale

Convert geospatial data into H3 hexagonal grids — entirely in your browser.

HexaScale takes polygons, points, and lines from standard geospatial formats and converts them into Uber's [H3 hexagonal grid system](https://h3geo.org/), correctly handling the difference between intensive variables (density, rate, temperature) and extensive variables (population, count, area).

**[Try the live demo](https://bobsa514.github.io/hexascale-h3-spatial-converter/)**

## Why HexaScale?

Most geospatial data comes in irregular shapes — census tracts, zip codes, administrative boundaries. Comparing data across these irregular geometries is unreliable. H3 hexagons provide a uniform grid that makes spatial analysis consistent and comparable.

Existing tools (Python's `tobler`, `h3fy`) require a Python environment. HexaScale runs in the browser — no installation, no data leaves your machine.

### What it does differently

- **Intensive vs. extensive handling** — Population gets distributed proportionally across hexagons. Density gets area-weighted averaged. Most tools treat everything the same.
- **Precise polygon mode** — Computes exact hex-polygon intersection areas using `turf.intersect()`, not just point-in-polygon approximations.
- **Multi-layer merging** — Upload multiple files, configure each independently, and merge results by hex ID into a single output.
- **Ring aggregation** — Optional spatial smoothing using H3's k-ring neighbors.

## Supported Formats

| Input | Output |
|-------|--------|
| GeoJSON (.json, .geojson) | CSV |
| CSV with lat/lon columns | GeoJSON |
| KML / KMZ | |
| Shapefile (.zip) | |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Upload a file, configure your columns, and process.

Or use the [live version](https://bobsa514.github.io/hexascale-h3-spatial-converter/) — no install needed.

## How It Works

1. **Upload** — Drag and drop or browse for your geospatial file
2. **Configure** — Select which columns to extract, set their type (intensive/extensive/ID), and choose aggregation method
3. **Process** — HexaScale converts your data to H3 hexagons at your chosen resolution (1-12)
4. **Explore** — Visualize results on a choropleth map, click hexagons to inspect values
5. **Export** — Download as CSV or GeoJSON

### Column Types

| Type | Meaning | Example | How it's handled |
|------|---------|---------|-----------------|
| Intensive | Doesn't scale with area | Income, temperature, density | Weighted average across hexagons |
| Extensive | Scales with area | Population, housing units, volume | Proportionally distributed across hexagons |
| ID | Identifier | FIPS code, tract ID | Kept as-is (first value) |

## Development

```bash
npm run dev       # Dev server on port 3000
npm run build     # Production build
npm test          # Run 63 tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and [ARCHITECTURE.md](ARCHITECTURE.md) for system design.

## Tech Stack

- **React 19** + **Vite** — UI and build
- **h3-js** — Hexagonal grid indexing
- **Turf.js** — Geospatial analysis (intersection, area, distance)
- **Leaflet** + **react-leaflet** — Map rendering
- **Vitest** — Testing
- **GitHub Actions** — CI/CD with GitHub Pages deployment

## License

MIT
