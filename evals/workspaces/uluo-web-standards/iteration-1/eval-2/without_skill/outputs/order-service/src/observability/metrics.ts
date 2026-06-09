import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Prometheus metrics registry and common instruments.
 *
 * Default metrics include process CPU, memory, event loop lag, etc.
 */

const register = new Registry();
collectDefaultMetrics({ register, prefix: "order_service_" });

// ── RED metrics: HTTP ──────────────────────────────────────────────

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total HTTP 5xx errors",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

// ── RED metrics: Upstream ──────────────────────────────────────────

export const upstreamRequestsTotal = new Counter({
  name: "upstream_requests_total",
  help: "Total upstream calls",
  labelNames: ["service", "method", "status"],
  registers: [register],
});

export const upstreamRequestDuration = new Histogram({
  name: "upstream_request_duration_seconds",
  help: "Upstream request duration in seconds",
  labelNames: ["service", "method"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const upstreamErrorsTotal = new Counter({
  name: "upstream_errors_total",
  help: "Total upstream errors",
  labelNames: ["service", "error_type"],
  registers: [register],
});

// ── Business metrics ───────────────────────────────────────────────

export const ordersCreatedTotal = new Counter({
  name: "orders_created_total",
  help: "Total orders created",
  registers: [register],
});

export const ordersFailedTotal = new Counter({
  name: "orders_failed_total",
  help: "Total order creation failures",
  labelNames: ["reason"],
  registers: [register],
});

export const sagaCompensationsTotal = new Counter({
  name: "saga_compensations_total",
  help: "Total saga compensation actions",
  labelNames: ["step", "success"],
  registers: [register],
});

// ── Circuit breaker state ──────────────────────────────────────────

export const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state: 0=closed, 1=half-open, 2=open",
  labelNames: ["service"],
  registers: [register],
});

// ── Registry access ────────────────────────────────────────────────

export { register };

/**
 * Return the Prometheus text format for the /metrics endpoint.
 */
export async function metricsString(): Promise<string> {
  return register.metrics();
}
