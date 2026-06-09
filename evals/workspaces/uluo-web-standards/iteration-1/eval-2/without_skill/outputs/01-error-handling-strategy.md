# Order Service - Error Handling Strategy

## 1. Error Taxonomy

### 1.1 Error Categories

| Category | Description | HTTP Status | Retryable? |
|----------|-------------|-------------|------------|
| VALIDATION | Invalid input, missing fields, business rule violation | 400 | No |
| NOT_FOUND | Resource does not exist (order, user, product) | 404 | No |
| UNAUTHORIZED | Missing or invalid auth token | 401 | No |
| FORBIDDEN | Valid auth but insufficient permissions | 403 | No |
| CONFLICT | Duplicate order, optimistic lock failure | 409 | Yes (idempotency) |
| UPSTREAM_TIMEOUT | External service did not respond in time | 504 | Yes |
| UPSTREAM_UNAVAILABLE | External service is down (connection refused, 503) | 502 | Yes |
| UPSTREAM_ERROR | External service returned an unexpected error | 502 | Conditional |
| INTERNAL | Unhandled, unexpected server error | 500 | Yes (with caution) |

### 1.2 Upstream Error Mapping

For each downstream dependency, map their errors into our domain:

**User Service:**
- 404 -> NOT_FOUND (user not found)
- 401/403 -> surface as UNAUTHORIZED/FORBIDDEN
- 5xx / timeout -> UPSTREAM_UNAVAILABLE or UPSTREAM_TIMEOUT

**Payment Service:**
- 402 -> CONFLICT (payment declined, funds insufficient)
- 409 -> CONFLICT (duplicate payment)
- 422 -> VALIDATION (payment method invalid)
- 5xx / timeout -> UPSTREAM_UNAVAILABLE or UPSTREAM_TIMEOUT

**Inventory Service:**
- 409 -> CONFLICT (insufficient stock)
- 404 -> NOT_FOUND (SKU not found)
- 5xx / timeout -> UPSTREAM_UNAVAILABLE or UPSTREAM_TIMEOUT

## 2. Error Handling Architecture

### 2.1 Layered Error Flow

```
HTTP Request
    |
    v
Controller (route handler) --- parse/validate input
    |
    v
Service Layer (business logic) --- orchestrate, catch upstream errors
    |
    v
Client Adapter (HTTP client wrapper) --- translate upstream errors
    |
    v
External Service
```

Each layer handles only the errors relevant to its abstraction level:

- **Client Adapter**: Catches network/timeout errors and HTTP status codes from upstream. Wraps them into typed domain errors (`UpstreamTimeoutError`, `UpstreamUnavailableError`, `UserNotFoundError`, etc.).
- **Service Layer**: Catches domain errors from adapters, decides on retry or compensation (saga rollback), and enriches errors with business context (order ID, step in the workflow).
- **Controller**: Catches all errors, maps them to HTTP responses with the correct status code and a sanitized message. Logs the full error.

### 2.2 Error Class Hierarchy

```
AppError (base, extends Error)
  |-- ValidationError        (400)
  |-- NotFoundError          (404)
  |-- UnauthorizedError      (401)
  |-- ForbiddenError         (403)
  |-- ConflictError          (409)
  |-- UpstreamError (base)   (502/504)
  |     |-- UpstreamTimeoutError
  |     |-- UpstreamUnavailableError
  |     |-- UpstreamInternalError
  |-- InternalError          (500)
```

### 2.3 Error Response Shape

All API errors use a consistent JSON envelope:

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order with id abc-123 was not found",
    "requestId": "req-abc-456",
    "details": []
  }
}
```

## 3. Retry & Resilience Strategy

### 3.1 Retry Policy (per dependency)

| Service | Max Retries | Backoff | Timeout per attempt | Notes |
|---------|------------|---------|---------------------|-------|
| User Service | 2 | Exponential (100ms, 200ms) | 2s | Read-only, idempotent GET |
| Payment Service | 2 | Exponential (200ms, 400ms) | 5s | Only retry on 5xx/timeout. NEVER retry on 4xx except 409 with idempotency key. |
| Inventory Service | 2 | Exponential (100ms, 200ms) | 2s | Reserve/release operations, retry on 5xx/timeout |

### 3.2 Circuit Breaker

Use a circuit breaker per upstream dependency:
- **Failure threshold**: 5 consecutive failures
- **Half-open timeout**: 30 seconds
- **Half-open probe**: Allow 1 request through; if it succeeds, close circuit; if it fails, re-open.

When the circuit is OPEN:
- Return `UPSTREAM_UNAVAILABLE` immediately (fail-fast).
- The caller (order creation flow) returns a 503 with `Retry-After` header.

### 3.3 Saga Compensation

The order creation flow follows a saga pattern across three services:

```
1. Reserve Inventory   --> If fails: abort, return error
2. Create Payment      --> If fails: release inventory, return error
3. Create Order        --> If fails: refund payment, release inventory, return error
```

Each step has a compensating action. If compensation itself fails, write a `compensation_task` record to a dead-letter queue for asynchronous retry.

### 3.4 Timeouts

| Boundary | Timeout |
|----------|---------|
| Incoming HTTP request (server) | 30s |
| User Service call | 2s |
| Payment Service call | 5s |
| Inventory Service call | 2s |
| Total saga orchestration | 20s |

## 4. Idempotency

The order creation endpoint requires an `Idempotency-Key` header.

- Store idempotency keys in Redis with a TTL of 24 hours.
- If a request with the same key arrives:
  - While the original request is still processing: return 409 Conflict.
  - After the original request completed: return the cached response (including the order ID).

## 5. Logging Errors

Every error above the WARN level is logged as structured JSON:

```json
{
  "level": "error",
  "message": "Failed to create payment for order abc-123",
  "error": {
    "type": "UpstreamTimeoutError",
    "stack": "...",
    "upstream": "payment-service",
    "upstreamStatus": null,
    "attempt": 2
  },
  "traceId": "abc-trace-123",
  "spanId": "span-456",
  "orderId": "abc-123",
  "requestId": "req-abc-456"
}
```

Sensitive data (credit card numbers, PII) is NEVER logged. Error messages are safe for external consumption; details go into the `error` object which is internal-only.
