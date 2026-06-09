// =============================================================================
// Refactored processOrder — TypeScript, guard clauses, separated concerns.
// =============================================================================

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface OrderItem {
  price: number;
  quantity: number;
}

interface Customer {
  email: string;
  vip: boolean;
}

interface Order {
  id: string;
  items: OrderItem[];
  customer: Customer;
}

interface OrderResult {
  total?: number;
  status?: string;
}

// ---------------------------------------------------------------------------
// External dependencies (assumed — replace with actual implementations)
// ---------------------------------------------------------------------------

declare function saveToDatabase(order: Order, result: OrderResult): void;
declare function sendEmail(email: string, message: string): void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIP_DISCOUNT_RATE = 0.9;
const LARGE_ORDER_THRESHOLD = 1000;
const LARGE_ORDER_FLAT_DISCOUNT = 50;

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    if (item.price && item.quantity) {
      return sum + item.price * item.quantity;
    }
    return sum;
  }, 0);
}

function applyVipDiscount(subtotal: number, isVip: boolean): number {
  return isVip ? subtotal * VIP_DISCOUNT_RATE : subtotal;
}

function applyLargeOrderDiscount(total: number): number {
  return total > LARGE_ORDER_THRESHOLD ? total - LARGE_ORDER_FLAT_DISCOUNT : total;
}

function computeFinalTotal(items: OrderItem[], isVip: boolean): number {
  const subtotal = calculateSubtotal(items);
  const afterVip = applyVipDiscount(subtotal, isVip);
  return applyLargeOrderDiscount(afterVip);
}

// ---------------------------------------------------------------------------
// Validation / guard helpers
// ---------------------------------------------------------------------------

function isValidOrder(order: Order | null | undefined): order is Order {
  return !!order && Array.isArray(order.items) && order.items.length > 0;
}

function hasValidPricing(items: OrderItem[]): boolean {
  return items.some((item) => item.price && item.quantity);
}

// ---------------------------------------------------------------------------
// Side-effect helpers (logging, persistence, notifications)
// ---------------------------------------------------------------------------

function logOrderProcessing(orderId: string, total: number): void {
  console.log(`Order processed: ${orderId}, total: ${total}`);
}

function persistAndNotify(order: Order, result: OrderResult): void {
  saveToDatabase(order, result);
  sendEmail(order.customer.email, 'Your order has been processed');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function processOrder(order: Order | null | undefined): OrderResult {
  // Guard 1 — no order at all
  if (!isValidOrder(order)) {
    return {};
  }

  // Guard 2 — no line items with valid pricing
  if (!hasValidPricing(order.items)) {
    return {};
  }

  const total = computeFinalTotal(order.items, order.customer?.vip ?? false);

  // Guard 3 — total still zero or negative after discounts (should not happen,
  // but defensive)
  if (total <= 0) {
    return {};
  }

  const result: OrderResult = {
    total,
    status: 'processed',
  };

  logOrderProcessing(order.id, total);
  persistAndNotify(order, result);

  return result;
}
