import { Request, Response, NextFunction } from "express";
import { ConflictError } from "../errors";

/**
 * Idempotency middleware.
 *
 * Requires the `Idempotency-Key` header on mutating endpoints.
 * In production, this would check Redis for:
 *   1. An in-flight lock (return 409 Conflict)
 *   2. A cached response (return the cached result)
 *   3. Neither — acquire a lock and proceed
 *
 * For the code framework, we validate the header is present.
 * Full Redis integration is documented in the error handling strategy
 * and can be implemented by connecting the ioredis dependency.
 */
// In-memory store for idempotency keys (REPLACE with Redis in production)
const inFlightKeys = new Map<string, NodeJS.Timeout>();

export function idempotencyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const key = req.headers["idempotency-key"] as string | undefined;

  if (!key) {
    throw new ConflictError(
      "Idempotency-Key header is required for this operation",
    );
  }

  // Check if this key is already being processed
  if (inFlightKeys.has(key)) {
    throw new ConflictError(
      "A request with this Idempotency-Key is already being processed",
    );
  }

  // Acquire in-flight lock
  inFlightKeys.set(key, setTimeout(() => inFlightKeys.delete(key), 60_000));

  // Release lock when response finishes
  _res.on("finish", () => {
    inFlightKeys.delete(key);
  });

  // Attach the key for downstream use
  req.headers["idempotency-key"] = key;

  next();
}

/**
 * Clean up expired in-flight keys. In Redis this is handled by key TTL.
 */
setInterval(() => {
  // Minimal: just prevent memory leak. Redis TTL handles this properly.
  if (inFlightKeys.size > 10_000) {
    inFlightKeys.clear();
  }
}, 300_000); // every 5 minutes
