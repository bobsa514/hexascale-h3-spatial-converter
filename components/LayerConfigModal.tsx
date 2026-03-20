import React, { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, ChevronDown, Info } from 'lucide-react';
import { Layer, ColumnConfig, ColumnType, PointAggregation, GeoType, AreaInterpolationMode } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  layer: Layer;
  allOutputNames: string[];
  onUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onClose: () => void;
}

export const LayerConfigModal: React.FC<Props> = ({ layer, allOutputNames, onUpdate, onClose }) => {
  const [selectedAttr, setSelectedAttr] = useState('');
  const defaultPolygonExtensiveMode: AreaInterpolationMode = 'precise';

  // Output names from OTHER layers: remove exactly one occurrence per current-layer column
  // to correctly detect cross-layer conflicts
  const otherLayerOutputNames = (() => {
    const remaining = [...allOutputNames];
    for (const col of layer.activeColumns) {
      const idx = remaining.indexOf(col.outputName);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    return remaining;
  })();

  const addColumn = () => {
    if (!selectedAttr) return;

    const suggestion = layer.aiSuggestions[selectedAttr];

    let type = ColumnType.ID;
    if (suggestion && suggestion.type !== ColumnType.IGNORE) {
        type = suggestion.type;
    } else {
        if (layer.geoType === GeoType.POLYGON) type = ColumnType.INTENSIVE;
        else if (layer.geoType === GeoType.POINT) type = ColumnType.EXTENSIVE;
        else type = ColumnType.INTENSIVE;
    }

    let outputName = selectedAttr;
    let count = 1;
    const existingNames = [...layer.activeColumns.map(c => c.outputName), ...otherLayerOutputNames];
    while (existingNames.includes(outputName)) {
        count++;
        outputName = `${selectedAttr}_${count}`;
    }

    const newCol: ColumnConfig = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : uuidv4(),
      name: selectedAttr,
      outputName,
      sampleValue: null,
      type,
      extensiveMode: layer.geoType === GeoType.POLYGON ? defaultPolygonExtensiveMode : 'fast',
      pointAggregation: suggestion?.aggregation || PointAggregation.COUNT,
      ringSize: 0
    };

    onUpdate(layer.id, {
      activeColumns: [...layer.activeColumns, newCol]
    });
    setSelectedAttr('');
  };

  const updateColumn = (colId: string, updates: Partial<ColumnConfig>) => {
    const newCols = layer.activeColumns.map(c =>
      c.id === colId ? { ...c, ...updates } : c
    );
    onUpdate(layer.id, { activeColumns: newCols });
  };

  const removeColumn = (colId: string) => {
    onUpdate(layer.id, {
      activeColumns: layer.activeColumns.filter(c => c.id !== colId)
    });
  };

  const isOutputNameEmpty = (outputName: string): boolean => !outputName.trim();

  const isOutputNameConflict = (outputName: string, currentColId: string): boolean => {
    const otherInLayer = layer.activeColumns.some(c => c.id !== currentColId && c.outputName === outputName);
    const inOtherLayers = otherLayerOutputNames.includes(outputName);
    return otherInLayer || inOtherLayers;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

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

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
