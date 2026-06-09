import { Router, Request, Response, NextFunction } from "express";
import { orderService } from "../services/OrderService";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { z } from "zod";
import { ValidationError } from "../errors";

const router = Router();

/**
 * Request body schema for POST /orders.
 */
const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1),
  currency: z.string().length(3).default("USD"),
});

/**
 * POST /orders
 *
 * Create a new order. Requires Idempotency-Key header.
 * Saga: reserves inventory, authorizes payment, confirms order.
 */
router.post(
  "/",
  idempotencyMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate request body
      const parseResult = createOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError(
          "Invalid request body",
          parseResult.error.issues,
        );
      }

      const result = await orderService.createOrder({
        userId: parseResult.data.userId,
        items: parseResult.data.items,
        currency: parseResult.data.currency,
        idempotencyKey: req.headers["idempotency-key"] as string,
      });

      const statusCode = result.idempotent ? 200 : 201;
      res.status(statusCode).json({
        order: {
          id: result.order.id,
          status: result.order.status,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
          createdAt: result.order.createdAt,
        },
        idempotent: result.idempotent,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /orders/:id
 *
 * Retrieve an order by ID.
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.getOrder(req.params.id);
      res.json({ order });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
