export type ErrorSeverity = 'info' | 'warning' | 'error';

export class AppError extends Error {
  userMessage: string;
  severity: ErrorSeverity;
  technicalDetail?: string;

  constructor(userMessage: string, opts?: { severity?: ErrorSeverity; technicalDetail?: string }) {
    super(userMessage);
    this.name = 'AppError';
    this.userMessage = userMessage;
    this.severity = opts?.severity ?? 'error';
    this.technicalDetail = opts?.technicalDetail;
  }
}

export class ProcessingWarnings {
  private warnings: { message: string; count: number }[] = [];
  private seen = new Map<string, number>();

  add(message: string) {
    const idx = this.seen.get(message);
    if (idx !== undefined) {
      this.warnings[idx].count++;
    } else {
      this.seen.set(message, this.warnings.length);
      this.warnings.push({ message, count: 1 });
    }
  }

  getAll(): { message: string; count: number }[] {
    return [...this.warnings];
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  toSummary(): string[] {
    return this.warnings.map(w =>
      w.count > 1 ? `${w.message} (x${w.count})` : w.message
    );
  }
}
