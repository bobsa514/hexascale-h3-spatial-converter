# CTO Briefing -- HexaScale -- 2026-03-14

## Architecture Health

**Rating: Good -- clean separation, appropriately scoped for a solo-dev tool.**

The codebase follows a sensible layered architecture for a client-side React app:

- **Orchestrator pattern**: `App.tsx` (180 lines) is a thin wiring layer. All state lives in three custom hooks (`useLayerManager`, `useProcessing`, `useExport`). This is the right call -- it makes each concern independently testable.
- **Service layer**: `geoProcessor.ts` (459 lines) owns the core H3 conversion logic. `columnInference.ts` (93 lines) handles classification. Both are pure-ish functions with no React dependencies, which is correct for testability.
- **View/Component split**: Two views (`SetupView`, `ResultsView`) with seven components underneath. Component responsibilities are clear and single-purpose.
- **Error model**: `AppError` for fatal errors, `ProcessingWarnings` for non-fatal accumulation. This is a thoughtful pattern that prevents silent failures during batch processing.

**Architecture concern**: The flat file layout (all source files at the project root, not under `src/`) is non-standard. Vite expects `src/` but only `src/polyfills.js` lives there. All `.tsx` and `.ts` files are at the root or in root-level directories (`hooks/`, `services/`, `views/`, `components/`, `utils/`). This works but will confuse contributors and tooling that expects a `src/` root. The `@` path alias maps to the project root, which further obscures the boundary between source and config.

**Architecture strength**: The Web Worker infrastructure exists (`workers/geoWorker.ts`, `workers/workerTypes.ts`) but is not wired into the main processing pipeline. `useProcessing.ts` has a `workerRef` but calls `processGeoJsonToH3` directly on the main thread. This is a deliberate placeholder for future parallelization -- good forward thinking, but currently dead code.

## Code Quality

**TypeScript strictness: Weak.** The `tsconfig.json` has no `strict: true`, no `noUncheckedIndexedAccess`, no `strictNullChecks`. This means the compiler will not catch null-safety bugs. There are 31 `any` type annotations across 12 files. For a data processing tool where malformed input is the norm, this is a real risk.

**Specific type-safety issues:**
- `geoProcessor.ts:237` -- `const output: any = { hexId, ...val.data }` discards all type information for the primary output object.
- `geoProcessor.ts:65` -- `col.type === 'Aggregated Value' as any` is a type escape hatch that suggests a prior refactoring left a dangling case. This should be cleaned up or documented.
- `FileUpload.tsx` uses `any` for `data` parameters throughout, though GeoJSON types exist in the project.
- `useLayerManager.ts:37` -- `const suggestionMap: Record<string, any>` could be properly typed.

**Code organization strengths:**
- Named constants in `utils/constants.ts` -- no magic numbers in component code.
- Error message mapping in `utils/errorMessages.ts` translates technical errors to user-friendly messages.
- Token-based column inference in `columnInference.ts` is well-designed with full-token matching to prevent false positives (e.g., "treatment" does not match "rate").

**Minor issues:**
- `server.log` is checked into the repo (contains dev server output). Should be in `.gitignore`.
- `metadata.json` at root is unclear in purpose -- not referenced anywhere in source code.
- `package.json` name has a colon (`hexascale:-smart-h3-spatial-converter`) which is invalid for npm packages (harmless since `private: true`, but sloppy).

## Test Coverage

**63 tests across 6 test files, all passing.** Test execution time: 1.29s total.

**What is well-tested:**
- `geoProcessor.ts` -- 13 tests covering Points (SUM, AVERAGE), Polygons (Extensive, Intensive), Lines, Ring Aggregation, and edge cases (empty collections, unsupported geometry).
- `columnInference.ts` -- 22 tests including false-positive regression tests, tokenizer unit tests, and point-specific behavior.
- `colorScale.ts` -- 10 tests for gradient math and numeric column detection.
- `projectConfig.ts` -- 6 tests for serialization/deserialization.
- `errors.ts` -- 6 tests for AppError and ProcessingWarnings.
- `errorMessages.ts` -- 6 tests for error mapping.

**Critical gaps (no tests):**
1. **FileUpload.tsx** -- No tests for file parsing (GeoJSON, CSV, KML, KMZ, Shapefile). This is the primary user entry point. A malformed file crashing here is the most likely production bug.
2. **useLayerManager.ts** -- No hook tests. CSV-to-GeoJSON mapping (`handleCsvMapped`) with coordinate validation, dropped-row counting, and edge cases has no coverage.
3. **useProcessing.ts** -- No hook tests. Multi-layer processing, duplicate output name validation, cancellation flow -- all untested.
4. **useExport.ts** -- No tests. GeoJSON export polygon ring closure, CSV serialization.
5. **HexMap.tsx** -- No tests for viewport filtering logic, which contains non-trivial filtering and slicing.
6. **Web Worker** -- `workers/geoWorker.ts` exists but is dead code (not used by `useProcessing.ts`). No tests.

**Coverage scope**: Vitest coverage is configured to cover only `services/**` and `utils/**`, which is correct for the current test files but means hooks and components are explicitly excluded from coverage reporting.

