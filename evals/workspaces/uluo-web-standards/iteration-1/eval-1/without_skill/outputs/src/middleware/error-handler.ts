import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Global Express error-handling middleware.
 * Catches both known AppErrors and unexpected errors,
 * returning a consistent JSON error response.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors.
  if (err instanceof AppError) {
    logger.warn('Handled application error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });

    const body: Record<string, unknown> = {
      code: err.code,
      message: err.message,
    };

    if (err instanceof ValidationError && err.fieldErrors) {
      body.fieldErrors = err.fieldErrors;
    }

    res.status(err.statusCode).json({ error: body });
    return;
  }

  // Unexpected / unknown errors.
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
  });
}
