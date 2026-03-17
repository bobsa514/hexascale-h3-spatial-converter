import { FeatureCollection } from 'geojson';
import { GeoType } from '../types';

/** Determine the primary geometry type of a FeatureCollection */
export const getGeoType = (fc: FeatureCollection): GeoType => {
  if (!fc.features.length) return GeoType.UNKNOWN;
  const feature = fc.features.find(f => f.geometry);
  if (!feature) return GeoType.UNKNOWN;

  const type = feature.geometry.type;
  if (type === 'Point' || type === 'MultiPoint') return GeoType.POINT;
  if (type === 'LineString' || type === 'MultiLineString') return GeoType.LINE;
  if (type === 'Polygon' || type === 'MultiPolygon') return GeoType.POLYGON;
  return GeoType.UNKNOWN;
};

export interface GeoTypeResult {
  primaryType: GeoType;
  counts: Record<string, number>;
  skippedCount: number;
  totalCount: number;
}

/** Detailed geometry analysis — includes per-type counts and skip count */
export const getGeoTypeDetailed = (fc: FeatureCollection): GeoTypeResult => {
  const counts: Record<string, number> = {};
  let nullCount = 0;
  for (const f of fc.features) {
    if (!f.geometry) {
      nullCount++;
      continue;
    }
    const gt = f.geometry.type;
    counts[gt] = (counts[gt] || 0) + 1;
  }

  const primaryType = getGeoType(fc);

  let skippedCount = nullCount;
  for (const [type, count] of Object.entries(counts)) {
    const isPrimary =
      (primaryType === GeoType.POINT && (type === 'Point' || type === 'MultiPoint')) ||
      (primaryType === GeoType.LINE && (type === 'LineString' || type === 'MultiLineString')) ||
      (primaryType === GeoType.POLYGON && (type === 'Polygon' || type === 'MultiPolygon'));
    if (!isPrimary) skippedCount += count;
  }

  return { primaryType, counts, skippedCount, totalCount: fc.features.length };
};
