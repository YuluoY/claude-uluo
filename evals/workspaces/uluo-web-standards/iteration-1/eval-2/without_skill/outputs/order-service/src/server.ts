import { createApp } from "./app";
import { loadConfig } from "./config";
import { initTracing } from "./observability/tracer";
import { logger } from "./observability/logger";

// ── Initialise OpenTelemetry BEFORE creating the app ──────────────
// This must happen before any Express/HTTP modules are loaded so that
// auto-instrumentation can wrap them correctly.
initTracing();

const config = loadConfig();

const app = createApp();

// ── Start server ──────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  logger.info(
    {
      port: config.PORT,
      nodeEnv: config.NODE_ENV,
      upstreams: {
        user: config.USER_SERVICE_URL,
        payment: config.PAYMENT_SERVICE_URL,
        inventory: config.INVENTORY_SERVICE_URL,
      },
    },
    "Order service started",
  );
});

// ── Graceful shutdown ─────────────────────────────────────────────
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down order service");

  // Stop accepting new requests
  server.close(() => {
    logger.info("HTTP server closed");
  });

  // Give in-flight requests 10 seconds to complete, then force exit
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export { app, server };
