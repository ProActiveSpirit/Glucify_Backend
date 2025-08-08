export class HttpError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const toHttpError = (error: unknown, fallbackMessage = 'Internal Server Error'): HttpError => {
  if (error instanceof HttpError) return error;
  if (error instanceof Error) return new HttpError(500, error.message || fallbackMessage, 'INTERNAL_ERROR');
  return new HttpError(500, fallbackMessage, 'INTERNAL_ERROR');
};

