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
