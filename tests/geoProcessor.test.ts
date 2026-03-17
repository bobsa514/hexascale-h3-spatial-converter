import { describe, it, expect } from 'vitest';
import { processGeoJsonToH3, getGeoType } from '../services/geoProcessor';
import { ColumnType, PointAggregation, GeoType } from '../types';
import { FeatureCollection } from 'geojson';

import pointsFixture from './fixtures/points.json';
import polygonsFixture from './fixtures/polygons.json';
import linesFixture from './fixtures/lines.json';
import conservationPolygon from './fixtures/conservation-polygon.json';
import conservationLine from './fixtures/conservation-line.json';
import mixedGeometry from './fixtures/mixed-geometry.json';

const points = pointsFixture as FeatureCollection;
const polygons = polygonsFixture as FeatureCollection;
const lines = linesFixture as FeatureCollection;
const conservationPoly = conservationPolygon as FeatureCollection;
const conservationLn = conservationLine as FeatureCollection;

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

describe('Polygon Extensive Conservation', () => {
  const INPUT_POPULATION = 10000;

  it('precise mode conserves extensive totals within 5%', async () => {
    const result = await processGeoJsonToH3(conservationPoly, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'population',
        outputName: 'population',
        sampleValue: 10000,
        type: ColumnType.EXTENSIVE,
        extensiveMode: 'precise',
        ringSize: 0,
      }],
    });

    const totalOutput = result.results.reduce((sum, r) => sum + (r.population || 0), 0);
    const error = Math.abs(totalOutput - INPUT_POPULATION) / INPUT_POPULATION;
    console.log(`Precise mode: input=${INPUT_POPULATION}, output=${totalOutput.toFixed(2)}, error=${(error * 100).toFixed(2)}%`);
    expect(error).toBeLessThan(0.05);
  });

  it('fast mode conserves extensive totals within 5%', async () => {
    const result = await processGeoJsonToH3(conservationPoly, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'population',
        outputName: 'population',
        sampleValue: 10000,
        type: ColumnType.EXTENSIVE,
        extensiveMode: 'fast',
        ringSize: 0,
      }],
    });

    const totalOutput = result.results.reduce((sum, r) => sum + (r.population || 0), 0);
    const error = Math.abs(totalOutput - INPUT_POPULATION) / INPUT_POPULATION;
    console.log(`Fast mode: input=${INPUT_POPULATION}, output=${totalOutput.toFixed(2)}, error=${(error * 100).toFixed(2)}%`);
    expect(error).toBeLessThan(0.05);
  });

  it('intensive values remain stable across polygon cells', async () => {
    const result = await processGeoJsonToH3(conservationPoly, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'median_income',
        outputName: 'median_income',
        sampleValue: 75000,
        type: ColumnType.INTENSIVE,
        ringSize: 0,
      }],
    });

    result.results.forEach(r => {
      expect(r.median_income).toBeCloseTo(75000, -1);
    });
  });
});

describe('Intensive Invariant — Multi-Source', () => {
  it('uniform intensive value is preserved across overlapping polygons', async () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { density: 500 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[-122.43, 37.77], [-122.42, 37.77], [-122.42, 37.79], [-122.43, 37.79], [-122.43, 37.77]]]
          }
        },
        {
          type: 'Feature',
          properties: { density: 500 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[-122.42, 37.77], [-122.41, 37.77], [-122.41, 37.79], [-122.42, 37.79], [-122.42, 37.77]]]
          }
        }
      ]
    };

    const result = await processGeoJsonToH3(fc, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'density',
        outputName: 'density',
        sampleValue: 500,
        type: ColumnType.INTENSIVE,
        ringSize: 0,
      }],
    });

    result.results.forEach(r => {
      expect(r.density).toBeCloseTo(500, -1);
    });
  });
});

describe('Mixed Geometry Handling', () => {
  it('warns about mixed types and processes only primary type', async () => {
    const fc = mixedGeometry as unknown as FeatureCollection;
    const result = await processGeoJsonToH3(fc, {
      h3Resolution: 8,
      columns: [{
        id: '1', name: 'value', outputName: 'value',
        sampleValue: 100, type: ColumnType.EXTENSIVE,
        extensiveMode: 'fast', ringSize: 0,
      }],
    });

    expect(result.warnings.hasWarnings()).toBe(true);
    const summary = result.warnings.toSummary();
    expect(summary.some(w => w.includes('Mixed geometry'))).toBe(true);
    expect(summary.some(w => w.includes('no geometry'))).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });
});

describe('Line Extensive Conservation', () => {
  const INPUT_TRAFFIC = 1000;

  it('extensive total is conserved across hex cells', async () => {
    const result = await processGeoJsonToH3(conservationLn, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'traffic_count',
        outputName: 'traffic_count',
        sampleValue: 1000,
        type: ColumnType.EXTENSIVE,
        ringSize: 0,
      }],
    });

    const totalOutput = result.results.reduce((sum, r) => sum + (r.traffic_count || 0), 0);
    const error = Math.abs(totalOutput - INPUT_TRAFFIC) / INPUT_TRAFFIC;
    console.log(`Line extensive: input=${INPUT_TRAFFIC}, output=${totalOutput.toFixed(2)}, error=${(error * 100).toFixed(2)}%`);
    expect(error).toBeLessThan(0.01);
  });

  it('intensive values are averaged, not distributed', async () => {
    const result = await processGeoJsonToH3(conservationLn, {
      h3Resolution: 8,
      columns: [{
        id: '1',
        name: 'speed_avg',
        outputName: 'speed_avg',
        sampleValue: 45,
        type: ColumnType.INTENSIVE,
        ringSize: 0,
      }],
    });

    result.results.forEach(r => {
      expect(r.speed_avg).toBeCloseTo(45, 0);
    });
  });
});
