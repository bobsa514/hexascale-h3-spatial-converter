import { describe, it, expect } from 'vitest';
import { toUserMessage } from '../utils/errorMessages';

describe('toUserMessage', () => {
  it('maps known error patterns to friendly messages', () => {
    const msg = toUserMessage(new Error('Feature collection is empty.'));
    expect(msg).toContain('no geographic features');
  });

  it('maps GeoJSON parse errors', () => {
    const msg = toUserMessage(new Error('Failed to parse GeoJSON'));
    expect(msg).toContain('valid GeoJSON');
  });

  it('maps unsupported geometry type', () => {
    const msg = toUserMessage(new Error('Unsupported Geometry Type: GeometryCollection'));
    expect(msg).toContain('not supported');
  });

  it('passes through short unknown messages as-is', () => {
    const msg = toUserMessage(new Error('Something broke'));
    expect(msg).toBe('Something broke');
  });

  it('truncates very long unknown messages', () => {
    const longMsg = 'x'.repeat(250);
    const msg = toUserMessage(new Error(longMsg));
    expect(msg).toContain('unexpected error');
  });

  it('handles non-Error inputs', () => {
    const msg = toUserMessage('string error');
    expect(msg).toBe('string error');
  });
});
