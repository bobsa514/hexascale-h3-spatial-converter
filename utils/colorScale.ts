/** Blue-to-red gradient for choropleth visualization */
export function valueToColor(value: number, min: number, max: number): string {
  if (max === min) return '#3b82f6';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Blue (#3b82f6) -> Yellow (#eab308) -> Red (#ef4444)
  const r = Math.round(t < 0.5 ? 59 + (234 - 59) * (t * 2) : 234 + (239 - 234) * ((t - 0.5) * 2));
  const g = Math.round(t < 0.5 ? 130 + (179 - 130) * (t * 2) : 179 - (179 - 68) * ((t - 0.5) * 2));
  const b = Math.round(t < 0.5 ? 246 + (8 - 246) * (t * 2) : 8 + (68 - 8) * ((t - 0.5) * 2));

  return `rgb(${r},${g},${b})`;
}

export function getNumericColumns(row: Record<string, any>): string[] {
  return Object.keys(row).filter(k => {
    if (k === 'hexId') return false;
    const v = row[k];
    return typeof v === 'number' && Number.isFinite(v);
  });
}
