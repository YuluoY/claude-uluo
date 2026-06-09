import { Router, Request, Response } from "express";
import { metricsString } from "../observability/metrics";

const router = Router();

/**
 * GET /metrics — Prometheus text format.
 */
router.get("/", async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(await metricsString());
});

export default router;
