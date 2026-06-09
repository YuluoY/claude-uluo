import pino from "pino";
import { loadConfig } from "../config";

/**
 * Structured JSON logger.
 *
 * In development, logs are pretty-printed. In production, raw JSON goes to
 * stdout for collection by the container runtime.
 *
 * Sensitive field redaction is handled by pino serializers.
 */
const config = loadConfig();

const REDACTED_VALUE = "[REDACTED]";

function redactSerializer(value: unknown): unknown {
  if (typeof value === "string") return REDACTED_VALUE;
  if (typeof value === "number") return 0;
  if (typeof value === "object" && value !== null) return {};
  return REDACTED_VALUE;
}

export const logger = pino({
  name: "order-service",
  level: config.LOG_LEVEL,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  // Always include service metadata
  base: {
    service: "order-service",
    environment: config.NODE_ENV,
    version: process.env.npm_package_version ?? "0.0.0",
  },
  serializers: {
    // Redact sensitive fields at the serializer level
    err: pino.stdSerializers.err,
    password: redactSerializer,
    token: redactSerializer,
    secret: redactSerializer,
    authorization: redactSerializer,
    creditCard: redactSerializer,
    cvv: redactSerializer,
  },
  transport:
    config.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

/**
 * Create a child logger with bound context (e.g. traceId, requestId).
 */
export function childLogger(ctx: Record<string, unknown>) {
  return logger.child(ctx);
}
