# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the LayerConfigModal for compact horizontal layout, add H3-fy/About nav links, and create an About page.

**Architecture:** Three independent UI changes in separate commits. LayerConfigModal is a full rewrite of the JSX (same logic, new structure). Navbar gets two links and the view state gains an `'about'` option. AboutView is a new static page component.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons

---

## File Map

| File | Role | Tasks |
|------|------|-------|
| `components/LayerConfigModal.tsx` | Config modal — complete layout rewrite | Task 1 |
| `views/AboutView.tsx` | New file — About page content | Task 2 |
| `App.tsx` | Navbar links, view routing, AboutView rendering | Task 3 |

---

## Task 1: Redesign LayerConfigModal

**Files:**
- Modify: `components/LayerConfigModal.tsx` (full JSX rewrite, keep all logic functions unchanged)

**Important:** The outer modal wrapper (overlay div, container div, scrollable content wrapper) and the footer "Done" button remain unchanged. Only the three inner sections (header, add attribute, configured columns) are replaced. The progress bar below the navbar in App.tsx also remains unchanged.

- [ ] **Step 1: Rewrite the header section**

Replace lines 92-109 (the header). New header has "Attribute Configuration" as title, badge+filename on subtitle row:

```tsx
{/* Header */}
<div className="flex items-center justify-between p-5 border-b border-gray-800">
  <div>
    <h3 className="text-lg font-bold text-white">Attribute Configuration</h3>
    <div className="flex items-center gap-2 mt-1">
      <span className="bg-blue-900/50 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-800 uppercase font-mono font-bold">
        {layer.geoType}
      </span>
      <span className="text-sm text-gray-400">{layer.fileName}</span>
    </div>
  </div>
  <button
    onClick={onClose}
    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
  >
    <X className="w-5 h-5" />
  </button>
</div>
```

- [ ] **Step 2: Update the "Select Attribute to Add" section**

Replace lines 114-141. Add search icon, update icon placement:

```tsx
{/* Add Attribute Section */}
<div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
  <label className="text-sm font-semibold text-gray-300 block mb-2">Select Attribute to Add</label>
  <div className="flex gap-2">
    <div className="relative flex-1">
      <select
        className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-300 focus:border-blue-500 outline-none appearance-none"
        value={selectedAttr}
        onChange={(e) => setSelectedAttr(e.target.value)}
      >
        <option value="" disabled>Choose a column...</option>
        {layer.availableAttributes.map(attr => (
          <option key={attr} value={attr}>{attr}</option>
        ))}
      </select>
      <div className="absolute right-3 top-2.5 pointer-events-none flex items-center gap-1 text-gray-500">
        <Plus className="w-3.5 h-3.5" />
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
    <button
      onClick={addColumn}
      disabled={!selectedAttr}
      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-semibold transition-colors"
    >
      Add
    </button>
  </div>
</div>
```

Add `Search` and `ChevronDown` to the lucide-react import at the top:

```tsx
import { X, Plus, Trash2, AlertCircle, ChevronDown, Info } from 'lucide-react';
```

- [ ] **Step 3: Add "Configured Attributes" section label and rewrite the attribute cards**

Replace lines 143-302 (the entire configured columns list). New layout: section header, then horizontal 3-column cards with toggle switches.