## Performance Concerns

**P1 -- Main thread blocking.** The entire H3 processing pipeline runs synchronously on the main thread. `geoProcessor.ts` has a single `await new Promise(r => setTimeout(r, 100))` as a yield point, but the core `processPolygons`, `processPoints`, and `processLines` functions are synchronous `forEach` loops. For a dataset with 10k+ features at resolution 10+, this will freeze the browser tab for seconds to minutes.

The Web Worker infrastructure exists (`workers/geoWorker.ts`) but is not connected. This is the single biggest performance issue.

**P2 -- Precise extensive mode is O(n * m).** In `processPolygons` (lines 160-187), when `extensiveMode === 'precise'`, every hex cell computes `turf.intersect` against every polygon part. For a complex MultiPolygon with 1000 hex cells, this becomes extremely expensive. No caching, no spatial index.

**P2 -- Bundle size.** The production bundle is 990 KB (305 KB gzipped). Vite warns about chunks exceeding 500 KB. The main culprits are `@turf/turf` (imports the entire Turf.js library rather than individual modules) and `h3-js` (WASM-backed). Code splitting with dynamic imports would reduce initial load time.

**P3 -- Map rendering limits are appropriate.** The `MAX_HEX_RENDER_COUNT = 1000` (solid render) and `VIEWPORT_HEX_RENDER_COUNT = 5000` (viewport-filtered) limits are reasonable for Leaflet polygon rendering. However, each hex is a React `<Polygon>` component, which means 5000 React elements in the DOM. Canvas-based rendering (Leaflet Canvas or deck.gl) would handle 100k+ hexes.

**P3 -- Memory.** Large GeoJSON files (up to 500 MB per the `MAX_FILE_SIZE_MB` constant) are parsed entirely into memory and stored in React state (`layer.data`). After processing, both the original FeatureCollection AND the results are in memory simultaneously. For a 200 MB file, this could push browser memory past 1-2 GB.

**P4 -- Line processing interpolation.** `processLines` (line 375-385) interpolates points along each line segment at half-edge-length intervals. At high resolutions (res 12, edge ~9m), a 10km line produces ~2200 interpolation points per segment. This is correct but could be optimized with direct H3 line functions if available.

## Security Assessment

**Low risk overall -- this is a client-side-only application with no backend, no authentication, and no data transmission.** All processing happens in the browser.

**Items to note:**
1. **File parsing without sanitization.** User-uploaded GeoJSON is parsed with `JSON.parse` and passed directly into processing. While this cannot cause server-side issues (no server), maliciously crafted GeoJSON with deeply nested structures could cause stack overflow or memory exhaustion.
2. **KML parsing uses DOMParser.** KML files are parsed with the browser's `DOMParser`, which is safe against XXE attacks in modern browsers (unlike server-side XML parsers).
3. **`vite.config.ts:13`** defines `'process.env': '{}'` which prevents accidental environment variable leakage in the build.
4. **No CSP headers configured.** The app loads tile layers from `basemaps.cartocdn.com`. A Content-Security-Policy header would be good practice for the Vercel deployment.
5. **localStorage usage.** Only the onboarding dismissed flag is stored (`hexascale_onboarding_dismissed`). No sensitive data in local storage.

## Dependency Health

**1 high-severity vulnerability**: `rollup` 4.0.0-4.58.0 has an Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc). Fixable with `npm audit fix`. This is a build-time dependency only, not a runtime risk, but should be fixed.

**Outdated dependencies (12 packages with updates available):**

| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| `vite` | ^6.2.0 | ^8.0.0 | **Major version jump** -- breaking changes likely. Evaluate before upgrading. |
| `@tmcw/togeojson` | 5.8.1 | 7.1.2 | Major version, pinned (no ^). KML/KMZ parsing may have API changes. |
| `shpjs` | 5.0.0 | 6.2.0 | Major version, pinned. Shapefile parsing. |
| `@vitejs/plugin-react` | ^5.0.0 | ^6.0.1 | Major version. Tied to Vite upgrade. |
| `typescript` | ~5.8.2 | ~5.9.3 | Minor. Safe to upgrade. |
| `lucide-react` | ^0.562.0 | ^0.577.0 | Minor. Safe to upgrade. |
| `react` / `react-dom` | ^19.2.3 | ^19.2.4 | Patch. Safe to upgrade. |
| `@turf/turf` | ^7.3.1 | ^7.3.4 | Patch. Safe to upgrade. |

**Dependency bloat observations:**
- `buffer`, `stream-browserify`, `util` are Node.js polyfills for `shpjs`. These add to bundle size. Check if `shpjs@6.x` has removed Node.js dependencies.
- `uuid` is used only for generating layer IDs and column IDs. The code already conditionally uses `crypto.randomUUID()` (line 44 of `LayerConfigModal.tsx`). The `uuid` dependency could be removed entirely in favor of `crypto.randomUUID()` (available in all modern browsers).
- `geojson` package (v0.5.0) provides only TypeScript types and is barely maintained. The `@types/geojson` package from DefinitelyTyped would be more standard.

