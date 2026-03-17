import Papa from 'papaparse';
import shp from 'shpjs';
import { kml } from '@tmcw/togeojson';
import JSZip from 'jszip';
import { FeatureCollection } from 'geojson';
import type {
  FileParseWorkerInMessage,
  FileParseWorkerOutMessage,
} from './fileParseWorkerTypes';

const postError = (message: string) => {
  const msg: FileParseWorkerOutMessage = {
    type: 'PARSE_ERROR',
    payload: { message },
  };
  self.postMessage(msg);
};

const postResult = (payload: FileParseWorkerOutMessage['payload']) => {
  const msg: FileParseWorkerOutMessage = {
    type: 'PARSE_RESULT',
    payload,
  } as FileParseWorkerOutMessage;
  self.postMessage(msg);
};

const parseCsv = async (file: File): Promise<any[]> => {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('Failed to parse CSV file.'));
          return;
        }
        resolve(results.data as any[]);
      },
      error: (err: Error) => reject(err),
    });
  });
};

const parseGeoJsonZip = async (file: File): Promise<FeatureCollection> => {
  const buffer = await file.arrayBuffer();
  const geojson = await shp(buffer);

  let finalFC: FeatureCollection = { type: 'FeatureCollection', features: [] };

  if (Array.isArray(geojson)) {
    geojson.forEach(g => {
      if (g.type === 'FeatureCollection') {
        finalFC.features.push(...g.features);
      }
    });
  } else {
    finalFC = geojson;
  }

  return finalFC;
};

const parseKmlString = (xmlString: string) => {
  if (typeof DOMParser === 'undefined') {
    throw new Error('KML parsing is not supported in this browser worker.');
  }
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  return kml(xmlDoc);
};

const parseKmz = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const kmlFilename = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.kml'));

  if (!kmlFilename) {
    throw new Error('No KML file found inside KMZ archive.');
  }

  const kmlFile = zip.file(kmlFilename);
  if (!kmlFile) {
    throw new Error('Could not access KML file.');
  }

  const kmlString = await kmlFile.async('string');
  return parseKmlString(kmlString);
};

self.onmessage = async (event: MessageEvent<FileParseWorkerInMessage>) => {
  const { type, payload } = event.data;
  if (type !== 'PARSE_FILE') return;

  const file = payload.file;
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.csv')) {
      const data = await parseCsv(file);
      postResult({ kind: 'csv', data });
      return;
    }

    if (name.endsWith('.json') || name.endsWith('.geojson')) {
      const json = JSON.parse(await file.text());
      postResult({ kind: 'geojson', data: json });
      return;
    }

    if (name.endsWith('.kml')) {
      const geojson = parseKmlString(await file.text());
      postResult({ kind: 'geojson', data: geojson });
      return;
    }

    if (name.endsWith('.kmz')) {
      const geojson = await parseKmz(file);
      postResult({ kind: 'geojson', data: geojson });
      return;
    }

    if (name.endsWith('.zip')) {
      const geojson = await parseGeoJsonZip(file);
      postResult({ kind: 'geojson', data: geojson });
      return;
    }

    postError('Unsupported file format. Please upload GeoJSON, CSV, KML/KMZ, or Zip (Shapefile).');
  } catch (err: any) {
    postError(err?.message || 'Unknown file parsing error.');
  }
};
