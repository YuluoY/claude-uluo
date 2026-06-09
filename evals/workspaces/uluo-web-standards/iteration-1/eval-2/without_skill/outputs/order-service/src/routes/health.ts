import { Router, Request, Response } from "express";
import { circuitBreakerState } from "../observability/metrics";

const router = Router();

/**
 * GET /health — Liveness probe.
 * Returns 200 as long as the process is alive.
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * GET /health/ready — Readiness probe.
 * Checks that critical dependencies are available.
 * Returns 503 if the service cannot serve traffic.
 */
router.get("/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Check circuit breaker states — if any upstream CB is open, we are
  // NOT ready (upstream is unavailable, we will fail-fast on requests).
  const cbStates = await circuitBreakerState.get();
  const values = cbStates?.values as
    | Array<{ labels: Record<string, string>; value: number }>
    | undefined;
  const openBreakers =
    values?.filter((v) => v.value === 2).map((v) => v.labels.service) ?? [];

  if (openBreakers.length > 0) {
    checks.circuitBreakers = { status: "degraded" };
    res.status(503).json({
      status: "not_ready",
      message: `Circuit breakers open for: ${openBreakers.join(", ")}`,
      checks,
    });
    return;
  }

  checks.circuitBreakers = { status: "ok" };

  // TODO: Add real DB ping and Redis ping here
  // checks.database = await pingDatabase();
  // checks.redis = await pingRedis();

  res.json({ status: "ready", checks });
});

/**
 * GET /health/deep — Deep health check.
 * Pings upstream services directly. Only use for debugging.
 */
router.get("/deep", async (_req: Request, res: Response) => {
  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string }
  > = {};

  // In production, these would call each upstream's /health endpoint.
  // For now we report circuit breaker state as a proxy for health.
  const cbStates = await circuitBreakerState.get();
  const values = cbStates?.values as
    | Array<{ labels: Record<string, string>; value: number }>
    | undefined;

  const serviceNames = ["user-service", "payment-service", "inventory-service"];
  for (const serviceName of serviceNames) {
    const entry = values?.find((v) => v.labels.service === serviceName);
    const state = entry?.value;
    checks[serviceName] = {
      status:
        state === 0 ? "healthy" : state === 1 ? "degraded" : "unhealthy",
    };
  }

  const allHealthy = Object.values(checks).every(
    (c) => c.status !== "unhealthy",
  );
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "unhealthy",
    checks,
  });
});

export default router;
