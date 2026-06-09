import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { trace, Span, SpanStatusCode, Tracer } from "@opentelemetry/api";
import { loadConfig } from "../config";
import { logger } from "./logger";

let sdk: NodeSDK | null = null;

/**
 * Initialise the OpenTelemetry SDK.
 *
 * Call once at process startup, BEFORE creating the Express app.
 * Automatic instrumentation covers Express, HTTP outbound, Redis, etc.
 */
export function initTracing(): void {
  const config = loadConfig();

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: config.OTEL_SERVICE_NAME,
      [SemanticResourceAttributes.SERVICE_VERSION]:
        process.env.npm_package_version ?? "0.0.0",
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  logger.info("OpenTelemetry tracing initialised");

  // Graceful shutdown hooks
  process.on("SIGTERM", async () => {
    await sdk?.shutdown();
    logger.info("OpenTelemetry tracing shut down");
  });
}

/**
 * Return the OTel tracer for manual span creation.
 */
export function getTracer(): Tracer {
  return trace.getTracer("order-service");
}

/**
 * Wrap an async function in a child span.
 *
 * Usage:
 *   const user = await withSpan("user-service.getUser", { "user.id": id }, () =>
 *     userClient.getUser(id)
 *   );
 */
export async function withSpan<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(spanName);

  for (const [key, val] of Object.entries(attributes)) {
    span.setAttribute(key, val);
  }

  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err: unknown) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : String(err),
    });
    span.recordException(err instanceof Error ? err : new Error(String(err)));
    throw err;
  } finally {
    span.end();
  }
}
