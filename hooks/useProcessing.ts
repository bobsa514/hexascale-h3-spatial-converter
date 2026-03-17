import { useState, useCallback, useRef } from 'react';
import { ProcessingStatus, HexResult, Layer } from '../types';
import { toUserMessage } from '../utils/errorMessages';
import type { WorkerInMessage, WorkerOutMessage } from '../workers/workerTypes';

export interface LayerProgress {
  name: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  pct: number;
}

/** Process a single layer via a Web Worker, returning a promise */
function processLayerInWorker(
  layer: Layer,
  h3Resolution: number,
  onProgress: (processed: number, total: number) => void,
  cancelledRef: React.RefObject<boolean>,
  workerRef: React.RefObject<Worker | null>,
): Promise<{ results: HexResult[]; warnings: string[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/geoWorker.ts', import.meta.url),
      { type: 'module' }
    );
    (workerRef as React.MutableRefObject<Worker | null>).current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (cancelledRef.current) {
        worker.terminate();
        reject(new Error('Cancelled'));
        return;
      }

      const { type, payload } = e.data;
      if (type === 'PROGRESS') {
        onProgress(payload.processed, payload.total);
      } else if (type === 'RESULT') {
        worker.terminate();
        (workerRef as React.MutableRefObject<Worker | null>).current = null;
        resolve(payload);
      } else if (type === 'ERROR') {
        worker.terminate();
        (workerRef as React.MutableRefObject<Worker | null>).current = null;
        reject(new Error(payload.message));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      (workerRef as React.MutableRefObject<Worker | null>).current = null;
      reject(new Error(e.message || 'Worker error'));
    };

    const msg: WorkerInMessage = {
      type: 'PROCESS',
      payload: {
        featureCollection: layer.data,
        h3Resolution,
        columns: layer.activeColumns,
      },
    };
    worker.postMessage(msg);
  });
}

export function useProcessing() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [results, setResults] = useState<HexResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [layerProgress, setLayerProgress] = useState<LayerProgress[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const cancelledRef = useRef(false);

  const process = useCallback(async (layers: Layer[], h3Resolution: number) => {
    if (layers.length === 0) return false;

    // Validation: all layers must have columns configured
    const emptyLayers = layers.filter(l => l.activeColumns.length === 0);
    if (emptyLayers.length > 0) {
      setError(`Please configure columns for: ${emptyLayers.map(l => l.fileName).join(', ')}`);
      return false;
    }

    // Validation: check for empty output names
    for (const layer of layers) {
      for (const col of layer.activeColumns) {
        if (!col.outputName.trim()) {
          setError(`Empty output name found in layer "${layer.fileName}". Please give every column a name.`);
          return false;
        }
      }
    }

    // Validation: check for duplicate output names across all layers
    const allOutputNames: string[] = [];
    const duplicates: string[] = [];
    for (const layer of layers) {
      for (const col of layer.activeColumns) {
        if (allOutputNames.includes(col.outputName)) {
          if (!duplicates.includes(col.outputName)) {
            duplicates.push(col.outputName);
          }
        }
        allOutputNames.push(col.outputName);
      }
    }
    if (duplicates.length > 0) {
      setError(`Duplicate output column names found across layers: ${duplicates.join(', ')}. Please rename them to be unique.`);
      return false;
    }

    cancelledRef.current = false;
    setStatus('processing');
    setError(null);
    setWarnings([]);
    setProgressPct(0);

    const initProgress: LayerProgress[] = layers.map(l => ({
      name: l.fileName,
      status: 'pending',
      pct: 0,
    }));
    setLayerProgress(initProgress);

    const allResultsMap = new Map<string, HexResult>();
    const allWarnings: string[] = [];

    try {
      for (let i = 0; i < layers.length; i++) {
        if (cancelledRef.current) return false;

        const layer = layers[i]!;
        setProgressText(`Processing layer ${i + 1}/${layers.length}: ${layer.fileName}...`);

        setLayerProgress(prev =>
          prev.map((lp, idx) => (idx === i ? { ...lp, status: 'processing' } : lp))
        );

        if (cancelledRef.current) return false;

        const result = await processLayerInWorker(
          layer,
          h3Resolution,
          (processed, total) => {
            const layerPct = total > 0 ? processed / total : 0;
            const overall = (i + layerPct) / layers.length;
            const pct = Math.min(99, Math.floor(overall * 100));
            setProgressPct(pct);
            setProgressText(
              `Processing layer ${i + 1}/${layers.length}: ${layer.fileName} (${Math.floor(layerPct * 100)}%)`
            );
            setLayerProgress(prev =>
              prev.map((lp, idx) =>
                idx === i ? { ...lp, pct: Math.floor(layerPct * 100) } : lp
              )
            );
          },
          cancelledRef,
          workerRef,
        );

        setProgressPct(Math.floor(((i + 1) / layers.length) * 100));
        setLayerProgress(prev =>
          prev.map((lp, idx) => (idx === i ? { ...lp, status: 'done', pct: 100 } : lp))
        );

        if (result.warnings.length > 0) {
          allWarnings.push(
            ...result.warnings.map(w => `[${layer.fileName}] ${w}`)
          );
        }

        result.results.forEach(res => {
          const existing = allResultsMap.get(res.hexId) || { hexId: res.hexId };
          allResultsMap.set(res.hexId, { ...existing, ...res });
        });
      }

      const finalResults = Array.from(allResultsMap.values());
      setResults(finalResults);
      setWarnings(allWarnings);
      setStatus('completed');
      setProgressPct(100);
      return true;
    } catch (e: any) {
      if (cancelledRef.current) return false;
      console.error(e);
      setError(toUserMessage(e));
      setStatus('error');
      return false;
    } finally {
      setProgressText('');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResults([]);
    setError(null);
    setWarnings([]);
    setProgressText('');
    setProgressPct(0);
    setLayerProgress([]);
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    reset();
  }, [reset]);

  return {
    status,
    setStatus,
    progressText,
    progressPct,
    results,
    error,
    setError,
    warnings,
    layerProgress,
    process,
    reset,
    cancel,
  };
}
