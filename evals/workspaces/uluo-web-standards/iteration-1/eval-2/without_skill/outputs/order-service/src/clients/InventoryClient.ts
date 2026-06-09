import { HttpClient, HttpClientOptions } from "./HttpClient";
import { ConflictError, NotFoundError } from "../errors";
import { logger } from "../observability/logger";
import { loadConfig } from "../config";

export interface Reservation {
  reservationId: string;
  sku: string;
  quantity: number;
  status: "reserved" | "released";
}

export interface ReserveRequest {
  sku: string;
  quantity: number;
  orderId: string;
}

const config = loadConfig();

const options: HttpClientOptions = {
  baseUrl: config.INVENTORY_SERVICE_URL,
  timeoutMs: config.UPSTREAM_TIMEOUT_INVENTORY,
  serviceName: "inventory-service",
  retries: 2,
};

const http = new HttpClient(options);

export class InventoryClient {
  /**
   * Reserve inventory for an order.
   * Throws ConflictError if stock is insufficient.
   */
  async reserve(req: ReserveRequest): Promise<Reservation> {
    try {
      const reservation = await http.request<Reservation>({
        method: "POST",
        path: "/inventory/reserve",
        body: req,
        skipRetry: false,
      });
      logger.info(
        { reservationId: reservation.reservationId, sku: req.sku },
        "Inventory reserved",
      );
      return reservation;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "status" in err
      ) {
        const upstreamErr = err as { status: number; body?: string };
        if (upstreamErr.status === 409) {
          throw new ConflictError(
            `Insufficient stock for SKU ${req.sku}`,
          );
        }
        if (upstreamErr.status === 404) {
          throw new NotFoundError("SKU", req.sku);
        }
      }
      throw err;
    }
  }

  /**
   * Release a reservation (compensation).
   */
  async release(
    reservationId: string,
    reason: string,
  ): Promise<Reservation> {
    try {
      const result = await http.request<Reservation>({
        method: "POST",
        path: `/inventory/${reservationId}/release`,
        body: { reason },
        skipRetry: false,
      });
      logger.info({ reservationId, reason }, "Inventory released");
      return result;
    } catch (err: unknown) {
      logger.error({ err, reservationId }, "Failed to release inventory");
      throw err;
    }
  }
}

export const inventoryClient = new InventoryClient();
