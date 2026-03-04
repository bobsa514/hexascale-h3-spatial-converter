import { useState, useCallback } from 'react';
import { ColumnConfig, ColumnType, PointAggregation, GeoType, Layer } from '../types';
import { getGeoType } from '../services/geoProcessor';
import { analyzeColumnsLocally } from '../services/columnInference';
import { FeatureCollection } from 'geojson';
import { v4 as uuidv4 } from 'uuid';

export function useLayerManager() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [tempCsvData, setTempCsvData] = useState<{ data: any[]; name: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleDataLoaded = useCallback(async (data: any, name: string) => {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const type = getGeoType(data);
      const newLayerId = uuidv4();

      let availableAttributes: string[] = [];
      let aiSuggestions: Record<string, { type: ColumnType; aggregation: PointAggregation }> = {};

      if (data.features.length > 0) {
        const props = data.features[0].properties || {};
        availableAttributes = Object.keys(props);

        const rawCols = availableAttributes.map(key => ({
          name: key,
          sample: props[key],
        }));

        const suggestions = await analyzeColumnsLocally(rawCols, type);

        const suggestionMap: Record<string, any> = {};
        suggestions.forEach(s => {
          if (s.name) {
            suggestionMap[s.name] = {
              type: s.type || ColumnType.IGNORE,
              aggregation: s.pointAggregation || PointAggregation.COUNT,
            };
          }
        });
        aiSuggestions = suggestionMap;
      }

      const newLayer: Layer = {
        id: newLayerId,
        fileName: name,
        data,
        geoType: type,
        availableAttributes,
        activeColumns: [],
        aiSuggestions,
      };

      setLayers(prev => [...prev, newLayer]);
      setEditingLayerId(newLayerId);
    } catch (e: any) {
      setAnalyzeError('Error loading file: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleCsvLoaded = useCallback((data: any[], name: string) => {
    setTempCsvData({ data, name });
  }, []);

  const handleCsvMapped = useCallback(
    (latCol: string, lonCol: string) => {
      if (!tempCsvData) return;

      let droppedCoordCount = 0;
      let droppedRangeCount = 0;

      const features = tempCsvData.data
        .filter(row => {
          const lat = parseFloat(row[latCol]);
          const lon = parseFloat(row[lonCol]);
          if (isNaN(lat) || isNaN(lon)) {
            droppedCoordCount++;
            return false;
          }
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            droppedRangeCount++;
            return false;
          }
          return true;
        })
        .map((row, idx) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [parseFloat(row[lonCol]), parseFloat(row[latCol])],
          },
          properties: {
            ...row,
            id: idx,
          },
        }));

      const warnings: string[] = [];
      if (droppedCoordCount > 0) {
        warnings.push(`Dropped ${droppedCoordCount} rows with non-numeric coordinates.`);
      }
      if (droppedRangeCount > 0) {
        warnings.push(`Dropped ${droppedRangeCount} rows with out-of-range coordinates (lat must be -90..90, lon must be -180..180).`);
      }

      if (features.length === 0) {
        setAnalyzeError('No valid coordinates found in CSV rows based on selected columns.');
        setTempCsvData(null);
        return { warnings };
      }

      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: features as any,
      };

      handleDataLoaded(fc, tempCsvData.name);
      setTempCsvData(null);
      return { warnings };
    },
    [tempCsvData, handleDataLoaded]
  );

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => (l.id === layerId ? { ...l, ...updates } : l)));
  }, []);

  const clearAll = useCallback(() => {
    setLayers([]);
    setTempCsvData(null);
    setEditingLayerId(null);
    setAnalyzeError(null);
  }, []);

  return {
    layers,
    editingLayerId,
    setEditingLayerId,
    tempCsvData,
    setTempCsvData,
    analyzing,
    analyzeError,
    setAnalyzeError,
    handleDataLoaded,
    handleCsvLoaded,
    handleCsvMapped,
    removeLayer,
    updateLayer,
    clearAll,
  };
}
