import React, { useState } from 'react';
import { X, Plus, Trash2, CircleDot, AlertCircle } from 'lucide-react';
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
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-800 uppercase font-mono">
                {layer.geoType}
              </span>
              {layer.fileName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">Configure attributes for extraction</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Add Attribute Section */}
          <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
            <label className="text-sm font-medium text-gray-300 block mb-2">Select Attribute to Add</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-sm text-gray-300 focus:border-blue-500 outline-none appearance-none"
                  value={selectedAttr}
                  onChange={(e) => setSelectedAttr(e.target.value)}
                >
                  <option value="" disabled>Choose a column...</option>
                  {layer.availableAttributes.map(attr => (
                    <option key={attr} value={attr}>{attr}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <Plus className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <button
                onClick={addColumn}
                disabled={!selectedAttr}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Configured Columns List */}
          <div className="space-y-4">
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
                 <div key={col.id} className={`bg-gray-800 rounded-lg border p-4 relative group hover:border-gray-600 transition-colors ${hasError ? 'border-orange-600/50' : 'border-gray-700'}`}>

                    <button
                      onClick={() => removeColumn(col.id)}
                      className="absolute top-3 right-3 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Left: Names */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Source Column</label>
                                <div className="text-sm font-mono text-gray-300 bg-gray-900/50 px-2 py-1.5 rounded border border-gray-800 truncate" title={col.name}>
                                    {col.name}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider flex items-center gap-1">
                                  Output Name (CSV Header)
                                  {hasError && <AlertCircle className="w-3 h-3 text-orange-400" />}
                                </label>
                                <input
                                  type="text"
                                  value={col.outputName}
                                  onChange={(e) => updateColumn(col.id, { outputName: e.target.value })}
                                  className={`w-full bg-gray-900 border rounded text-sm px-2 py-1.5 focus:border-blue-500 outline-none ${hasError ? 'border-orange-500 text-orange-200' : 'border-gray-600 text-blue-200'}`}
                                />
                                {isEmpty && (
                                  <div className="text-[10px] text-orange-400 mt-1">
                                    Output name cannot be empty
                                  </div>
                                )}
                                {hasConflict && !isEmpty && (
                                  <div className="text-[10px] text-orange-400 mt-1">
                                    This output name conflicts with another column
                                  </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Processing Config */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Type</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded text-sm px-2 py-1.5 text-gray-300 outline-none"
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
                                            <option value="EXTENSIVE_FAST">Extensive (Approximate, Faster)</option>
                                            <option value="EXTENSIVE_PRECISE">Extensive (Exact Area)</option>
                                          </>
                                        ) : (
                                          <option value={ColumnType.EXTENSIVE}>Extensive (Sum)</option>
                                        )}
                                    </select>
                                    {layer.geoType === GeoType.POLYGON && (
                                      <div className="text-[10px] text-gray-500 mt-1 leading-snug">
                                        Approximate: equal split across touched hexes, conservative but less spatially accurate. Exact Area: hex∩polygon intersection, conservative and slower.
                                      </div>
                                    )}
                                </div>
                                {layer.geoType === GeoType.POINT && col.type !== ColumnType.CATEGORICAL && col.type !== ColumnType.ID && (
                                    <div>
                                        <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Aggregation</label>
                                        <select
                                            className="w-full bg-gray-900 border border-gray-600 rounded text-sm px-2 py-1.5 text-gray-300 outline-none"
                                            value={col.pointAggregation}
                                            onChange={(e) => updateColumn(col.id, { pointAggregation: e.target.value as PointAggregation })}
                                        >
                                            <option value={PointAggregation.COUNT}>Count</option>
                                            <option value={PointAggregation.SUM}>Sum</option>
                                            <option value={PointAggregation.AVERAGE}>Avg</option>
                                            <option value={PointAggregation.MIN}>Min</option>
                                            <option value={PointAggregation.MAX}>Max</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {col.type !== ColumnType.ID && col.type !== ColumnType.CATEGORICAL && (
                                <div>
                                    <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider flex items-center">
                                        <CircleDot className="w-3 h-3 mr-1 text-purple-400" /> Ring Aggregation
                                    </label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded text-sm px-2 py-1.5 text-purple-300 outline-none"
                                        value={col.ringSize || 0}
                                        onChange={(e) => updateColumn(col.id, { ringSize: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>No Ring</option>
                                        {[1,2,3,4,5,6,7,8].map(r => (
                                            <option key={r} value={r}>Ring {r} (Neighbors)</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
               );})
             )}
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
