import { useState, useCallback } from 'react';
import { ColumnConfig, ColumnType, PointAggregation, GeoType, Layer } from '../types';
import { getGeoType, getGeoTypeDetailed } from '../utils/geoType';
import { analyzeColumnsLocally } from '../services/columnInference';
import { FeatureCollection } from 'geojson';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectConfig } from '../utils/projectConfig';

/** Saved layer config from a loaded project config file */
interface PendingLayerConfig {
  fileName: string;
  geoType: string;
  activeColumns: ColumnConfig[];
}

export function useLayerManager() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [tempCsvData, setTempCsvData] = useState<{ data: any[]; name: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  // Pending layer configs from a loaded project file — matched to uploaded files by name
  const [pendingConfigs, setPendingConfigs] = useState<PendingLayerConfig[]>([]);

  const handleDataLoaded = useCallback(async (data: any, name: string) => {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const { primaryType: type, skippedCount, counts } = getGeoTypeDetailed(data);
      const newLayerId = uuidv4();

      let mixedGeometryWarning: string | undefined;
      if (skippedCount > 0) {
        const detail = Object.entries(counts).map(([t, c]) => `${c} ${t}`).join(', ');
        mixedGeometryWarning = `Will process ${type} features. Dataset contains: ${detail}. ${skippedCount} feature(s) will be skipped.`;
      }

      // Scan first N features for the union of all property keys
      const SCAN_LIMIT = 50;
      const attrSet = new Set<string>();
      const featureCount = Math.min(data.features.length, SCAN_LIMIT);
      for (let i = 0; i < featureCount; i++) {
        const props = data.features[i]?.properties;
        if (props) {
          for (const key of Object.keys(props)) {
            attrSet.add(key);
          }
        }
      }
      const availableAttributes = Array.from(attrSet);

      let aiSuggestions: Record<string, { type: ColumnType; aggregation: PointAggregation }> = {};

      if (availableAttributes.length > 0) {
        const sampleProps = data.features[0]?.properties || {};
        const rawCols = availableAttributes.map(key => ({
          name: key,
          sample: sampleProps[key],
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

      // Check for a matching pending config (from a loaded project file)
      const matchedConfig = pendingConfigs.find(
        pc => pc.fileName === name && pc.geoType === type
      );
      const restoredColumns = matchedConfig?.activeColumns ?? [];
      if (matchedConfig) {
        setPendingConfigs(prev => prev.filter(pc => pc !== matchedConfig));
      }

      const newLayer: Layer = {
        id: newLayerId,
        fileName: name,
        data,
        geoType: type,
        availableAttributes,
        activeColumns: restoredColumns,
        aiSuggestions,
        mixedGeometryWarning,
      };

      setLayers(prev => [...prev, newLayer]);
      // Only open config modal if no columns were restored from config
      if (restoredColumns.length === 0) {
        setEditingLayerId(newLayerId);
      }
    } catch (e: any) {
      setAnalyzeError('Error loading file: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  }, [pendingConfigs]);

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

  const addLayerDirect = useCallback((layer: Layer) => {
    setLayers(prev => [...prev, layer]);
  }, []);

  const clearAll = useCallback(() => {
    setLayers([]);
    setTempCsvData(null);
    setEditingLayerId(null);
    setAnalyzeError(null);
    setPendingConfigs([]);
  }, []);

  /** Load layer configs from a project config file — they'll auto-apply when matching files are uploaded */
  const loadPendingConfigs = useCallback((config: ProjectConfig) => {
    setPendingConfigs(config.layers.map(l => ({
      fileName: l.fileName,
      geoType: l.geoType,
      activeColumns: l.activeColumns,
    })));
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
    pendingConfigs,
    handleDataLoaded,
    handleCsvLoaded,
    handleCsvMapped,
    removeLayer,
    updateLayer,
    addLayerDirect,
    clearAll,
    loadPendingConfigs,
  };
}
