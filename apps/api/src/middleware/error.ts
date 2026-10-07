import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';
import { isProduction } from '../config.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(422).json({ message: 'Validation failed', errors: err.flatten() });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  console.error(err);
  return res.status(500).json({
    message: 'Internal server error',
    ...(isProduction ? {} : { stack: err?.stack, details: err?.message })
  });
};
