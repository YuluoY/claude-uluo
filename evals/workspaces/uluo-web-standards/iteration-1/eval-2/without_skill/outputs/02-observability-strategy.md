# Order Service - Observability Strategy

## 1. Logging

### 1.1 Structured JSON Logging

All logs are structured JSON. We use `pino` for its low overhead and native OpenTelemetry integration.

```typescript
logger.info({
  orderId: "abc-123",
  userId: "usr-456",
  action: "order.created",
  total: 99.99
}, "Order created successfully");
```

### 1.2 Log Levels

| Level | Usage |
|-------|-------|
| `fatal` | Process cannot continue (DB connection lost after all retries) |
| `error` | Operation failed (upstream error, validation failures, saga compensation failure) |
| `warn` | Degraded operation (circuit breaker open, retry exhausted but fallback used, slow query) |
| `info` | Business events (order created, payment processed, inventory reserved) |
| `debug` | Detailed flow tracing (saga step start/end, request payloads — sanitized) |
| `trace` | Extremely verbose (full request/response bodies — NEVER in production) |

### 1.3 Standard Log Context

Every log line automatically includes:

```json
{
  "service": "order-service",
  "version": "1.0.0",
  "environment": "production",
  "hostname": "pod-abc-123",
  "traceId": "...",
  "spanId": "...",
  "requestId": "..."
}
```

### 1.4 Redaction

PII and sensitive fields are redacted automatically via a pino serializer:
- `password`, `token`, `secret`, `authorization`, `cookie`
- `creditCard`, `cvv`, `ssn`
- `email` (configurable — may log for debugging with approval)

### 1.5 Log Shipping

- In development: pretty-printed to stdout.
- In production: JSON to stdout, collected by the container runtime (Filebeat / Fluentd) and shipped to Elasticsearch / Loki.

## 2. Distributed Tracing

### 2.1 Technology

OpenTelemetry (OTel) with:
- **Automatic instrumentation**: `@opentelemetry/auto-instrumentations-node` for HTTP, gRPC, Express, Redis, PostgreSQL.
- **Manual instrumentation**: Custom spans for saga orchestration steps.
- **Exporter**: OTLP to a collector (Jaeger / Grafana Tempo / Datadog).

### 2.2 Span Design

Every incoming HTTP request is the root span. Key child spans:

```
HTTP POST /orders (root)
  |-- validate.request (span)
  |-- user-service.getUser (span)
  |     |-- HTTP GET /users/:id (auto)
  |-- inventory.reserve (span)
  |     |-- HTTP POST /inventory/reserve (auto)
  |       |-- DB query (auto)
  |-- payment.create (span)
  |     |-- HTTP POST /payments (auto)
  |-- order.persist (span)
  |     |-- DB INSERT (auto)
  |-- saga.compensate (span) [only on failure]
```

### 2.3 Span Attributes

Every custom span carries:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `order.id` | Order ID | `"abc-123"` |
| `user.id` | User ID | `"usr-456"` |
| `order.total` | Order total | `99.99` |
| `upstream.service` | Called service name | `"payment-service"` |
| `upstream.status` | HTTP status from upstream | `200` |
| `retry.attempt` | Current retry count | `2` |
| `circuit.state` | Circuit breaker state | `"open"` |

### 2.4 Trace Propagation

- Incoming: Extract `traceparent` header from request.
- Outgoing: Inject `traceparent` into upstream HTTP calls and message queue payloads.
- Context propagation across async boundaries (Promise chains, event emitters) is handled by OTel context manager.

## 3. Metrics

### 3.1 Technology

Prometheus via `prom-client` library, exposed at `GET /metrics`.

### 3.2 Request-Level Metrics (RED Method)

**Rate:**
- `http_requests_total{method, path, status}` — Counter
- `upstream_requests_total{service, method, status}` — Counter

**Errors:**
- `http_errors_total{method, path, status}` — Counter (5xx responses)
- `upstream_errors_total{service, error_type}` — Counter

**Duration:**
- `http_request_duration_seconds{method, path, status}` — Histogram (buckets: .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10)
- `upstream_request_duration_seconds{service, method}` — Histogram

### 3.3 Business Metrics

- `orders_created_total` — Counter
- `orders_failed_total{reason}` — Counter (validation, payment_declined, out_of_stock, upstream_error)
- `saga_compensations_total{step, success}` — Counter
- `circuit_breaker_state{service, state}` — Gauge (0=closed, 1=half-open, 2=open)

### 3.4 Infrastructure Metrics

- `nodejs_eventloop_lag_seconds` — Histogram
- `nodejs_heap_used_bytes` — Gauge
- `nodejs_active_handles` — Gauge
- `process_cpu_seconds_total` — Counter
- `db_pool_connections{state}` — Gauge (idle, active, waiting)

## 4. Health Checks

### 4.1 Endpoints

| Endpoint | Purpose | Checks |
|----------|---------|--------|
| `GET /health` | Liveness (kube) | Process is alive |
| `GET /health/ready` | Readiness (kube) | DB connected, Redis connected, circuit breakers not forced-open |
| `GET /health/deep` | Deep check | Ping user service, payment service, inventory service |

### 4.2 Readiness Check Logic (pseudo-code)

```
readiness:
  - db.ping() -> healthy if <100ms
  - redis.ping() -> healthy if <50ms
  - circuit_breaker(user).state != OPEN
  - circuit_breaker(payment).state != OPEN
  - circuit_breaker(inventory).state != OPEN
  return 200 if all healthy, 503 otherwise
```

## 5. Dashboards & Alerts

### 5.1 Key Dashboards (Grafana)

1. **RED Dashboard**: Rate, Errors, Duration per endpoint and per upstream.
2. **Business Dashboard**: Orders created/failed, average order value, top failure reasons.
3. **Saga Dashboard**: Success rate per saga, compensation rate, compensation failure rate.
4. **Circuit Breaker Dashboard**: State per dependency over time, fail-open counts.

### 5.2 Alerts (Prometheus AlertManager)

| Alert | Condition | Severity |
|-------|-----------|----------|
| High 5xx Rate | `rate(http_errors_total[5m]) > 0.05` | Critical |
| High Upstream Error Rate | `rate(upstream_errors_total[5m]) > 0.1` | Warning |
| Circuit Breaker Open | `circuit_breaker_state == 2` for >60s | Critical |
| High P99 Latency | `histogram_quantile(0.99, http_request_duration_seconds[5m]) > 2` | Warning |
| Saga Compensation Spike | `rate(saga_compensations_total[5m]) > 5` | Warning |
| Low Order Rate | `rate(orders_created_total[5m]) < 1` for >10min | Warning (possible outage) |
| Event Loop Lag | `nodejs_eventloop_lag_seconds > 0.1` | Warning |
