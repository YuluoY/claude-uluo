import { randomUUID } from "crypto";

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  paymentId?: string;
  reservationIds: string[];
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | "PENDING"
  | "INVENTORY_RESERVED"
  | "PAYMENT_AUTHORIZED"
  | "CONFIRMED"
  | "FAILED"
  | "COMPENSATED";

/**
 * In-memory order repository. Replace with a real database (PostgreSQL/MySQL)
 * in production with proper transactions, indexing on idempotencyKey, etc.
 *
 * In production this would use a connection pool and parameterized queries.
 */
const orders = new Map<string, Order>();
const idempotencyIndex = new Map<string, Order>();

export class OrderRepository {
  async findById(id: string): Promise<Order | undefined> {
    return orders.get(id);
  }

  async findByIdempotencyKey(key: string): Promise<Order | undefined> {
    return idempotencyIndex.get(key);
  }

  async create(input: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
    const now = new Date();
    const order: Order = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    orders.set(order.id, order);
    idempotencyIndex.set(order.idempotencyKey, order);
    return order;
  }

  async update(id: string, patch: Partial<Order>): Promise<Order> {
    const existing = orders.get(id);
    if (!existing) throw new Error(`Order ${id} not found`);
    const updated: Order = {
      ...existing,
      ...patch,
      updatedAt: new Date(),
    };
    orders.set(id, updated);
    return updated;
  }
}

export const orderRepository = new OrderRepository();
