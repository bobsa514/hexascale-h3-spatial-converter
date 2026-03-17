import { describe, it, expect } from 'vitest';
import { analyzeColumnsLocally, tokenize, hasAnyToken, isNumericSample } from '../services/columnInference';
import { ColumnType, PointAggregation, GeoType } from '../types';

describe('tokenize', () => {
  it('splits on underscores', () => {
    expect(tokenize('avg_income')).toEqual(['avg', 'income']);
  });

  it('splits on non-alphanumeric characters', () => {
    expect(tokenize('total.population')).toEqual(['total', 'population']);
  });

  it('lowercases tokens', () => {
    expect(tokenize('AVG_Income')).toEqual(['avg', 'income']);
  });

  it('handles single word', () => {
    expect(tokenize('treatment')).toEqual(['treatment']);
  });

  it('filters empty tokens', () => {
    expect(tokenize('__foo__bar__')).toEqual(['foo', 'bar']);
  });
});

describe('hasAnyToken', () => {
  it('matches exact token', () => {
    expect(hasAnyToken(['rate', 'per', 'capita'], ['rate'])).toBe(true);
  });

  it('does not match substring', () => {
    // "treatment" tokenizes to ["treatment"], should NOT match "rate"
    expect(hasAnyToken(['treatment'], ['rate'])).toBe(false);
  });
});

describe('isNumericSample', () => {
  it('detects numbers', () => {
    expect(isNumericSample(42)).toBe(true);
    expect(isNumericSample(3.14)).toBe(true);
  });

  it('detects numeric strings', () => {
    expect(isNumericSample('42')).toBe(true);
    expect(isNumericSample(' 3.14 ')).toBe(true);
  });

  it('rejects non-numeric', () => {
    expect(isNumericSample('abc')).toBe(false);
    expect(isNumericSample(null)).toBe(false);
    expect(isNumericSample(undefined)).toBe(false);
    expect(isNumericSample('')).toBe(false);
    expect(isNumericSample(NaN)).toBe(false);
    expect(isNumericSample(Infinity)).toBe(false);
  });
});

describe('analyzeColumnsLocally — false positive regression', () => {
  it('"treatment" is NOT classified as intensive (no false positive on "rate")', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'treatment', sample: 'A' }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).not.toBe(ColumnType.INTENSIVE);
  });

  it('"county_id" IS classified as ID', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'county_id', sample: '06037' }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.ID);
  });

  it('"population" IS classified as extensive', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'population', sample: 50000 }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.EXTENSIVE);
  });

  it('"avg_temperature" IS classified as intensive', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'avg_temperature', sample: 72.5 }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.INTENSIVE);
  });

  it('"density" IS classified as intensive', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'density', sample: 1200 }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.INTENSIVE);
  });

  it('"per_capita_income" IS classified as intensive (per_ substring)', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'per_capita_income', sample: 42000 }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.INTENSIVE);
  });

  it('"total_count" IS classified as extensive', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'total_count', sample: 1500 }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.EXTENSIVE);
  });

  it('"land_use" is classified as categorical for non-numeric text', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'land_use', sample: 'residential' }],
      GeoType.POLYGON
    );
    expect(results[0]!.type).toBe(ColumnType.CATEGORICAL);
  });
});

describe('analyzeColumnsLocally — point classification', () => {
  it('point geometry uses token-based classification (not blanket EXTENSIVE)', async () => {
    // "price" matches intensive token list → should be INTENSIVE even for points
    const results = await analyzeColumnsLocally(
      [{ name: 'price', sample: 100 }],
      GeoType.POINT
    );
    expect(results[0]!.type).toBe(ColumnType.INTENSIVE);
  });

  it('point "population" is classified as EXTENSIVE', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'population', sample: 5000 }],
      GeoType.POINT
    );
    expect(results[0]!.type).toBe(ColumnType.EXTENSIVE);
  });

  it('point "county_id" is classified as ID', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'county_id', sample: 'ABC' }],
      GeoType.POINT
    );
    expect(results[0]!.type).toBe(ColumnType.ID);
  });
});

describe('analyzeColumnsLocally — point aggregation', () => {
  it('"min_temp" gets MIN aggregation', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'min_temp', sample: 32 }],
      GeoType.POLYGON
    );
    expect(results[0]!.pointAggregation).toBe(PointAggregation.MIN);
  });

  it('"max_speed" gets MAX aggregation', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'max_speed', sample: 65 }],
      GeoType.POLYGON
    );
    expect(results[0]!.pointAggregation).toBe(PointAggregation.MAX);
  });

  it('"avg_income" gets AVERAGE aggregation', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'avg_income', sample: 50000 }],
      GeoType.POLYGON
    );
    expect(results[0]!.pointAggregation).toBe(PointAggregation.AVERAGE);
  });

  it('"total_pop" gets SUM aggregation', async () => {
    const results = await analyzeColumnsLocally(
      [{ name: 'total_pop', sample: 100000 }],
      GeoType.POLYGON
    );
    expect(results[0]!.pointAggregation).toBe(PointAggregation.SUM);
  });
});
