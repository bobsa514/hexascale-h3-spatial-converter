import { describe, it, expect } from 'vitest';
import { FeatureCollection } from 'geojson';
import { processGeoJsonToH3 } from '../services/geoProcessor';
import { ColumnType } from '../types';

import polygonsFixture from './fixtures/polygons.json';
import conservationPolygon from './fixtures/conservation-polygon.json';

const polygons = polygonsFixture as FeatureCollection;
const conservationPoly = conservationPolygon as FeatureCollection;

const benchmarkPolygonMode = async (
  fc: FeatureCollection,
  mode: 'fast' | 'precise',
  iterations = 5
) => {
  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await processGeoJsonToH3(fc, {
      h3Resolution: 8,
      columns: [
        {
          id: '1',
          name: 'population',
          outputName: 'population',
          sampleValue: 1000,
          type: ColumnType.EXTENSIVE,
          extensiveMode: mode,
          ringSize: 0,
        },
      ],
    });
    timings.push(performance.now() - start);
  }

  const avgMs = timings.reduce((sum, t) => sum + t, 0) / timings.length;
  return { avgMs, minMs: Math.min(...timings), maxMs: Math.max(...timings) };
};

describe('geoProcessor benchmark', () => {
  it('reports approximate vs exact polygon timings', async () => {
    const datasets = [
      { name: 'polygons-fixture', fc: polygons },
      { name: 'conservation-polygon', fc: conservationPoly },
    ];

    for (const dataset of datasets) {
      const approximate = await benchmarkPolygonMode(dataset.fc, 'fast');
      const exactArea = await benchmarkPolygonMode(dataset.fc, 'precise');

      console.log(
        [
          `[bench] ${dataset.name}`,
          `  approximate avg=${approximate.avgMs.toFixed(1)}ms min=${approximate.minMs.toFixed(1)}ms max=${approximate.maxMs.toFixed(1)}ms`,
          `  exact-area  avg=${exactArea.avgMs.toFixed(1)}ms min=${exactArea.minMs.toFixed(1)}ms max=${exactArea.maxMs.toFixed(1)}ms`,
          `  slowdown=${(exactArea.avgMs / approximate.avgMs).toFixed(2)}x`,
        ].join('\n')
      );

      expect(approximate.avgMs).toBeGreaterThan(0);
      expect(exactArea.avgMs).toBeGreaterThan(0);
    }
  }, 60000);
});
