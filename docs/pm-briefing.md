# PM Briefing -- HexaScale -- 2026-03-14

## Product Health

HexaScale is a functional, shipped product with a polished UI, deployed at hexascale.boyangsa.com on Vercel. The core conversion pipeline (upload, configure, process, visualize, export) works end-to-end for all four input formats (GeoJSON, CSV, KML/KMZ, Shapefile) and both output formats (CSV, GeoJSON). The codebase is clean and well-structured: 11 source components/views, 3 hooks, 2 services, 5 utils, and 6 test files covering 63 tests. The product's differentiation -- intensive vs. extensive variable handling, precise polygon mode, multi-layer merging, ring aggregation, and full client-side privacy -- is real and meaningful.

**Current stage**: Feature-complete MVP. Post-launch stabilization. No active users or feedback signals are instrumented.

**Key quality gaps**: No analytics to know if anyone is using it. No SEO or discoverability. Processing runs on the main thread, so large files freeze the UI. The map is limited to 1,000 hexes before viewport filtering kicks in, which is low. No mobile responsiveness (the layout assumes desktop).

## Feature Inventory

### Shipped (complete and working)
- Multi-format input: GeoJSON, CSV (with lat/lon mapper), KML, KMZ, Shapefile (.zip)
- Column configuration modal with per-column type selection (Intensive/Extensive/ID)
- Intensive vs. extensive variable handling for polygon disaggregation
- Fast and Precise polygon modes (centroid vs. turf.intersect)
- Point aggregation (Count, Sum, Average, Min, Max)
- Line geometry support (interpolated sampling)
- Multi-layer merging by hex ID
- Ring aggregation (spatial smoothing, k=1-8)
- Column inference (token-based auto-classification of column types)
- Cross-layer output name collision detection and prevention
- Choropleth map visualization with column selector and color legend
- Click-to-inspect hex values on map
- Viewport-based hex rendering for large datasets
- CSV and GeoJSON export with sensible filenames
- Sample dataset with onboarding banner
- Project config save/load (serialized JSON)
- Data preview modal (input and output)
- Progress bar with per-layer status and cancel support
- User-facing error messages with technical-to-friendly mapping
- CI pipeline (GitHub Actions: build + test)
- 63 unit tests covering core logic

### Missing / Gaps
- No analytics or usage tracking
- No CHANGELOG
- No SEO metadata (no Open Graph tags, no description meta, no sitemap)
- No Web Worker for processing (main thread blocking)
- No mobile-responsive layout
- Tailwind CSS loaded via CDN script tag (not compiled)
- Version still at 0.0.0 in package.json
- Config load does not restore layer data (requires re-upload)
- No undo/history in configuration
- No batch/folder upload
- No GeoParquet, FlatGeobuf, or TopoJSON support
- No API or CLI for programmatic use
- No documentation site or landing page beyond README

## User Journey Gaps

**1. Discovery and first impression**: A user who finds the site has no idea what it does until they read the upload area. There is no hero section, no visual explanation, no "before and after" example. The onboarding banner is minimal. There is no way to see results without uploading your own file first (the sample dataset requires clicking, then configuring columns manually -- a multi-step process for someone who just wants to see what the tool does).

**2. Large file handling**: Processing runs on the main thread. For a polygon dataset with 10,000+ features at resolution 8+ with precise mode, the browser will freeze for minutes. There is no Web Worker, no streaming, and no way to estimate processing time before starting. The cancel button exists but only checks a flag between layers, not mid-layer.

**3. Understanding column types**: The Intensive vs. Extensive distinction is the product's key differentiator, but the UI explains it with two words ("Avg" and "Sum/Fast/Precise"). A user who does not already understand areal interpolation will not know which to pick. The README has a good table, but that knowledge is not in the app.

**4. Map performance**: MAX_HEX_RENDER_COUNT is 1,000, and VIEWPORT_HEX_RENDER_COUNT is 5,000. A resolution-8 conversion of a mid-sized county can produce 50,000+ hexes. The user will see "showing viewport subset" and a laggy map. This is the most visible quality issue for power users.

**5. Re-processing friction**: If a user wants to change one column's type after seeing results, they must click "Back to Setup", re-configure, and re-process everything. There is no way to re-process a single layer or adjust settings incrementally.

**6. No sharing or collaboration**: Results cannot be shared via URL, embedded, or saved as a project file (config save does not include data). Each session is ephemeral.

## Backlog Recommendations (prioritized)

