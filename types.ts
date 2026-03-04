import { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson';

export enum GeoType {
  POINT = 'Point',
  LINE = 'LineString',
  POLYGON = 'Polygon',
  UNKNOWN = 'Unknown'
}

export enum ColumnType {
  INTENSIVE = 'Intensive', // e.g., Mean Income (average)
  EXTENSIVE = 'Extensive', // e.g., Population (sum/distribute)
  ID = 'ID', // Keep as identifier
  IGNORE = 'Ignore' // Do not include
}

export enum PointAggregation {
  COUNT = 'Count',
  SUM = 'Sum',
  AVERAGE = 'Average',
  MIN = 'Min',
  MAX = 'Max'
}

export interface ColumnConfig {
  id: string; // Unique ID for UI rendering (allows duplicate source columns)
  name: string; // Source attribute name
  outputName: string; // Destination column name in CSV
  sampleValue: any;
  type: ColumnType; // For Polygons
  extensiveMode?: AreaInterpolationMode; // For Polygon Extensive allocation
  pointAggregation?: PointAggregation; // For Points
  ringSize?: number; // 0-8 for spatial smoothing/aggregation
}

export interface ProcessingConfig {
  h3Resolution: number;
  columns: ColumnConfig[];
}

export interface HexResult {
  hexId: string;
  [key: string]: any;
}

export type ProcessingStatus = 'idle' | 'analyzing' | 'processing' | 'completed' | 'error';
export type AreaInterpolationMode = 'fast' | 'precise';

export interface Layer {
  id: string;
  fileName: string;
  data: FeatureCollection;
  geoType: GeoType;
  availableAttributes: string[];
  activeColumns: ColumnConfig[];
  aiSuggestions: Record<string, { type: ColumnType, aggregation: PointAggregation }>;
}
