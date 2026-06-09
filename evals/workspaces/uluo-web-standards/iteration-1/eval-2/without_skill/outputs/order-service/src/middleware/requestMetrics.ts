import { Request, Response, NextFunction } from "express";
import { httpRequestsTotal, httpRequestDuration } from "../observability/metrics";

/**
 * Middleware that records RED metrics (Rate, Errors, Duration) for
 * every HTTP request.
 *
 * Timer start is captured via res.locals; the duration is recorded
 * when the response finishes.
 */
export function requestMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  // Record metrics on response finish
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path ?? req.path ?? "unknown";
    const method = req.method;
    const status = String(res.statusCode);

    httpRequestsTotal.inc({ method, path, status });
    httpRequestDuration.observe({ method, path, status }, duration);
  });

  next();
}
