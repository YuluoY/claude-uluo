import CircuitBreaker from "opossum";
import { loadConfig, Config } from "../config";
import {
  UpstreamTimeoutError,
  UpstreamUnavailableError,
  UpstreamInternalError,
} from "../errors";
import { logger } from "../observability/logger";
import {
  upstreamRequestsTotal,
  upstreamRequestDuration,
  upstreamErrorsTotal,
  circuitBreakerState,
} from "../observability/metrics";
import { withSpan } from "../observability/tracer";

/**
 * Generic HTTP client wrapper with:
 *  - configurable timeout
 *  - exponential retry on retryable errors
 *  - circuit breaker
 *  - OpenTelemetry trace propagation
 *  - Prometheus metrics
 */

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs: number;
  serviceName: string;
  retries?: number;
}

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Set to true to skip retries (e.g. non-idempotent POST without idempotency key) */
  skipRetry?: boolean;
}

const config: Config = loadConfig();

export class HttpClient {
  private baseUrl: string;
  private timeoutMs: number;
  private serviceName: string;
  private maxRetries: number;
  private breaker: CircuitBreaker;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeoutMs = options.timeoutMs;
    this.serviceName = options.serviceName;
    this.maxRetries = options.retries ?? 2;

    this.breaker = new CircuitBreaker(this.executeRequest.bind(this), {
      timeout: this.timeoutMs,
      errorThresholdPercentage: 100, // 5 consecutive failures = open
      resetTimeout: config.CB_HALF_OPEN_TIMEOUT_MS,
      volumeThreshold: config.CB_FAILURE_THRESHOLD,
      name: this.serviceName,
    });

    // Track circuit breaker state changes
    this.breaker.on("open", () => {
      circuitBreakerState.set({ service: this.serviceName }, 2);
      logger.warn({ service: this.serviceName }, "Circuit breaker OPEN");
    });
    this.breaker.on("halfOpen", () => {
      circuitBreakerState.set({ service: this.serviceName }, 1);
      logger.info({ service: this.serviceName }, "Circuit breaker HALF-OPEN");
    });
    this.breaker.on("close", () => {
      circuitBreakerState.set({ service: this.serviceName }, 0);
      logger.info({ service: this.serviceName }, "Circuit breaker CLOSED");
    });

    // Initial state
    circuitBreakerState.set({ service: this.serviceName }, 0);
  }

  /**
   * Public request method. All calls go through the circuit breaker.
   */
  async request<T>(options: RequestOptions): Promise<T> {
    // If the circuit is open, fail fast
    if (!this.breaker.opened) {
      return this.breaker.fire(options) as Promise<T>;
    }

    // Circuit is open — return immediately with a standard error
    throw new UpstreamUnavailableError(
      this.serviceName,
      "circuit breaker is open",
    );
  }

  /**
   * The actual HTTP call wrapped in a trace span.
   */
  private async executeRequest<T>(
    options: RequestOptions,
  ): Promise<T> {
    const spanName = `${this.serviceName}.${options.method}_${options.path}`;

    return withSpan<T>(
      spanName,
      {
        "upstream.service": this.serviceName,
        "upstream.method": options.method,
        "upstream.path": options.path,
      },
      async (span) => {
        let lastError: unknown;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          if (attempt > 0) {
            const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms
            span.setAttribute("retry.attempt", attempt);
            logger.warn(
              {
                service: this.serviceName,
                attempt,
                delay,
                path: options.path,
              },
              "Retrying upstream call",
            );
            await sleep(delay);
          }

          const startTime = Date.now();

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
              () => controller.abort(),
              this.timeoutMs,
            );

            const url = `${this.baseUrl}${options.path}`;
            const response = await fetch(url, {
              method: options.method,
              headers: {
                "Content-Type": "application/json",
                ...options.headers,
              },
              body: options.body ? JSON.stringify(options.body) : undefined,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const duration = (Date.now() - startTime) / 1000;
            const status = response.status;

            upstreamRequestsTotal.inc({
              service: this.serviceName,
              method: options.method,
              status: String(status),
            });
            upstreamRequestDuration.observe(
              { service: this.serviceName, method: options.method },
              duration,
            );

            // 2xx — success
            if (status >= 200 && status < 300) {
              const data = await response.json();
              return data as T;
            }

            // 5xx — may retry
            if (status >= 500) {
              if (attempt < this.maxRetries && !options.skipRetry) {
                lastError = new UpstreamInternalError(
                  this.serviceName,
                  status,
                  await response.text(),
                );
                continue; // retry
              }
              throw new UpstreamInternalError(
                this.serviceName,
                status,
                await response.text(),
              );
            }

            // 4xx — do NOT retry (idempotency 409 is special; handled by callers)
            const body = await response.text();
            upstreamErrorsTotal.inc({
              service: this.serviceName,
              error_type: `http_${status}`,
            });
            throw Object.assign(
              new Error(`Upstream ${this.serviceName} returned ${status}`),
              { status, body },
            );

          } catch (err: unknown) {
            const duration = (Date.now() - startTime) / 1000;
            upstreamRequestDuration.observe(
              { service: this.serviceName, method: options.method },
              duration,
            );

            // AbortError = our timeout fired
            if (err instanceof DOMException && err.name === "AbortError") {
              if (attempt < this.maxRetries && !options.skipRetry) {
                lastError = new UpstreamTimeoutError(
                  this.serviceName,
                  this.timeoutMs,
                );
                continue;
              }
              throw new UpstreamTimeoutError(
                this.serviceName,
                this.timeoutMs,
              );
            }

            // fetch itself can throw (DNS, connection refused, etc.)
            if (err instanceof TypeError) {
              if (attempt < this.maxRetries && !options.skipRetry) {
                lastError = new UpstreamUnavailableError(
                  this.serviceName,
                  err.message,
                );
                continue;
              }
              throw new UpstreamUnavailableError(
                this.serviceName,
                err.message,
              );
            }

            // Re-throw errors we already wrapped
            throw err;
          }
        }

        // Exhausted retries
        throw lastError;
      },
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
