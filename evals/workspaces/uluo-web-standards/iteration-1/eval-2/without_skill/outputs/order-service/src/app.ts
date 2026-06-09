import express from "express";
import {
  requestIdMiddleware,
  requestMetricsMiddleware,
  errorHandlerMiddleware,
} from "./middleware";
import ordersRouter from "./routes/orders";
import healthRouter from "./routes/health";
import metricsRouter from "./routes/metrics";

/**
 * Create and configure the Express application.
 *
 * Middleware order:
 *   1. requestId    — assign a unique id for tracing
 *   2. metrics      — start timer for RED metrics
 *   3. body parsers
 *   4. routes
 *   5. error handler — catch-all, must be last
 */
export function createApp(): express.Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────
  app.use(requestIdMiddleware);
  app.use(requestMetricsMiddleware);
  app.use(express.json());

  // ── Routes ─────────────────────────────────────────────────────
  app.use("/health", healthRouter);
  app.use("/metrics", metricsRouter);
  app.use("/orders", ordersRouter);

  // ── Catch-all 404 ──────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${_req.method} ${_req.path} not found`,
        requestId: res.requestId ?? "unknown",
      },
    });
  });

  // ── Error handler (must be last) ───────────────────────────────
  app.use(errorHandlerMiddleware);

  return app;
}
