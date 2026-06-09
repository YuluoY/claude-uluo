import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { childLogger, logger } from "../observability/logger";

/**
 * Attach a unique requestId to every incoming request.
 * The id is set on the response header and stored in res.locals for use
 * by downstream middleware and route handlers.
 */
declare global {
  namespace Express {
    interface Response {
      /** Unique request identifier */
      requestId: string;
      /** Pino child logger bound with request context */
      log: ReturnType<typeof childLogger>;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();

  res.requestId = id;
  res.setHeader("x-request-id", id);

  // Create a child logger bound to this request
  res.log = logger.child({
    requestId: id,
    method: req.method,
    path: req.path,
  });

  res.log.debug("Request started");
  next();
}
