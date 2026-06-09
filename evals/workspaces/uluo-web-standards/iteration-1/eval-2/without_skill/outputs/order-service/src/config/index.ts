import { z } from "zod";

/**
 * Validated configuration from environment variables.
 * All values have defaults suitable for local development.
 */
const configSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Upstreams
  USER_SERVICE_URL: z.string().default("http://localhost:3001"),
  PAYMENT_SERVICE_URL: z.string().default("http://localhost:3002"),
  INVENTORY_SERVICE_URL: z.string().default("http://localhost:3003"),

  // Redis (idempotency keys + caching)
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // OTel
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default("http://localhost:4318/v1/traces"),
  OTEL_SERVICE_NAME: z.string().default("order-service"),

  // Timeouts (ms)
  UPSTREAM_TIMEOUT_USER: z.coerce.number().default(2000),
  UPSTREAM_TIMEOUT_PAYMENT: z.coerce.number().default(5000),
  UPSTREAM_TIMEOUT_INVENTORY: z.coerce.number().default(2000),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30_000),

  // Circuit Breaker
  CB_FAILURE_THRESHOLD: z.coerce.number().default(5),
  CB_HALF_OPEN_TIMEOUT_MS: z.coerce.number().default(30_000),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid configuration:", result.error.flatten());
    process.exit(1);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/** For testing: override cached config. */
export function overrideConfig(partial: Partial<Config>): Config {
  cachedConfig = { ...loadConfig(), ...partial };
  return cachedConfig;
}
