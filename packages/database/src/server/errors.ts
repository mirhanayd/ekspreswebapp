export class ServerError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'REQUEST_FAILED',
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}
