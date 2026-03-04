import { describe, it, expect } from 'vitest';
import { AppError, ProcessingWarnings } from '../utils/errors';

describe('AppError', () => {
  it('has default severity of error', () => {
    const err = new AppError('something failed');
    expect(err.severity).toBe('error');
    expect(err.userMessage).toBe('something failed');
    expect(err.message).toBe('something failed');
  });

  it('accepts custom severity and technical detail', () => {
    const err = new AppError('file too large', {
      severity: 'warning',
      technicalDetail: 'size=600MB',
    });
    expect(err.severity).toBe('warning');
    expect(err.technicalDetail).toBe('size=600MB');
  });
});

describe('ProcessingWarnings', () => {
  it('starts empty', () => {
    const w = new ProcessingWarnings();
    expect(w.hasWarnings()).toBe(false);
    expect(w.getAll()).toEqual([]);
  });

  it('accumulates unique warnings', () => {
    const w = new ProcessingWarnings();
    w.add('warning A');
    w.add('warning B');
    expect(w.hasWarnings()).toBe(true);
    expect(w.getAll()).toEqual([
      { message: 'warning A', count: 1 },
      { message: 'warning B', count: 1 },
    ]);
  });

  it('deduplicates repeated warnings', () => {
    const w = new ProcessingWarnings();
    w.add('same warning');
    w.add('same warning');
    w.add('same warning');
    expect(w.getAll()).toEqual([{ message: 'same warning', count: 3 }]);
  });

  it('toSummary formats counts', () => {
    const w = new ProcessingWarnings();
    w.add('once');
    w.add('twice');
    w.add('twice');
    expect(w.toSummary()).toEqual(['once', 'twice (x2)']);
  });
});
