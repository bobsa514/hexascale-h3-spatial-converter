import React, { useState, useMemo } from 'react';
import { HexMap } from '../components/HexMap';
import { DataPreviewModal } from '../components/DataPreviewModal';
import { HexResult, Layer, ColumnType, GeoType } from '../types';
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

const geometryMatchesLayer = (geometryType: string | undefined, layerType: GeoType): boolean => {
  if (!geometryType) return false;
  if (layerType === GeoType.POINT) return geometryType === 'Point' || geometryType === 'MultiPoint';
  if (layerType === GeoType.LINE) return geometryType === 'LineString' || geometryType === 'MultiLineString';
  if (layerType === GeoType.POLYGON) return geometryType === 'Polygon' || geometryType === 'MultiPolygon';
  return false;
};

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

  const qaSummary = useMemo(() => {
    const mixedGeometryLayers = layers.filter(layer => layer.mixedGeometryWarning).length;
    const configuredColumns = layers.reduce((sum, layer) => sum + layer.activeColumns.length, 0);
    const processingModes = {
      exactArea: 0,
      approximate: 0,
    };
    const extensiveChecks: Array<{
      outputName: string;
      inputTotal: number;
      outputTotal: number;
      relativeErrorPct: number;
    }> = [];

    for (const layer of layers) {
      for (const col of layer.activeColumns) {
        if (col.type !== ColumnType.EXTENSIVE) continue;

        if (layer.geoType === GeoType.POLYGON) {
          if (col.extensiveMode === 'precise') processingModes.exactArea++;
          else processingModes.approximate++;
        }

        const inputTotal = layer.data.features.reduce((sum, feature) => {
          if (!geometryMatchesLayer(feature.geometry?.type, layer.geoType)) return sum;
          const rawVal = parseFloat(feature.properties?.[col.name] || 0);
          return Number.isFinite(rawVal) ? sum + rawVal : sum;
        }, 0);
        const outputTotal = results.reduce((sum, row) => {
          const rawVal = parseFloat(row[col.outputName] || 0);
          return Number.isFinite(rawVal) ? sum + rawVal : sum;
        }, 0);
        const relativeErrorPct = inputTotal === 0
          ? 0
          : (Math.abs(outputTotal - inputTotal) / Math.abs(inputTotal)) * 100;

        extensiveChecks.push({
          outputName: col.outputName,
          inputTotal,
          outputTotal,
          relativeErrorPct,
        });
      }
    }

    return {
      mixedGeometryLayers,
      configuredColumns,
      processingModes,
      extensiveChecks,
    };
  }, [layers, results]);

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

          <div className="mb-4 p-4 bg-gray-950/70 border border-gray-800 rounded-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">QA Summary</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <div className="text-[10px] uppercase text-gray-500">Layers</div>
                <div className="text-lg font-semibold text-white">{layers.length}</div>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <div className="text-[10px] uppercase text-gray-500">Columns</div>
                <div className="text-lg font-semibold text-white">{qaSummary.configuredColumns}</div>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <div className="text-[10px] uppercase text-gray-500">Warnings</div>
                <div className="text-lg font-semibold text-white">{warnings.length}</div>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <div className="text-[10px] uppercase text-gray-500">Mixed Geometry</div>
                <div className="text-lg font-semibold text-white">{qaSummary.mixedGeometryLayers}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Polygon extensive modes: {qaSummary.processingModes.exactArea} exact area, {qaSummary.processingModes.approximate} approximate.
            </div>
            {qaSummary.extensiveChecks.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Conservation Checks</div>
                {qaSummary.extensiveChecks.map(check => (
                  <div key={check.outputName} className="p-2 bg-gray-900 rounded border border-gray-800">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono text-blue-300">{check.outputName}</span>
                      <span className={`text-xs ${check.relativeErrorPct <= 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                        delta {check.relativeErrorPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      input {check.inputTotal.toFixed(2)} | output {check.outputTotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
