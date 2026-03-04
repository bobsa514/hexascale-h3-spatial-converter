import { describe, it, expect } from 'vitest';
import { valueToColor, getNumericColumns } from '../utils/colorScale';

describe('valueToColor', () => {
  it('returns blue for min value', () => {
    const color = valueToColor(0, 0, 100);
    expect(color).toMatch(/^rgb\(/);
    // At t=0, should be blue-ish (r≈59, g≈130, b≈246)
    expect(color).toBe('rgb(59,130,246)');
  });

  it('returns red for max value', () => {
    const color = valueToColor(100, 0, 100);
    expect(color).toMatch(/^rgb\(/);
    // At t=1, should be red-ish (r≈239, g≈68, b≈68)
    expect(color).toBe('rgb(239,68,68)');
  });

  it('returns yellow-ish for midpoint', () => {
    const color = valueToColor(50, 0, 100);
    expect(color).toMatch(/^rgb\(/);
    // At t=0.5, should be yellow-ish
    expect(color).toBe('rgb(234,179,8)');
  });

  it('handles equal min and max', () => {
    const color = valueToColor(5, 5, 5);
    expect(color).toBe('#3b82f6');
  });

  it('clamps values below min', () => {
    const color = valueToColor(-10, 0, 100);
    expect(color).toBe('rgb(59,130,246)');
  });

  it('clamps values above max', () => {
    const color = valueToColor(200, 0, 100);
    expect(color).toBe('rgb(239,68,68)');
  });
});

describe('getNumericColumns', () => {
  it('returns numeric column names', () => {
    const row = { hexId: 'abc', population: 100, name: 'test', density: 50.5 };
    expect(getNumericColumns(row)).toEqual(['population', 'density']);
  });

  it('excludes hexId', () => {
    const row = { hexId: 'abc', count: 5 };
    expect(getNumericColumns(row)).toEqual(['count']);
  });

  it('excludes non-finite numbers', () => {
    const row = { hexId: 'abc', a: NaN, b: Infinity, c: 42 };
    expect(getNumericColumns(row)).toEqual(['c']);
  });

  it('returns empty for no numeric columns', () => {
    const row = { hexId: 'abc', name: 'test' };
    expect(getNumericColumns(row)).toEqual([]);
  });
});
