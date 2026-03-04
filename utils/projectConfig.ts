import { ColumnConfig, Layer } from '../types';

interface ProjectConfig {
  version: 1;
  h3Resolution: number;
  layers: {
    fileName: string;
    geoType: string;
    activeColumns: ColumnConfig[];
  }[];
}

export function serializeConfig(h3Resolution: number, layers: Layer[]): string {
  const config: ProjectConfig = {
    version: 1,
    h3Resolution,
    layers: layers.map(l => ({
      fileName: l.fileName,
      geoType: l.geoType,
      activeColumns: l.activeColumns,
    })),
  };
  return JSON.stringify(config, null, 2);
}

export function deserializeConfig(json: string): ProjectConfig {
  const config = JSON.parse(json);
  if (config.version !== 1) {
    throw new Error(`Unsupported config version: ${config.version}`);
  }
  if (typeof config.h3Resolution !== 'number' || !Array.isArray(config.layers)) {
    throw new Error('Invalid config format');
  }
  return config as ProjectConfig;
}

export function downloadConfig(h3Resolution: number, layers: Layer[]) {
  const content = serializeConfig(h3Resolution, layers);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'hexascale.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type { ProjectConfig };
