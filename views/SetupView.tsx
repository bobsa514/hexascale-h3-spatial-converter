import React, { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { OnboardingBanner } from '../components/OnboardingBanner';
import { ResolutionTooltip } from '../components/ResolutionTooltip';
import { DataPreviewModal } from '../components/DataPreviewModal';
import { Layer, ProcessingStatus } from '../types';
import { H3_RESOLUTION_MIN, H3_RESOLUTION_MAX, PREVIEW_ROW_LIMIT } from '../utils/constants';
import {
  Settings, Plus, Trash2, Eye, ChevronRight, Loader2,
  Layers, FileText, CheckCircle2, AlertCircle, Edit, Save, Upload as UploadIcon
} from 'lucide-react';

interface Props {
  layers: Layer[];
  h3Resolution: number;
  setH3Resolution: (v: number) => void;
  status: ProcessingStatus;
  onProcess: () => void;
  onDataLoaded: (data: any, name: string) => void;
  onCsvLoaded: (data: any[], name: string) => void;
  onError: (msg: string) => void;
  onEditLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onSaveConfig: () => void;
  onLoadConfig: () => void;
  allOutputNames: string[];
  onQuickDemo?: () => void;
}

export const SetupView: React.FC<Props> = ({
  layers,
  h3Resolution,
  setH3Resolution,
  status,
  onProcess,
  onDataLoaded,
  onCsvLoaded,
  onError,
  onEditLayer,
  onRemoveLayer,
  onSaveConfig,
  onLoadConfig,
  allOutputNames,
  onQuickDemo,
}) => {
  const [previewLayer, setPreviewLayer] = useState<Layer | null>(null);

  // Detect duplicate output names
  const outputNameCounts = new Map<string, number>();
  for (const layer of layers) {
    for (const col of layer.activeColumns) {
      outputNameCounts.set(col.outputName, (outputNameCounts.get(col.outputName) || 0) + 1);
    }
  }
  const hasDuplicateOutputNames = Array.from(outputNameCounts.values()).some(c => c > 1);

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Onboarding */}
      {layers.length === 0 && <OnboardingBanner onLoadSample={onDataLoaded} onQuickDemo={onQuickDemo} />}

      {/* 1. Global Settings */}
      <div className="mb-8 p-6 bg-gray-900/50 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-900/20 rounded-lg">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Global Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1">
                H3 Resolution Level
                <ResolutionTooltip resolution={h3Resolution} />
              </label>
              <span className="text-sm font-mono text-blue-400 bg-blue-900/20 px-2 rounded">Level {h3Resolution}</span>
            </div>
            <input
              type="range"
              min={H3_RESOLUTION_MIN} max={H3_RESOLUTION_MAX}
              value={h3Resolution}
              onChange={(e) => setH3Resolution(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Coarse (Large Hexagons)</span>
              <span>Fine (Small Hexagons)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. File List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-400" />
            Data Layers
          </h2>
          <div className="flex items-center gap-3">
            {layers.length > 0 && (
              <>
                <span className="text-sm text-gray-500">{layers.length} file(s) loaded</span>
                <button
                  onClick={onSaveConfig}
                  className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Save project config"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onLoadConfig}
              className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Load project config"
            >
              <UploadIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasDuplicateOutputNames && (
          <div className="mb-4 px-4 py-3 bg-orange-900/20 border border-orange-700/50 rounded-lg text-sm text-orange-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Duplicate output column names detected across layers. Processing will be blocked until resolved.
          </div>
        )}

        <div className="space-y-4">
          {layers.map((layer) => {
            const isConfigured = layer.activeColumns.length > 0;
            const layerHasDupes = layer.activeColumns.some(
              c => (outputNameCounts.get(c.outputName) || 0) > 1
            );
            return (
              <div key={layer.id} className={`bg-gray-800/40 rounded-xl border p-4 flex items-center justify-between hover:bg-gray-800/60 transition-colors ${layerHasDupes ? 'border-orange-600/50' : 'border-gray-700'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {layer.fileName}
                      <span className="text-[10px] uppercase bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                        {layer.geoType}
                      </span>
                      {layerHasDupes && (
                        <span title="Has duplicate output names"><AlertCircle className="w-3.5 h-3.5 text-orange-400" /></span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5 flex items-center gap-2">
                      {isConfigured ? (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {layer.activeColumns.length} columns configured
                        </span>
                      ) : (
                        <span className="text-orange-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Pending configuration
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {layer.data.features.length > 0 && (
                    <button
                      onClick={() => setPreviewLayer(layer)}
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-900/10 rounded-lg transition-colors"
                      title="Preview data"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEditLayer(layer.id)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-3 h-3" /> Configure
                  </button>
                  <button
                    onClick={() => onRemoveLayer(layer.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add File Area */}
          <div className="mt-4">
            {layers.length === 0 ? (
              <FileUpload
                onDataLoaded={onDataLoaded}
                onCsvLoaded={onCsvLoaded}
                onError={onError}
              />
            ) : (
              <div className="border-2 border-dashed border-gray-800 rounded-xl p-4 flex items-center justify-center hover:bg-gray-900/30 transition-colors relative h-24 overflow-hidden">
                <div className="absolute inset-0 opacity-0 z-10">
                  <FileUpload
                    onDataLoaded={onDataLoaded}
                    onCsvLoaded={onCsvLoaded}
                    onError={onError}
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-400 pointer-events-none">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add another file</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Bar */}
      {layers.length > 0 && (
        <div className="flex justify-end pt-6 border-t border-gray-800">
          <button
            onClick={onProcess}
            disabled={status !== 'idle' || hasDuplicateOutputNames}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all transform hover:scale-105"
          >
            {status === 'processing' || status === 'analyzing' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
            Start Processing
          </button>
        </div>
      )}

      {/* Data Preview Modal for layers */}
      {previewLayer && (
        <DataPreviewModal
          data={previewLayer.data.features.slice(0, PREVIEW_ROW_LIMIT).map(f => f.properties || {})}
          onClose={() => setPreviewLayer(null)}
        />
      )}
    </div>
  );
};
