import { processGeoJsonToH3 } from '../services/geoProcessor';
import type { WorkerInMessage, WorkerOutMessage } from './workerTypes';

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const { type, payload } = e.data;

  if (type !== 'PROCESS') return;

  try {
    const result = await processGeoJsonToH3(payload.featureCollection, {
      h3Resolution: payload.h3Resolution,
      columns: payload.columns,
      onProgress: (processed, total) => {
        const msg: WorkerOutMessage = {
          type: 'PROGRESS',
          payload: { processed, total },
        };
        self.postMessage(msg);
      },
    });

    const msg: WorkerOutMessage = {
      type: 'RESULT',
      payload: {
        results: result.results,
        warnings: result.warnings.toSummary(),
      },
    };
    self.postMessage(msg);
  } catch (err: any) {
    const msg: WorkerOutMessage = {
      type: 'ERROR',
      payload: { message: err.message || 'Unknown worker error' },
    };
    self.postMessage(msg);
  }
};