```tsx
{/* Configured Attributes */}
<div>
  <label className="text-sm font-semibold text-gray-300 block mb-3">Configured Attributes</label>
  <div className="space-y-3">
    {layer.activeColumns.length === 0 ? (
      <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
        No attributes configured yet. Add one above.
      </div>
    ) : (
      layer.activeColumns.map((col) => {
        const hasConflict = isOutputNameConflict(col.outputName, col.id);
        const isEmpty = isOutputNameEmpty(col.outputName);
        const hasError = hasConflict || isEmpty;
        return (
          <div key={col.id} className={`bg-gray-800/70 rounded-xl border p-4 relative transition-colors ${hasError ? 'border-orange-600/50' : 'border-gray-700'}`}>

            {/* Delete — always visible */}
            <button
              onClick={() => removeColumn(col.id)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Row 1: Source | Output | Type */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 pr-8 items-end">
              {/* Source Column — dropdown */}
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider block mb-1">Source Column</label>
                <select
                  className="w-full bg-gray-900 border border-gray-600 rounded-md text-sm px-2.5 py-1.5 text-gray-300 outline-none appearance-none"
                  value={col.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    updateColumn(col.id, {
                      name: newName,
                      outputName: col.outputName === col.name ? newName : col.outputName,
                    });
                  }}
                >
                  {layer.availableAttributes.map(attr => (
                    <option key={attr} value={attr}>{attr}</option>
                  ))}
                </select>
              </div>

              {/* Output Name */}
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider flex items-center gap-1 mb-1">
                  Output Name (CSV Header)
                  {hasError && <AlertCircle className="w-3 h-3 text-orange-400" />}
                </label>
                <input
                  type="text"
                  value={col.outputName}
                  onChange={(e) => updateColumn(col.id, { outputName: e.target.value })}
                  className={`w-full bg-gray-900 border rounded-md text-sm px-2.5 py-1.5 focus:border-blue-500 outline-none ${hasError ? 'border-orange-500 text-orange-200' : 'border-gray-600 text-blue-200'}`}
                />
                {isEmpty && (
                  <div className="text-[10px] text-orange-400 mt-0.5">Output name cannot be empty</div>
                )}
                {hasConflict && !isEmpty && (
                  <div className="text-[10px] text-orange-400 mt-0.5">Conflicts with another column</div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider block mb-1">Type</label>
                <div className="flex items-center gap-1.5">
                  <select
                    className="flex-1 bg-gray-900 border border-gray-600 rounded-md text-sm px-2.5 py-1.5 text-gray-300 outline-none appearance-none"
                    value={
                      layer.geoType === GeoType.POLYGON && col.type === ColumnType.EXTENSIVE
                        ? (col.extensiveMode === 'precise' ? 'EXTENSIVE_PRECISE' : 'EXTENSIVE_FAST')
                        : col.type
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (layer.geoType === GeoType.POLYGON && v === 'EXTENSIVE_PRECISE') {
                        updateColumn(col.id, { type: ColumnType.EXTENSIVE, extensiveMode: 'precise' as AreaInterpolationMode });
                      } else if (layer.geoType === GeoType.POLYGON && v === 'EXTENSIVE_FAST') {
                        updateColumn(col.id, { type: ColumnType.EXTENSIVE, extensiveMode: 'fast' as AreaInterpolationMode });
                      } else {
                        updateColumn(col.id, {
                          type: v as ColumnType,
                          extensiveMode: layer.geoType === GeoType.POLYGON ? defaultPolygonExtensiveMode : 'fast'
                        });
                      }
                    }}
                  >
                    <option value={ColumnType.ID}>ID</option>
                    <option value={ColumnType.CATEGORICAL}>Categorical (Text)</option>
                    <option value={ColumnType.INTENSIVE}>Intensive (Avg)</option>
                    {layer.geoType === GeoType.POLYGON ? (
                      <>
                        <option value="EXTENSIVE_FAST">Extensive (Approximate)</option>
                        <option value="EXTENSIVE_PRECISE">Extensive (Exact Area)</option>
                      </>
                    ) : (
                      <option value={ColumnType.EXTENSIVE}>Extensive (Sum)</option>
                    )}
                  </select>
                  {/* Info tooltip */}
                  {layer.geoType === GeoType.POLYGON && (
                    <div className="relative group/tip">
                      <Info className="w-4 h-4 text-gray-500 cursor-help" />
                      <div className="absolute right-0 top-6 z-50 w-64 p-3 bg-white text-gray-800 text-xs rounded-lg shadow-xl border border-gray-200 opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity">
                        <p><strong>Approximate:</strong> equal split across touched hexes, conservative but less spatially accurate.</p>
                        <p className="mt-1"><strong>Exact Area:</strong> hex∩polygon intersection, conservative and slower.</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Point aggregation — inline below type when applicable */}
                {layer.geoType === GeoType.POINT && col.type !== ColumnType.CATEGORICAL && col.type !== ColumnType.ID && (
                  <select
                    className="w-full mt-1.5 bg-gray-900 border border-gray-600 rounded-md text-sm px-2.5 py-1.5 text-gray-300 outline-none appearance-none"
                    value={col.pointAggregation}
                    onChange={(e) => updateColumn(col.id, { pointAggregation: e.target.value as PointAggregation })}
                  >
                    <option value={PointAggregation.COUNT}>Count</option>
                    <option value={PointAggregation.SUM}>Sum</option>
                    <option value={PointAggregation.AVERAGE}>Avg</option>
                    <option value={PointAggregation.MIN}>Min</option>
                    <option value={PointAggregation.MAX}>Max</option>
                  </select>
                )}
              </div>
            </div>

            {/* Row 2: Ring Aggregation — toggle switches */}
            {col.type !== ColumnType.ID && col.type !== ColumnType.CATEGORICAL && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider block mb-2">Ring Aggregation</label>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {[1, 2, 3, 6].map(r => {
                    const currentSizes = col.ringSizes?.length ? col.ringSizes : (col.ringSize ? [col.ringSize] : []);
                    const isActive = currentSizes.includes(r);
                    return (
                      <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                        <button
                          onClick={() => {
                            const newSizes = isActive
                              ? currentSizes.filter(s => s !== r)
                              : [...currentSizes, r].sort((a, b) => a - b);
                            updateColumn(col.id, {
                              ringSizes: newSizes,
                              ringSize: newSizes[0] || 0,
                            });
                          }}
                          className={`w-9 h-5 rounded-full relative transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-600'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${isActive ? 'right-0.5 bg-white' : 'left-0.5 bg-gray-400'}`} />
                        </button>
                        <span className={`text-sm ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>Ring {r}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
</div>
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`

Expected: clean build, no TypeScript errors.

- [ ] **Step 5: Manual visual test**

Run: `npm run dev`

Open http://localhost:3000, upload a polygon file, click Configure, verify:
- Header shows "Attribute Configuration" with badge + filename below
- Source Column is a dropdown
- Horizontal 3-column layout: Source | Output | Type
- (i) tooltip appears on hover next to Type dropdown (polygon layers only)
- Ring toggles are pill-style switches
- Delete button is always visible
- All existing logic still works (add column, remove, rename, type change)

- [ ] **Step 6: Commit**

```bash
git add components/LayerConfigModal.tsx
git commit -m "feat: redesign LayerConfigModal — compact horizontal layout, toggle switches, info tooltip"
```

---

## Task 2: Create AboutView

**Files:**
- Create: `views/AboutView.tsx`

- [ ] **Step 1: Create the AboutView component**

```tsx
// views/AboutView.tsx
import React from 'react';
import { Github, ExternalLink, Shield, Code2, Hexagon } from 'lucide-react';

interface Props {
  onNavigateToApp: () => void;
}

export const AboutView: React.FC<Props> = ({ onNavigateToApp }) => {
  return (
    <div className="max-w-[700px] mx-auto py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white">About HexaScale</h2>
        <p className="text-gray-400 mt-2">Convert geospatial data into H3 hexagonal grids — entirely in your browser.</p>
      </div>

      <div className="space-y-10">
        {/* What is H3? */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Hexagon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">What is H3?</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            H3 is a hierarchical hexagonal grid system developed by Uber. It divides the world into hexagonal cells at multiple resolutions. Hexagons are better than squares for spatial analysis — every neighbor is equidistant (no diagonal ambiguity), edges are shared evenly, and aggregation across cells is smooth and consistent.
          </p>
        </section>

        {/* Methodology */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Methodology</h3>
          </div>
          <div className="text-gray-300 leading-relaxed space-y-3">
            <p>
              HexaScale correctly distinguishes between <strong className="text-white">intensive</strong> variables
              (income, density, temperature — area-weighted average) and <strong className="text-white">extensive</strong> variables
              (population, count, volume — proportionally distributed). Most tools treat all variables the same, producing subtly wrong results.
            </p>
            <p>
              Both processing modes guarantee <strong className="text-white">total conservation</strong>: the sum of output values across all hexagons equals the input total. The <em>Exact Area</em> mode computes real polygon–hexagon intersection areas using geometric intersection, while <em>Approximate</em> mode distributes values equally across covered cells.
            </p>
            <p>
              <strong className="text-white">Categorical</strong> columns (text attributes like zone names) are assigned using a "largest overlap" strategy — each hexagon gets the value from the source polygon with the greatest intersection area.
            </p>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Privacy</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            All processing happens in your browser using Web Workers. No data is uploaded to any server. There is no backend. Your files never leave your machine.
          </p>
        </section>

        {/* Open Source */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Github className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Open Source</h3>
          </div>
          <p className="text-gray-300 leading-relaxed">
            HexaScale is MIT licensed and open source.{' '}
            <a
              href="https://github.com/bobsa514/hexascale-h3-spatial-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              View on GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </p>
        </section>

        {/* Author */}
        <section className="border-t border-gray-800 pt-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-700">
              B
            </div>
            <div>
              <div className="text-white font-semibold">Boyang Sa</div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <a href="https://boyangsa.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">boyangsa.com</a>
                <span className="text-gray-600">·</span>
                <a href="https://github.com/bobsa514" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add views/AboutView.tsx
git commit -m "feat: add AboutView — H3 explainer, methodology, privacy, open source, author"
```

---

## Task 3: Add navbar links and view routing

**Files:**
- Modify: `App.tsx:24,117-152,154-189`

- [ ] **Step 1: Update view state type and add imports**

At line 24, change:

```tsx
// OLD:
const [view, setView] = useState<'setup' | 'results'>('setup');
```

to:

```tsx
// NEW:
const [view, setView] = useState<'setup' | 'results' | 'about'>('setup');
```

Add the AboutView import near the top (after the ResultsView lazy import, around line 21):

```tsx
import { AboutView } from './views/AboutView';
```

No changes needed to the lucide-react import in App.tsx (existing icons suffice).

- [ ] **Step 2: Add nav links to the header**

Replace the navbar `<div>` (lines 122-139) with:

```tsx
<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
  <div className="flex items-center gap-8">
    {/* Logo */}
    <div className="flex items-center space-x-3 cursor-pointer" onClick={startOver}>
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
        <MapIcon className="w-5 h-5 text-white" />
      </div>
      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">HexaScale</h1>
    </div>
    {/* Nav links */}
    <nav className="flex items-center gap-6">
      <button
        onClick={() => setView(status === 'completed' ? 'results' : 'setup')}
        className={`text-sm font-medium pb-0.5 transition-colors ${
          view !== 'about'
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-400 hover:text-gray-300 border-b-2 border-transparent'
        }`}
      >
        H3-fy
      </button>
      <button
        onClick={() => setView('about')}
        className={`text-sm font-medium pb-0.5 transition-colors ${
          view === 'about'
            ? 'text-blue-400 border-b-2 border-blue-400'
            : 'text-gray-400 hover:text-gray-300 border-b-2 border-transparent'
        }`}
      >
        About
      </button>
    </nav>
  </div>
  {/* Processing status — right side */}
  {status !== 'idle' && status !== 'completed' && (
    <div className="flex items-center space-x-2 bg-blue-900/20 px-4 py-1.5 rounded-full border border-blue-900/50">
      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      <span className="text-sm font-mono text-blue-200">{proc.progressText || 'Processing...'}</span>
      {status === 'processing' && (
        <button onClick={proc.cancel} className="ml-2 text-red-400 hover:text-red-300 text-xs font-medium">
          Cancel
        </button>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 3: Add AboutView rendering in main content**

After the ResultsView Suspense block (around line 189), add:

```tsx
{view === 'about' && (
  <AboutView onNavigateToApp={() => setView('setup')} />
)}
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`

Expected: clean build, no TypeScript errors.

- [ ] **Step 5: Run all tests**

Run: `npm test`

Expected: all 78 tests pass (UI changes are visual only, no logic changed).

- [ ] **Step 6: Manual visual test**

Run: `npm run dev`

Verify:
- Navbar shows "HexaScale" logo + "H3-fy" + "About" links
- "H3-fy" has blue underline when on setup/results pages
- "About" has blue underline when on About page
- Clicking "About" shows the About page content
- Clicking "H3-fy" returns to setup (or results if processing was done)
- Processing status still shows correctly in the navbar during processing
- Clicking logo still resets to start

- [ ] **Step 7: Commit**

```bash
git add App.tsx
git commit -m "feat: add H3-fy and About nav links with view routing"
```

---

## Execution Order

| # | Task | Dependencies |
|---|------|-------------|
| 1 | LayerConfigModal redesign | None |
| 2 | AboutView page | None |
| 3 | Navbar + routing | Task 2 (imports AboutView) |

Tasks 1 and 2 are independent and can run in parallel. Task 3 depends on Task 2.
