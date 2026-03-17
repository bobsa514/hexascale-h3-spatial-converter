export type FileParseWorkerMessageType = 'PARSE_FILE' | 'PARSE_RESULT' | 'PARSE_ERROR';

export interface FileParseWorkerInMessage {
  type: 'PARSE_FILE';
  payload: {
    file: File;
  };
}

export interface FileParseWorkerResultMessage {
  type: 'PARSE_RESULT';
  payload:
    | {
        kind: 'csv';
        data: any[];
      }
    | {
        kind: 'geojson';
        data: any;
      };
}

export interface FileParseWorkerErrorMessage {
  type: 'PARSE_ERROR';
  payload: {
    message: string;
  };
}

export type FileParseWorkerOutMessage =
  | FileParseWorkerResultMessage
  | FileParseWorkerErrorMessage;
