import { Request, Response, NextFunction } from "express";
import { AppError, InternalError } from "../errors";
import { logger } from "../observability/logger";
import { httpErrorsTotal } from "../observability/metrics";

/**
 * Global error-handling middleware.
 *
 * Must be registered AFTER all routes. Catches both AppError instances
 * and unexpected errors, returning a consistent JSON envelope.
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = res.log ?? logger;

  // Determine status code and response body
  let statusCode: number;
  let code: string;
  let message: string;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;

    if (statusCode >= 500) {
      log.error({ err, errorType: err.constructor.name }, "AppError (5xx)");
      httpErrorsTotal.inc({
        method: req.method,
        path: req.route?.path ?? req.path,
        status: String(statusCode),
      });
    } else {
      log.warn({ err, errorType: err.constructor.name }, "AppError (4xx)");
    }
  } else {
    // Unexpected error — do not leak details to the client
    statusCode = 500;
    code = "INTERNAL_ERROR";
    message = "An unexpected error occurred";

    log.error({ err, errorType: err.constructor?.name ?? "Unknown" }, "Unhandled error");
    httpErrorsTotal.inc({
      method: req.method,
      path: req.route?.path ?? req.path,
      status: "500",
    });
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      requestId: res.requestId ?? "unknown",
      details: err instanceof AppError ? err.details : [],
    },
  });
}
