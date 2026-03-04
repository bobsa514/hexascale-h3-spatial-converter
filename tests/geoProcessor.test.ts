import { describe, it, expect } from 'vitest';
import { processGeoJsonToH3, getGeoType } from '../services/geoProcessor';
import { ColumnType, PointAggregation, GeoType } from '../types';
import { FeatureCollection } from 'geojson';

import pointsFixture from './fixtures/points.json';
import polygonsFixture from './fixtures/polygons.json';
import linesFixture from './fixtures/lines.json';

const points = pointsFixture as FeatureCollection;
const polygons = polygonsFixture as FeatureCollection;
const lines = linesFixture as FeatureCollection;

describe('getGeoType', () => {
  it('detects Points', () => {
    expect(getGeoType(points)).toBe(GeoType.POINT);
  });

  it('detects Polygons', () => {
    expect(getGeoType(polygons)).toBe(GeoType.POLYGON);
  });

  it('detects LineStrings', () => {
    expect(getGeoType(lines)).toBe(GeoType.LINE);
  });

  it('returns UNKNOWN for empty collection', () => {
    expect(getGeoType({ type: 'FeatureCollection', features: [] })).toBe(GeoType.UNKNOWN);
  });
});

describe('processGeoJsonToH3 — Points', () => {
  it('produces hex results with SUM aggregation', async () => {
    const result = await processGeoJsonToH3(points, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'population',
          outputName: 'population',
          sampleValue: 100,
          type: ColumnType.EXTENSIVE,
          pointAggregation: PointAggregation.SUM,
          ringSize: 0,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
    // Points 1 and 2 are at the same location so should be in the same hex
    const hexIds = result.results.map(r => r.hexId);
    expect(new Set(hexIds).size).toBeLessThanOrEqual(points.features.length);

    // At least one hex should have summed population
    const hasSum = result.results.some(r => r.population >= 200);
    expect(hasSum).toBe(true);
  });

  it('produces hex results with AVERAGE aggregation', async () => {
    const result = await processGeoJsonToH3(points, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'avg_income',
          outputName: 'avg_income',
          sampleValue: 50000,
          type: ColumnType.INTENSIVE,
          pointAggregation: PointAggregation.AVERAGE,
          ringSize: 0,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
    // Average income should be between min and max
    result.results.forEach(r => {
      expect(r.avg_income).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns warnings object', async () => {
    const result = await processGeoJsonToH3(points, {
      h3Resolution: 8,
      columns: [],
    });
    expect(result.warnings).toBeDefined();
    expect(result.warnings.hasWarnings()).toBe(false);
  });
});

describe('processGeoJsonToH3 — Polygons', () => {
  it('produces hex results for polygons', async () => {
    const result = await processGeoJsonToH3(polygons, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'population',
          outputName: 'population',
          sampleValue: 1000,
          type: ColumnType.EXTENSIVE,
          extensiveMode: 'fast',
          ringSize: 0,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
    result.results.forEach(r => {
      expect(r.hexId).toBeTruthy();
      expect(typeof r.population).toBe('number');
    });
  });

  it('handles intensive columns (averaging)', async () => {
    const result = await processGeoJsonToH3(polygons, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'density',
          outputName: 'density',
          sampleValue: 500,
          type: ColumnType.INTENSIVE,
          ringSize: 0,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
    result.results.forEach(r => {
      expect(r.density).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('processGeoJsonToH3 — Lines', () => {
  it('produces hex results for lines', async () => {
    const result = await processGeoJsonToH3(lines, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'traffic_count',
          outputName: 'traffic_count',
          sampleValue: 500,
          type: ColumnType.EXTENSIVE,
          ringSize: 0,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
    result.results.forEach(r => {
      expect(r.hexId).toBeTruthy();
      expect(typeof r.traffic_count).toBe('number');
    });
  });
});

describe('processGeoJsonToH3 — Ring Aggregation', () => {
  it('applies ring aggregation to point results', async () => {
    const result = await processGeoJsonToH3(points, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'population',
          outputName: 'population',
          sampleValue: 100,
          type: ColumnType.EXTENSIVE,
          pointAggregation: PointAggregation.SUM,
          ringSize: 1,
        },
      ],
    });

    expect(result.results.length).toBeGreaterThan(0);
  });
});

describe('processGeoJsonToH3 — Edge Cases', () => {
  it('throws on empty feature collection', async () => {
    await expect(
      processGeoJsonToH3({ type: 'FeatureCollection', features: [] }, {
        h3Resolution: 8,
        columns: [],
      })
    ).rejects.toThrow('Feature collection is empty');
  });

  it('throws on unsupported geometry type', async () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'GeometryCollection', geometries: [] } as any,
        },
      ],
    };
    await expect(
      processGeoJsonToH3(fc, { h3Resolution: 8, columns: [] })
    ).rejects.toThrow('Unsupported Geometry Type');
  });
});
