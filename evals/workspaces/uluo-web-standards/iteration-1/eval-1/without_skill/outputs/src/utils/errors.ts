/**
 * Custom error classes for the library reservation module.
 * Each carries an HTTP status code suitable for REST API responses.
 */

export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

/** 400 — The request payload is malformed or missing required fields. */
export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }
}

/** 404 — The requested resource (book, reservation, user) was not found. */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" was not found`, 404, 'NOT_FOUND');
  }
}

/** 409 — The operation conflicts with the current state (e.g. book already reserved, no copies available). */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/** 422 — Business rule violation (e.g. user has reached max reservations). */
export class BusinessRuleViolationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

/** 429 — Rate limit exceeded (e.g. too many reservation attempts). */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT');
  }
}
