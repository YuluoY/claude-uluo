import { HttpClient, HttpClientOptions } from "./HttpClient";
import { ConflictError, UpstreamError } from "../errors";
import { logger } from "../observability/logger";
import { loadConfig } from "../config";

export interface PaymentRequest {
  idempotencyKey: string;
  userId: string;
  amount: number;
  currency: string;
  orderId: string;
}

export interface Payment {
  id: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  amount: number;
}

const config = loadConfig();

const options: HttpClientOptions = {
  baseUrl: config.PAYMENT_SERVICE_URL,
  timeoutMs: config.UPSTREAM_TIMEOUT_PAYMENT,
  serviceName: "payment-service",
  retries: 2, // Only retry on 5xx / timeout, not on 4xx
};

const http = new HttpClient(options);

export class PaymentClient {
  /**
   * Authorize a payment. Payment service is idempotent via idempotencyKey.
   */
  async authorizePayment(req: PaymentRequest): Promise<Payment> {
    try {
      const payment = await http.request<Payment>({
        method: "POST",
        path: "/payments/authorize",
        body: req,
        // Allow retry because we pass an idempotency key
        skipRetry: false,
      });
      logger.info(
        { paymentId: payment.id, orderId: req.orderId },
        "Payment authorized",
      );
      return payment;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "status" in err
      ) {
        const upstreamErr = err as { status: number; body?: string };
        if (upstreamErr.status === 402) {
          throw new ConflictError("Payment declined: insufficient funds");
        }
        if (upstreamErr.status === 409) {
          throw new ConflictError("Duplicate payment");
        }
        if (upstreamErr.status === 422) {
          throw new UpstreamError(
            "INVALID_PAYMENT_METHOD",
            "Payment method is invalid",
            400,
            false,
            "payment-service",
          );
        }
      }
      throw err;
    }
  }

  /**
   * Refund a previously authorized payment (compensation).
   */
  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    try {
      const result = await http.request<Payment>({
        method: "POST",
        path: `/payments/${paymentId}/refund`,
        body: { reason },
        skipRetry: false, // Refund is idempotent
      });
      logger.info({ paymentId, reason }, "Payment refunded");
      return result;
    } catch (err: unknown) {
      logger.error({ err, paymentId }, "Failed to refund payment");
      throw err;
    }
  }
}

export const paymentClient = new PaymentClient();
