import React, { useState, useRef, useCallback, Suspense } from 'react';
import { SetupView } from './views/SetupView';
import { CsvColumnMapper } from './components/CsvColumnMapper';
import { LayerConfigModal } from './components/LayerConfigModal';
import { useLayerManager } from './hooks/useLayerManager';
import { useProcessing } from './hooks/useProcessing';
import { useExport } from './hooks/useExport';
import { DEFAULT_H3_RESOLUTION } from './utils/constants';
import { downloadConfig, deserializeConfig } from './utils/projectConfig';
import { Map as MapIcon, Loader2, AlertTriangle, X as XIcon } from 'lucide-react';
import { getGeoType } from './utils/geoType';
import { analyzeColumnsLocally } from './services/columnInference';
import { ColumnType, PointAggregation, Layer } from './types';
import type { FeatureCollection } from 'geojson';
import type { AreaInterpolationMode } from './types';
import sampleData from './assets/sample-data.json';

// Lazy-load ResultsView (includes HexMap + Leaflet) — only needed after processing
const ResultsView = React.lazy(() =>
  import('./views/ResultsView').then(m => ({ default: m.ResultsView }))
);

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'results'>('setup');
  const [h3Resolution, setH3Resolution] = useState(DEFAULT_H3_RESOLUTION);
  const configInputRef = useRef<HTMLInputElement>(null);

  const lm = useLayerManager();
  const proc = useProcessing();
  const { downloadCsv, downloadGeoJson } = useExport(proc.results, lm.layers, h3Resolution);

  // Merge errors from both hooks
  const error = proc.error || lm.analyzeError;
  const clearError = () => { proc.setError(null); lm.setAnalyzeError(null); };

  const status = lm.analyzing ? 'analyzing' as const : proc.status;

  // Collect all output names across layers for cross-layer validation
  const allOutputNames = lm.layers.flatMap(l => l.activeColumns.map(c => c.outputName));

  const handleProcess = async () => {
    const success = await proc.process(lm.layers, h3Resolution);
    if (success) setView('results');
  };

  const startOver = () => {
    lm.clearAll();
    proc.reset();
    setView('setup');
  };

  const handleSaveConfig = () => downloadConfig(h3Resolution, lm.layers);

  const handleLoadConfig = () => configInputRef.current?.click();

  const handleConfigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const config = deserializeConfig(evt.target?.result as string);
        setH3Resolution(config.h3Resolution);
        proc.setError(null);
        // Store layer configs — they'll auto-apply when matching files are uploaded
        lm.loadPendingConfigs(config);
        const fileNames = config.layers.map(l => l.fileName).join(', ');
        alert(`Config loaded (resolution ${config.h3Resolution}). Please re-upload: ${fileNames}. Column settings will be restored automatically.`);
      } catch (err: any) {
        proc.setError('Failed to load config: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // One-click demo: auto-configure sample data and process immediately
  const handleQuickDemo = useCallback(async () => {
    const data = sampleData as unknown as FeatureCollection;

    const type = getGeoType(data);
    const props = data.features[0]?.properties || {};
    const attrs = Object.keys(props);

    const rawCols = attrs.map(key => ({ name: key, sample: (props as Record<string, unknown>)[key] }));
    const suggestions = await analyzeColumnsLocally(rawCols, type);

    const activeColumns = suggestions
      .filter(s => s.type !== ColumnType.IGNORE)
      .map(s => ({
        id: crypto.randomUUID(),
        name: s.name!,
        outputName: s.name!,
        sampleValue: (props as Record<string, unknown>)[s.name!],
        type: s.type || ColumnType.EXTENSIVE,
        extensiveMode: 'fast' as AreaInterpolationMode,
        pointAggregation: s.pointAggregation || PointAggregation.COUNT,
        ringSize: 0,
      }));

    const layer: Layer = {
      id: crypto.randomUUID(),
      fileName: 'sample-data.geojson',
      data,
      geoType: type,
      availableAttributes: attrs,
      activeColumns,
      aiSuggestions: {},
    };

    // Set the layer in state so downloads work, then process
    lm.addLayerDirect(layer);
    const success = await proc.process([layer], h3Resolution);
    if (success) setView('results');
  }, [h3Resolution, proc, lm]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans selection:bg-blue-500/30">

      {/* Navbar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={startOver}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <MapIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">HexaScale</h1>
          </div>
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
        {status !== 'idle' && status !== 'completed' && (
          <div className="px-6 pb-3">
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200"
                style={{ width: `${proc.progressPct}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500 font-mono">{proc.progressPct}%</div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'setup' && (
          <SetupView
            layers={lm.layers}
            h3Resolution={h3Resolution}
            setH3Resolution={setH3Resolution}
            status={status}
            onProcess={handleProcess}
            onDataLoaded={lm.handleDataLoaded}
            onCsvLoaded={lm.handleCsvLoaded}
            onError={(m) => proc.setError(m)}
            onEditLayer={(id) => lm.setEditingLayerId(id)}
            onRemoveLayer={lm.removeLayer}
            onSaveConfig={handleSaveConfig}
            onLoadConfig={handleLoadConfig}
            allOutputNames={allOutputNames}
            onQuickDemo={handleQuickDemo}
          />
        )}
        {view === 'results' && (
          <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          }>
            <ResultsView
              results={proc.results}
              layers={lm.layers}
              warnings={proc.warnings}
              onDownloadCsv={downloadCsv}
              onDownloadGeoJson={downloadGeoJson}
              onBackToSetup={() => { proc.setStatus('idle'); setView('setup'); }}
              onStartOver={startOver}
            />
          </Suspense>
        )}
      </main>

      {/* Hidden config file input */}
      <input
        ref={configInputRef}
        type="file"
        className="hidden"
        accept=".json,.hexascale.json"
        onChange={handleConfigFileChange}
      />

      {/* Config Modal */}
      {lm.editingLayerId && lm.layers.find(l => l.id === lm.editingLayerId) && (
        <LayerConfigModal
          layer={lm.layers.find(l => l.id === lm.editingLayerId)!}
          allOutputNames={allOutputNames}
          onUpdate={lm.updateLayer}
          onClose={() => lm.setEditingLayerId(null)}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-4 bg-red-900/90 text-white rounded-xl shadow-2xl border border-red-700 flex items-center z-[1500] animate-in slide-in-from-bottom-5">
          <AlertTriangle className="w-5 h-5 mr-3" />
          <span className="max-w-md">{error}</span>
          <button onClick={clearError} className="ml-4 text-red-200 hover:text-white">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CSV Column Mapper Modal */}
      {lm.tempCsvData && (
        <CsvColumnMapper
          columns={Object.keys(lm.tempCsvData.data[0] || {})}
          onConfirm={(latCol, lonCol) => {
            const result = lm.handleCsvMapped(latCol, lonCol);
            if (result?.warnings && result.warnings.length > 0) {
              proc.setError(result.warnings.join(' '));
            }
          }}
          onCancel={() => lm.setTempCsvData(null)}
        />
      )}
    </div>
  );
};

export default App;