## Tech Debt

| Priority | Issue | Effort | Risk if Ignored |
|----------|-------|--------|-----------------|
| P1 | Main-thread processing blocks UI. Worker infrastructure exists but is not wired in. | L | Users with large files (>5k features) will experience frozen tabs. This is the top UX complaint risk. |
| P1 | No TypeScript strict mode. 31 `any` types. No null safety. | M | Silent runtime errors on malformed input. Bugs become harder to find as codebase grows. |
| P2 | Bundle is 990 KB (single chunk). Turf.js imported wholesale. | M | Slow initial load on mobile/slow connections. Vite already warns about this. |
| P2 | No tests for hooks or FileUpload component (the entire UI data flow). | L | Regressions in file parsing or multi-layer processing will only be caught manually. |
| P2 | Dead code: `workers/geoWorker.ts` + `workerTypes.ts` + `workerRef` in `useProcessing.ts`. | S | Confusion about whether workers are used. Should be wired in or removed. |
| P3 | Flat file layout (no `src/` root). Non-standard for Vite projects. | M | Tooling confusion, harder onboarding for contributors. |
| P3 | `server.log` and `.DS_Store` checked into repo. | S | Noise in git history. Add to `.gitignore` and remove from tracking. |
| P3 | `geoProcessor.ts:65` -- `'Aggregated Value' as any` is a dangling type escape from a prior refactoring. | S | Could cause incorrect ring aggregation behavior for edge cases. |
| P4 | `package.json` name contains a colon (invalid npm name). | S | Harmless since `private: true`, but sloppy. |
| P4 | `metadata.json` at root is unused/orphaned. | S | Clutter. |

## CI/CD Status

**CI pipeline**: GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main`. Steps: checkout, Node 20 setup, `npm ci`, `npm run build`, `npm test`. This is minimal but functional.

**What CI does NOT do:**
- No TypeScript type checking (`tsc --noEmit` is not run, though it currently passes).
- No linter (no ESLint config found).
- No coverage thresholds or coverage reporting.
- No bundle size check/budget.
- No visual regression or e2e tests.

**Deployment**: Vercel (migrated from GitHub Pages per recent commits). No `vercel.json` config found, suggesting default Vite auto-detection. This works fine for a static SPA.

**Build health**: Build succeeds in 2.42s. All 63 tests pass. TypeScript compiles cleanly with zero errors (even without strict mode). The project is in a deployable state.

## Recommendations

### 1. Wire up Web Workers for processing (P1, Effort: M)
The infrastructure exists. Connect `useProcessing.ts` to `geoWorker.ts` so that `processGeoJsonToH3` runs off the main thread. This is the highest-impact change for user experience. The worker types and message protocol are already defined. Estimated work: modify `useProcessing.process()` to post messages to a Worker instead of calling the function directly, handle PROGRESS/RESULT/ERROR messages.

### 2. Enable TypeScript strict mode and eliminate `any` (P1, Effort: M)
Add `"strict": true` to `tsconfig.json`. Fix the resulting ~30-50 type errors. This catches null-safety bugs before they reach users. Start with `services/geoProcessor.ts` (8 `any` occurrences) since it is the data processing core where type errors have the most impact.

### 3. Split the bundle with dynamic imports (P2, Effort: S)
Lazy-load `@turf/turf` and the map components (`HexMap`, `react-leaflet`) since they are only needed after file upload and after processing completes, respectively. This could cut initial load from 305 KB gzipped to under 100 KB. Use `React.lazy()` for the views and Vite's `manualChunks` for vendor splitting.

### 4. Add hook and integration tests (P2, Effort: L)
Priority order: (a) `useProcessing` multi-layer merge and cancellation, (b) `handleCsvMapped` coordinate validation in `useLayerManager`, (c) `FileUpload` parsing for each format. Use `@testing-library/react` for hook tests. This protects the most fragile user-facing flows.

### 5. Fix the rollup vulnerability and patch dependencies (P2, Effort: S)
Run `npm audit fix` to resolve the high-severity rollup CVE. Upgrade patch-level dependencies (`react`, `@turf/turf`, `vitest`, `typescript`). Defer major version upgrades (`vite` 6->8, `shpjs` 5->6, `@tmcw/togeojson` 5->7) to a dedicated session where you can test for breaking changes.

## Decision Points for CEO

1. **Worker threading vs. shipping features**: Wiring up the Web Worker is the right engineering call but has no visible feature impact. It prevents the frozen-tab problem for large datasets. If your current users mostly upload small files (<1k features), this can wait behind feature work. If you are targeting GIS professionals with large datasets, do this first.

2. **Bundle splitting priority**: The 990 KB bundle loads in ~1s on broadband but 3-5s on mobile. If HexaScale is primarily a desktop tool, this is low priority. If you plan to share the demo link widely (marketing, social), optimize first impressions.

3. **Moving source files under `src/`**: This is a cleanup task with zero user impact but moderate git churn. Worth doing if you plan to add contributors or open-source the project. Not worth doing if it remains a solo project.
