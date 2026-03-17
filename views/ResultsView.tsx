import React, { useState, useMemo } from 'react';
import { HexMap } from '../components/HexMap';
import { DataPreviewModal } from '../components/DataPreviewModal';
import { HexResult, Layer } from '../types';
import { RESULT_PREVIEW_ROW_LIMIT } from '../utils/constants';
import { Download, FileText, AlertTriangle, MapIcon } from 'lucide-react';

interface Props {
  results: HexResult[];
  layers: Layer[];
  warnings: string[];
  onDownloadCsv: () => void;
  onDownloadGeoJson: () => void;
  onBackToSetup: () => void;
  onStartOver: () => void;
}

export const ResultsView: React.FC<Props> = ({
  results,
  layers,
  warnings,
  onDownloadCsv,
  onDownloadGeoJson,
  onBackToSetup,
  onStartOver,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Collect union of all keys across all result rows (not just the first row)
  const allColumns = useMemo(() => {
    const keySet = new Set<string>();
    for (const row of results) {
      for (const k of Object.keys(row)) {
        if (k !== 'hexId') keySet.add(k);
      }
    }
    return Array.from(keySet);
  }, [results]);

  const columnTypes = useMemo(() => {
    const typeMap = new Map<string, 'Number' | 'Text'>();
    for (const col of allColumns) {
      for (const row of results) {
        const value = row[col];
        if (value === null || value === undefined) continue;
        if (typeof value === 'number' && Number.isFinite(value)) {
          typeMap.set(col, 'Number');
        } else {
          typeMap.set(col, 'Text');
        }
        break;
      }
      if (!typeMap.has(col)) typeMap.set(col, 'Text');
    }
    return typeMap;
  }, [allColumns, results]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)] animate-in fade-in zoom-in-95 duration-500">
      {/* Results Sidebar */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-white mb-2">Processing Complete</h2>
          <p className="text-gray-400 mb-6">
            Successfully merged {layers.length} layer{layers.length !== 1 ? 's' : ''} into{' '}
            {results.length.toLocaleString()} H3 hexagons.
          </p>

          {/* Warnings banner */}
          {warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-300 text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" />
                Processing Warnings
              </div>
              <ul className="text-xs text-yellow-200/80 space-y-1 max-h-32 overflow-y-auto">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={onDownloadCsv}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-transform hover:translate-y-[-2px]"
            >
              <Download className="w-5 h-5" /> Download CSV
            </button>
            <button
              onClick={onDownloadGeoJson}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-transform hover:translate-y-[-2px]"
            >
              <Download className="w-5 h-5" /> Download GeoJSON
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-5 h-5" /> Preview Data
            </button>
          </div>
        </div>

        <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4 flex-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Output Columns</h3>
          <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {allColumns.map(k => (
              <div key={k} className="flex items-center justify-between p-2 bg-gray-900 rounded border border-gray-800 text-sm">
                <span className="font-mono text-blue-300">{k}</span>
                <span className="text-xs text-gray-600">{columnTypes.get(k)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-auto">
          <button
            onClick={onBackToSetup}
            className="flex-1 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Back to Setup
          </button>
          <button
            onClick={onStartOver}
            className="flex-1 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden relative shadow-2xl">
        <HexMap hexData={results} />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <DataPreviewModal
          data={results.slice(0, RESULT_PREVIEW_ROW_LIMIT)}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
