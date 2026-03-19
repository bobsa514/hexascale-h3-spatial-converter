# UI Redesign: Config Modal, Navbar, About Page

**Date:** 2026-03-19
**Status:** Approved

## Overview

Three changes: (1) redesign the LayerConfigModal for a cleaner, more compact layout, (2) add navigation links to the top banner, (3) add a full-page About view.

## Change 1: LayerConfigModal Redesign

### Header
- Title: "Attribute Configuration" (was filename as title)
- Subtitle row: `[POLYGON badge] nyc_census.json` (badge + filename side by side)
- Close button (X) top-right, unchanged

### "Select Attribute to Add" section
- Section label: "Select Attribute to Add"
- Search icon (magnifying glass) in the select dropdown
- `+ ▾` icons on the right of the dropdown
- Blue "Add" button, same as current

### "Configured Attributes" section
- New section header label: **"Configured Attributes"** above the list
- Empty state: unchanged ("No attributes configured yet. Add one above.")

### Each attribute card — horizontal 3-column layout

Replace the current 2x2 grid with a single row:

```
[Source Column ▾]  [Output Name input]  [Type ▾] (i)
```

- **Source Column**: dropdown (select) — allows changing the source column after adding. Currently it's a static text display.
- **Output Name**: text input, same as current. Blue text for valid, orange for errors.
- **Type**: dropdown with the same options as current (ID, Categorical, Intensive, Extensive variants). Next to it: an **(i)** info icon.
- **(i) tooltip**: on hover/click, shows the Approximate vs Exact Area explanation. Replaces the always-visible help text paragraph.
- **Delete button (trash)**: always visible in the top-right corner of the card. Currently hidden behind hover.

### Ring Aggregation row

Below the 3-column row, inside the same card:

```
RING AGGREGATION
[toggle] Ring 1   [toggle] Ring 2   [toggle] Ring 3   [toggle] Ring 6
```

- Toggle switches (pill-style on/off) replace the current bordered buttons.
- Active: blue background, white circle right. Inactive: gray background, gray circle left.
- Same ring sizes as current: 1, 2, 3, 6.
- Same logic: updates `ringSizes[]` and `ringSize` on the column config.
- Hidden for ID and Categorical columns (same as current).

### Validation
- Output name empty/conflict logic: unchanged.
- Point aggregation dropdown: still shown for Point layers when type is not ID/Categorical.

## Change 2: Navbar

### Current
```
[⬡ HexaScale logo+text]                    [processing status]
```

### New
```
[⬡ HexaScale logo+text]        [H3-fy]  [About]  [processing status]
```

- **H3-fy**: navigates to the main app (setup/results). Active state: blue text + blue bottom border. This is the default active tab.
- **About**: navigates to the About page. Active state: same blue treatment.
- Processing status indicator stays on the right (only visible during processing).
- Clicking the HexaScale logo still triggers `startOver` (same as current).
- Nav links are simple text, no buttons. Font-size 14px, gray-400 inactive, blue-400 active.

### Routing
- Add `'about'` to the view state: `view: 'setup' | 'results' | 'about'`
- No react-router. State-based switching in App.tsx.
- When on About page, the "H3-fy" link goes back to setup (or results if processing was completed).

## Change 3: About Page

Full-page view rendered when `view === 'about'`. Centered content, max-width ~700px.

### Content sections (in order):

1. **Page header**
   - Title: "About HexaScale"
   - Subtitle: "Convert geospatial data into H3 hexagonal grids — entirely in your browser."

2. **What is H3?**
   - Brief explanation of Uber's H3 hexagonal grid system
   - Why hexagons are better than squares (equal neighbor distances, no edge/corner ambiguity, smooth spatial aggregation)

3. **Methodology**
   - Intensive vs extensive variable handling
   - Area-weighted averaging for intensive, proportional distribution for extensive
   - Conservation guarantee (sum of output = sum of input)
   - Exact Area mode: real polygon-hex intersection via turf.intersect()
   - Categorical columns: "largest overlap" assignment

4. **Privacy**
   - All processing happens in the browser via Web Workers
   - No data uploaded to any server
   - No backend, no data tracking

5. **Open Source**
   - MIT licensed
   - Link to GitHub repo: https://github.com/bobsa514/hexascale-h3-spatial-converter

6. **Author section** (at bottom, separated by a subtle divider)
   - Avatar placeholder (initial "B" in a circle)
   - Name: Boyang Sa
   - Links: boyangsa.com · GitHub

### Styling
- Same dark theme as the rest of the app (bg-gray-950 / bg-gray-900)
- Section icons/emojis optional — can use simple text headers
- Clean, readable typography. No heavy visual treatment.

## Files affected

| File | Change |
|------|--------|
| `components/LayerConfigModal.tsx` | Complete layout rewrite (same logic, new structure) |
| `App.tsx` | Add `'about'` to view state, add nav links in header, render AboutView |
| `views/AboutView.tsx` | New file — full About page content |
| `types.ts` | No changes (view state is local to App.tsx) |

## Out of scope
- No react-router
- No changes to processing logic
- No changes to ResultsView
- No changes to SetupView (other than what's affected by navbar)