| Priority | Feature/Task | Effort | Impact | Rationale |
|----------|-------------|--------|--------|-----------|
| P0 | **Add basic analytics** (Plausible or Vercel Analytics) | 1 hour | High | You have zero signal on whether anyone uses this. Without analytics, you cannot prioritize anything else with confidence. |
| P0 | **SEO + meta tags** (description, OG image, keywords, sitemap) | 2 hours | High | The site is invisible to search engines. Anyone searching "h3 converter online" or "geojson to h3" should find this. Zero organic discovery right now. |
| P1 | **"One-click demo" flow** -- auto-process sample dataset and show results instantly | 3 hours | High | The highest-leverage onboarding improvement. A visitor should see a working choropleth map within 5 seconds of landing. Currently it takes 6+ clicks and understanding column config. |
| P1 | **Move processing to Web Worker** | 8 hours | High | The single worst UX issue for real workloads. Main-thread processing freezes the entire browser tab. This blocks adoption by anyone with serious data. |
| P1 | **In-app explainer for Intensive vs. Extensive** | 2 hours | Medium | This is the product's core value proposition, but users must already know the concept to use it correctly. A tooltip, inline help, or "learn more" link with a visual example would transform comprehension. |
| P2 | **Compile Tailwind at build time** (replace CDN script tag) | 1 hour | Medium | The CDN script tag means Tailwind is parsed at runtime, increasing load time and preventing tree-shaking. This is a quick win for performance and production quality. |
| P2 | **Increase map rendering limits** (use deck.gl or canvas-based rendering) | 12 hours | Medium | Leaflet with SVG polygons cannot handle 10K+ hexes. deck.gl's H3HexagonLayer renders 100K+ hexes at 60fps. This is the ceiling on the product's ability to handle real datasets. |
| P2 | **Add GeoParquet input support** | 6 hours | Medium | GeoParquet is rapidly becoming the standard for large geospatial datasets. Supporting it would differentiate HexaScale from every other browser-based tool and signal that it is built for serious analysts. |
| P3 | **Mobile-responsive layout** | 4 hours | Low | The layout breaks on mobile. But the target user (analysts, data scientists) almost always uses desktop. Low priority unless analytics show mobile traffic. |
| P3 | **Landing page / marketing site** | 8 hours | Low-Medium | A proper landing page with use cases, screenshots, and comparison to Python alternatives would help organic search. But only invest after analytics confirm there is traffic to convert. |
| P3 | **Create CHANGELOG.md** | 30 min | Low | Required by the project's own documentation-first rules. Quick housekeeping. |

## ICP and Positioning

### Ideal Customer Profile
**Primary**: GIS analysts and urban planners at government agencies or consulting firms who need to convert administrative boundary data (census tracts, zip codes, parcels) into H3 grids for spatial analysis. They currently use Python (tobler, h3-py) but face friction with environment setup, data sharing with non-technical colleagues, and data privacy policies that prohibit uploading to cloud services.

**Secondary**: Data scientists at logistics, real estate, or insurance companies who work with point data (delivery locations, property listings, claims) and need H3 aggregation for spatial pattern analysis. They want a quick ad-hoc tool that does not require spinning up a Jupyter notebook.

**Tertiary**: Students and researchers who need H3 grids for coursework or publications but do not have Python proficiency.

### Positioning Statement
"HexaScale is the fastest way to convert geospatial data into H3 hexagonal grids -- no code, no installation, no data uploaded to any server. It correctly handles the difference between intensive and extensive variables, which most tools get wrong."

### Competitive Landscape
- **h3-py + tobler (Python)**: More powerful, but require coding. HexaScale wins on accessibility and privacy.
- **Unfolded Studio (Foursquare)**: Commercial, cloud-based, requires data upload. HexaScale wins on privacy and cost.
- **kepler.gl**: Visualization-focused, does not do areal interpolation. HexaScale wins on analytical correctness.
- **H3-js playground (uber.github.io/h3)**: Demo only, no data processing. HexaScale is the full tool.

## Risks

**1. Zero validated demand.** The product has real technical merit, but there is no evidence that anyone is using it. Without analytics (P0), every subsequent investment is a guess. Risk: building features nobody asked for.

**2. Performance ceiling blocks power users.** The people who would most benefit from this tool (processing large polygon datasets) are exactly the users who will hit the main-thread freeze and 1K-hex map limit. If their first experience is a frozen browser, they will not come back.

**3. Intensive/Extensive concept is too niche.** The core differentiator (correct areal interpolation) is only understood by users who already know spatial statistics. Without in-app education, most users will treat it like any other H3 converter and miss the value proposition.

**4. CDN-loaded Tailwind is a production liability.** Loading Tailwind via a CDN script tag in production means (a) performance is dependent on a third-party CDN, (b) styles are not tree-shaken, (c) the approach is explicitly not recommended by the Tailwind team for production use. This could cause style loading failures or slow initial render.

**5. No feedback mechanism.** There is no way for users to report bugs, request features, or ask questions. No email, no GitHub issue link in the UI, no feedback widget. The product is deployed into a void.
