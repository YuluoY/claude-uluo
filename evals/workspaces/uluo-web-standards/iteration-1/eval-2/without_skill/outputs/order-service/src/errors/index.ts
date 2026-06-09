/**
 * Domain error hierarchy.
 *
 * Every error carries a unique `code`, an HTTP `statusCode`, and an optional
 * `retryable` flag. Controllers map these to HTTP responses without leaking
 * internal details.
 */

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details: unknown[];

  constructor(
    code: string,
    message: string,
    statusCode: number,
    retryable: boolean,
    details: unknown[] = [],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
    // Maintain proper prototype chain in transpiled JS
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Client errors (4xx) ────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details: unknown[] = []) {
    super("VALIDATION_ERROR", message, 400, false, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401, false);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403, false);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super("NOT_FOUND", `${resource} with id '${id}' not found`, 404, false);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409, true);
  }
}

// ── Upstream errors (502/504) ──────────────────────────────────────

export abstract class UpstreamError extends AppError {
  public readonly upstreamService: string;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    retryable: boolean,
    upstreamService: string,
  ) {
    super(code, message, statusCode, retryable);
    this.upstreamService = upstreamService;
  }
}

export class UpstreamTimeoutError extends UpstreamError {
  constructor(service: string, timeoutMs: number) {
    super(
      "UPSTREAM_TIMEOUT",
      `${service} did not respond within ${timeoutMs}ms`,
      504,
      true,
      service,
    );
  }
}

export class UpstreamUnavailableError extends UpstreamError {
  constructor(service: string, cause?: string) {
    super(
      "UPSTREAM_UNAVAILABLE",
      `${service} is unavailable${cause ? `: ${cause}` : ""}`,
      502,
      true,
      service,
    );
  }
}

export class UpstreamInternalError extends UpstreamError {
  constructor(service: string, status: number, body: string) {
    super(
      "UPSTREAM_INTERNAL",
      `${service} returned ${status}: ${body.slice(0, 200)}`,
      502,
      true,
      service,
    );
  }
}

// ── Server errors (500) ────────────────────────────────────────────

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super("INTERNAL_ERROR", message, 500, false);
  }
}

// ── Type guard ─────────────────────────────────────────────────────

export function isRetryable(error: unknown): boolean {
  return error instanceof AppError && error.retryable;
}
