import { userClient } from "../clients/UserClient";
import { paymentClient } from "../clients/PaymentClient";
import { inventoryClient } from "../clients/InventoryClient";
import {
  Order,
  OrderItem,
  OrderStatus,
  orderRepository,
} from "./OrderRepository";
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  InternalError,
  isRetryable,
} from "../errors";
import { logger } from "../observability/logger";
import { withSpan } from "../observability/tracer";
import {
  ordersCreatedTotal,
  ordersFailedTotal,
  sagaCompensationsTotal,
} from "../observability/metrics";

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  currency: string;
  idempotencyKey: string;
}

export interface CreateOrderResult {
  order: Order;
  /** True if this was a previous idempotent response */
  idempotent: boolean;
}

/**
 * Compensation task that could not be completed synchronously.
 * In production, persist this to a dead-letter queue / outbox table.
 */
interface CompensationTask {
  type: "release_inventory" | "refund_payment";
  reservationId?: string;
  paymentId?: string;
  reason: string;
  orderId: string;
  createdAt: Date;
}

/**
 * Order service implementing saga orchestration across three services:
 *
 *   1. Reserve Inventory
 *   2. Authorize Payment
 *   3. Confirm Order
 *
 * On failure at any step, compensating actions are executed in reverse.
 */
export class OrderService {
  /**
   * Create an order with saga orchestration.
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    return withSpan(
      "order.create",
      {
        "user.id": input.userId,
        "order.item_count": input.items.length,
        "order.idempotency_key": input.idempotencyKey,
      },
      async (rootSpan) => {
        // ── Idempotency check ─────────────────────────────────────
        const existing =
          await orderRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          logger.info(
            { orderId: existing.id, idempotencyKey: input.idempotencyKey },
            "Idempotent order request returning cached result",
          );
          return { order: existing, idempotent: true };
        }

        // ── Validate input ────────────────────────────────────────
        this.validateInput(input);

        // ── Validate user ─────────────────────────────────────────
        let user;
        try {
          user = await userClient.validateUser(input.userId);
        } catch (err: unknown) {
          ordersFailedTotal.inc({ reason: "user_validation_failed" });
          throw err; // NotFoundError or user suspended
        }

        // ── Create pending order record ───────────────────────────
        let order = await orderRepository.create({
          userId: input.userId,
          items: input.items,
          status: "PENDING",
          totalAmount: this.calculateTotal(input.items),
          currency: input.currency,
          reservationIds: [],
          idempotencyKey: input.idempotencyKey,
        });

        rootSpan.setAttribute("order.id", order.id);

        // ── Saga: Step 1 — Reserve inventory ──────────────────────
        const reservationIds: string[] = [];
        try {
          for (const item of input.items) {
            const reservation = await inventoryClient.reserve({
              sku: item.sku,
              quantity: item.quantity,
              orderId: order.id,
            });
            reservationIds.push(reservation.reservationId);
          }
          order = await orderRepository.update(order.id, {
            status: "INVENTORY_RESERVED",
            reservationIds,
          });
        } catch (err: unknown) {
          ordersFailedTotal.inc({ reason: "inventory_reserve_failed" });
          // No compensation needed — nothing was reserved successfully.
          // If partial reservations succeeded, release them.
          await this.compensateInventoryReleases(
            reservationIds,
            "Step 1 failure",
            order.id,
          );
          await orderRepository.update(order.id, { status: "FAILED" });
          throw err;
        }

        // ── Saga: Step 2 — Authorize payment ──────────────────────
        let payment;
        try {
          payment = await paymentClient.authorizePayment({
            idempotencyKey: input.idempotencyKey,
            userId: input.userId,
            amount: order.totalAmount,
            currency: input.currency,
            orderId: order.id,
          });
          order = await orderRepository.update(order.id, {
            status: "PAYMENT_AUTHORIZED",
            paymentId: payment.id,
          });
        } catch (err: unknown) {
          ordersFailedTotal.inc({ reason: "payment_authorization_failed" });
          // Compensate: release all inventory
          await this.compensateInventoryReleases(
            reservationIds,
            "Payment authorization failed",
            order.id,
          );
          await orderRepository.update(order.id, { status: "COMPENSATED" });
          throw err;
        }

        // ── Saga: Step 3 — Confirm order ──────────────────────────
        try {
          order = await orderRepository.update(order.id, {
            status: "CONFIRMED",
          });
        } catch (err: unknown) {
          ordersFailedTotal.inc({ reason: "order_confirm_failed" });
          // Compensate: refund payment + release inventory
          await this.compensatePaymentRefund(
            payment.id,
            "Order confirmation failed",
            order.id,
          );
          await this.compensateInventoryReleases(
            reservationIds,
            "Order confirmation failed",
            order.id,
          );
          await orderRepository.update(order.id, { status: "COMPENSATED" });
          throw new InternalError("Failed to confirm order");
        }

        ordersCreatedTotal.inc();
        logger.info(
          {
            orderId: order.id,
            userId: input.userId,
            total: order.totalAmount,
            itemCount: input.items.length,
          },
          "Order created successfully",
        );

        return { order, idempotent: false };
      },
    );
  }

  /**
   * Get an order by ID.
   */
  async getOrder(id: string): Promise<Order> {
    return withSpan("order.get", { "order.id": id }, async () => {
      const order = await orderRepository.findById(id);
      if (!order) {
        throw new NotFoundError("Order", id);
      }
      return order;
    });
  }

