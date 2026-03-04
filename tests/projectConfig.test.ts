import { describe, it, expect } from 'vitest';
import { serializeConfig, deserializeConfig } from '../utils/projectConfig';
import { ColumnType, PointAggregation, GeoType } from '../types';

describe('serializeConfig', () => {
  it('produces valid JSON with version 1', () => {
    const json = serializeConfig(8, []);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.h3Resolution).toBe(8);
    expect(parsed.layers).toEqual([]);
  });

  it('includes layer settings without data', () => {
    const layers = [
      {
        id: '1',
        fileName: 'test.geojson',
        data: { type: 'FeatureCollection' as const, features: [] },
        geoType: GeoType.POLYGON,
        availableAttributes: ['pop'],
        activeColumns: [
          {
            id: 'c1',
            name: 'pop',
            outputName: 'population',
            sampleValue: 100,
            type: ColumnType.EXTENSIVE,
            extensiveMode: 'fast' as const,
            ringSize: 0,
          },
        ],
        aiSuggestions: {},
      },
    ];

    const json = serializeConfig(10, layers);
    const parsed = JSON.parse(json);
    expect(parsed.layers).toHaveLength(1);
    expect(parsed.layers[0].fileName).toBe('test.geojson');
    expect(parsed.layers[0].activeColumns).toHaveLength(1);
    // Should NOT contain data field
    expect(parsed.layers[0].data).toBeUndefined();
  });
});

describe('deserializeConfig', () => {
  it('parses valid config', () => {
    const input = JSON.stringify({
      version: 1,
      h3Resolution: 10,
      layers: [{ fileName: 'test.geojson', geoType: 'Polygon', activeColumns: [] }],
    });
    const config = deserializeConfig(input);
    expect(config.h3Resolution).toBe(10);
    expect(config.layers).toHaveLength(1);
  });

  it('throws on wrong version', () => {
    const input = JSON.stringify({ version: 99, h3Resolution: 8, layers: [] });
    expect(() => deserializeConfig(input)).toThrow('Unsupported config version');
  });

  it('throws on invalid format', () => {
    expect(() => deserializeConfig('{"version": 1}')).toThrow('Invalid config format');
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeConfig('not json')).toThrow();
  });
});
