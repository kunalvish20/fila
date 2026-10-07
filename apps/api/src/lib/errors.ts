export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const forbidden = (message = 'You do not have permission to perform this action') => new ApiError(403, message);
export const badRequest = (message = 'Invalid request', details?: unknown) => new ApiError(400, message, details);