  // ── Private helpers ──────────────────────────────────────────────

  private validateInput(input: CreateOrderInput): void {
    const errors: string[] = [];

    if (!input.userId) errors.push("userId is required");
    if (!input.idempotencyKey) errors.push("idempotencyKey is required");
    if (!input.items || input.items.length === 0) {
      errors.push("at least one item is required");
    } else {
      for (const [i, item] of input.items.entries()) {
        if (!item.sku) errors.push(`items[${i}].sku is required`);
        if (!item.quantity || item.quantity < 1) {
          errors.push(`items[${i}].quantity must be >= 1`);
        }
        if (!item.unitPrice || item.unitPrice < 0) {
          errors.push(`items[${i}].unitPrice must be >= 0`);
        }
      }
    }
    if (!input.currency) errors.push("currency is required");

    if (errors.length > 0) {
      throw new ValidationError("Invalid order input", errors);
    }
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
  }

  private async compensateInventoryReleases(
    reservationIds: string[],
    reason: string,
    orderId: string,
  ): Promise<void> {
    for (const reservationId of reservationIds) {
      try {
        await inventoryClient.release(reservationId, reason);
        sagaCompensationsTotal.inc({ step: "inventory_release", success: "true" });
      } catch (err: unknown) {
        sagaCompensationsTotal.inc({ step: "inventory_release", success: "false" });
        logger.error(
          { err, reservationId, orderId },
          "Compensation failed: unable to release inventory. Writing to DLQ.",
        );
        await this.enqueueCompensationTask({
          type: "release_inventory",
          reservationId,
          orderId,
          reason: `${reason} (async retry)`,
          createdAt: new Date(),
        });
      }
    }
  }

  private async compensatePaymentRefund(
    paymentId: string,
    reason: string,
    orderId: string,
  ): Promise<void> {
    try {
      await paymentClient.refundPayment(paymentId, reason);
      sagaCompensationsTotal.inc({ step: "payment_refund", success: "true" });
    } catch (err: unknown) {
      sagaCompensationsTotal.inc({ step: "payment_refund", success: "false" });
      logger.error(
        { err, paymentId, orderId },
        "Compensation failed: unable to refund payment. Writing to DLQ.",
      );
      await this.enqueueCompensationTask({
        type: "refund_payment",
        paymentId,
        orderId,
        reason: `${reason} (async retry)`,
        createdAt: new Date(),
      });
    }
  }

  /**
   * Enqueue a compensation task for asynchronous retry.
   * In production: publish to a message queue (RabbitMQ/Kafka) or
   * insert into an outbox table processed by a background worker.
   * Here we simply log — a real implementation would be wired here.
   */
  private async enqueueCompensationTask(
    _task: CompensationTask,
  ): Promise<void> {
    // TODO: Publish to "compensation.dead-letter" queue
    logger.warn(
      { task: _task },
      "Compensation task enqueued for async retry (stub — implement MQ publish)",
    );
  }
}

export const orderService = new OrderService();
