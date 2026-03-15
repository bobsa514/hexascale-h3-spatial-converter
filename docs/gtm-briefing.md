# GTM Briefing — HexaScale — 2026-03-14

## GTM Status

Pre-launch. The tool is live and deployed at https://hexascale.boyangsa.com/ but has received no deliberate distribution. No analytics are installed. No social posts, no community posts, no Product Hunt listing. Zero baseline traffic data exists.

## Top 3 Tasks (ranked by growth leverage)

1. [P1 / 2 hrs] Add analytics + SEO meta tags — Without these, no launch action can be measured and every shared link renders as a plain URL. Vercel Analytics (one config line) + meta description + Open Graph tags in index.html. Depends on: none.

2. [P1 / 2 hrs] Post "Show HN" on Hacker News — Highest single-post leverage for a technical browser tool with a clear problem/solution. Lead with the problem (irregular polygon comparison is unreliable), name the Python alternative friction, link to live demo. Target Tuesday/Wednesday 9am PT. Depends on: analytics being live first.

3. [P2 / 1 hr] LinkedIn post framing the intensive vs. extensive silent error — Your clean energy / EV / urban analytics network is the exact ICP. A problem-framing post with a screenshot seeds warm social proof before the HN post. Depends on: SEO/OG tags being live so the link preview renders.

## Current Positioning

**Assessment: Technically accurate but undersold.**

The README positions HexaScale as "Convert geospatial data into H3 hexagonal grids — entirely in your browser." This is factually correct but generic. The real differentiation — correct handling of intensive vs. extensive variables — is buried in a subsection.

**What's working:**
- The "Why HexaScale?" section clearly names the problem (irregular geometries are unreliable for comparison)
- Direct callout of Python alternatives (tobler, h3fy) as the existing option
- Privacy angle (no data leaves your machine) is a real selling point

**What needs improvement:**
- The headline should lead with the analytical correctness, not just "convert data"
- No visual proof — no screenshots, no GIFs, no before/after comparison
- No social proof — no testimonials, no user counts, no "used by" logos
- The intensive vs. extensive distinction needs a concrete example ("if you convert census population data to H3 and treat it like density, your results will be wrong by up to 10x")

## Target Audience

### Primary ICP: GIS Analysts at Government/Consulting
- Convert census tracts, zip codes, administrative boundaries to H3
- Need correct areal interpolation (intensive vs. extensive)
- Privacy-sensitive (government data policies)
- Frustrated by Python environment setup when they just need a quick conversion

### Secondary ICP: Data Scientists in Logistics/Real Estate/Insurance
- Point data aggregation (delivery locations, property listings, claims)
- Want quick ad-hoc H3 aggregation without Jupyter notebooks
- Familiar with H3 from Uber/DoorDash blog posts

### Tertiary ICP: Students and Researchers
- Need H3 grids for coursework or publications
- Don't have Python proficiency
- Looking for "geojson to h3 online" or "h3 converter"

## Competitive Landscape

| Competitor | Type | Strengths | HexaScale Advantage |
|-----------|------|-----------|-------------------|
| tobler (Python) | Library | Full-featured areal interpolation | No code needed, browser-based |
| h3-py / h3fy (Python) | Library | Scriptable, batch processing | No environment setup |
| kepler.gl | Web app | Beautiful visualization | Correct variable type handling |
| Unfolded Studio | Cloud SaaS | Enterprise features | Free, private, no data upload |
| Felt | Web app | Collaborative maps | H3 conversion with variable types |

**HexaScale's moat**: No browser-based tool correctly handles intensive vs. extensive variable distinction during H3 conversion. This is a real analytical gap, not a marketing claim.

## Distribution & Discoverability

**Current state: Zero.**
- No SEO metadata (no description, no OG tags, no sitemap)
- No Google indexing signal (no search console setup)
- No social media presence for the tool
- No community posts (HN, Reddit r/gis, GIS StackExchange)
- No Product Hunt listing
- No blog posts or tutorials
- GitHub repo exists but has no Topics tags set

## Growth Opportunities

| Priority | Channel/Action | Effort | Expected Impact |
|----------|---------------|--------|-----------------|
| P0 | Analytics + SEO meta tags | 2 hrs | Foundation — enables all measurement |
| P1 | Show HN post | 2 hrs | 5K-50K impressions if it catches. Best ROI for technical tools. |
| P1 | LinkedIn post (problem-framing) | 1 hr | Warm audience, social proof seeding |
| P2 | r/gis + r/datascience Reddit posts | 1 hr | Targeted communities with exact ICP |
| P2 | GIS StackExchange answers | 2 hrs | Long-tail SEO, credibility building |
| P2 | Product Hunt launch | 3 hrs | Broad visibility, backlinks |
| P3 | Blog post: "The silent error in spatial analysis" | 4 hrs | SEO content, shareable reference |
| P3 | YouTube demo video (2-3 min) | 3 hrs | Visual proof, embeddable |
| P3 | GitHub Topics + Awesome GIS lists | 1 hr | Long-tail discovery |

## Content Strategy

### Flagship content piece: "The Silent Error in Spatial Analysis"
Frame around the problem: when you convert polygon data (like census population by tract) to H3, treating population the same as population density gives you wrong results. Most tools do this. HexaScale doesn't.

**Format options:**
- LinkedIn article (reaches warm network immediately)
- Dev.to / Medium post (indexable, shareable)
- Blog on custom domain (best for SEO long-term)

### Supporting content:
- "GeoJSON to H3 in 30 seconds" — quick tutorial GIF
- "Why H3 hexagons instead of square grids?" — educational primer
- "How HexaScale handles Shapefiles in the browser" — technical deep dive

## Launch Readiness

- [x] Product is functional and deployed
- [x] Custom domain active (hexascale.boyangsa.com)
- [x] 63 tests passing, clean build
- [ ] Vercel Analytics or Plausible installed
- [ ] meta description added to index.html
- [ ] Open Graph tags added to index.html (og:title, og:description, og:image)
- [ ] Demo screenshot or GIF added to README
- [ ] GitHub repo Topics tags set (h3, geospatial, gis, hexagon, converter, shapefile, geojson)
- [ ] LinkedIn post drafted and scheduled
- [ ] Show HN post drafted

## Recommendations

### 1. Install analytics NOW (P0, 15 min)
Vercel Analytics is free and zero-config. Without it, you cannot measure anything. Every hour the site is live without analytics is wasted data.

### 2. Add SEO + Open Graph tags (P0, 1 hr)
Add to `index.html`: `<meta name="description">`, `og:title`, `og:description`, `og:image`. This makes every shared link render with a proper preview card instead of a bare URL. Critical before any social posting.

### 3. Draft and post to LinkedIn first (P1, 1 hr)
Your existing network in clean energy / EV / urban analytics is the exact target audience. Lead with the problem ("Most spatial conversion tools silently give you wrong results for population data"), show a screenshot, link to the tool. This creates warm social proof before the HN post.

### 4. Submit to Show HN (P1, 2 hrs)
Format: "Show HN: HexaScale — Convert geospatial data to H3 hexagons in your browser"
Lead with the problem, name the Python alternative, link to live demo. Post Tuesday/Wednesday 9am PT for maximum visibility.

### 5. Set GitHub repo Topics and add to Awesome lists (P2, 1 hr)
Tags: h3, geospatial, gis, hexagon, converter, shapefile, geojson, spatial-analysis. Submit to awesome-geospatial and awesome-h3 lists. Low effort, permanent discoverability.
