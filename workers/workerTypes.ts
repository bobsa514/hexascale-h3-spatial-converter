import { ColumnConfig } from '../types';

export type WorkerMessageType = 'PROCESS' | 'PROGRESS' | 'RESULT' | 'ERROR';

export interface WorkerProcessMessage {
  type: 'PROCESS';
  payload: {
    featureCollection: any;
    h3Resolution: number;
    columns: ColumnConfig[];
  };
}

export interface WorkerProgressMessage {
  type: 'PROGRESS';
  payload: {
    processed: number;
    total: number;
  };
}

export interface WorkerResultMessage {
  type: 'RESULT';
  payload: {
    results: any[];
    warnings: string[];
  };
}

export interface WorkerErrorMessage {
  type: 'ERROR';
  payload: {
    message: string;
  };
}

export type WorkerInMessage = WorkerProcessMessage;
export type WorkerOutMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage;
