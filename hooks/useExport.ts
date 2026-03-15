import { useCallback } from 'react';
import * as h3 from 'h3-js';
import Papa from 'papaparse';
import { HexResult, Layer } from '../types';

export function useExport(results: HexResult[], layers: Layer[], h3Resolution: number) {
  const getBaseName = useCallback(() => {
    if (layers.length === 1 && layers[0]) {
      return layers[0].fileName.replace(/\.[^/.]+$/, '');
    }
    return 'hexascale_merged';
  }, [layers]);

  const downloadCsv = useCallback(() => {
    if (results.length === 0) return;
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${getBaseName()}_h3_res${h3Resolution}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, h3Resolution, getBaseName]);

  const downloadGeoJson = useCallback(() => {
    if (results.length === 0) return;

    const features = results.map(row => {
      const boundary = h3.cellToBoundary(row.hexId, true); // [lng, lat] for GeoJSON
      const ring = [...boundary, boundary[0]]; // close the ring
      const properties: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (key !== 'hexId') properties[key] = value;
      }
      properties.hexId = row.hexId;

      return {
        type: 'Feature' as const,
        properties,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [ring],
        },
      };
    });

    const fc = {
      type: 'FeatureCollection' as const,
      features,
    };

    const json = JSON.stringify(fc);
    const blob = new Blob([json], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${getBaseName()}_h3_res${h3Resolution}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [results, h3Resolution, getBaseName]);

  return { downloadCsv, downloadGeoJson };
}
