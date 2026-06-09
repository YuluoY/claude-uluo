// ===== Type Definitions =====

interface OrderItem {
  price?: number;
  quantity?: number;
}

interface Customer {
  email: string;
  vip?: boolean;
}

interface Order {
  id: string;
  items?: OrderItem[];
  customer?: Customer;
}

interface ProcessedResult {
  total?: number;
  status?: string;
  subtotal?: number;
}

// ===== Constants =====

const VIP_DISCOUNT = 0.9;
const LARGE_ORDER_THRESHOLD = 1000;
const LARGE_ORDER_DISCOUNT = 50;

// ===== Pure Computation Functions =====

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    if (item.price != null && item.quantity != null) {
      return sum + item.price * item.quantity;
    }
    return sum;
  }, 0);
}

function applyVipDiscount(total: number, isVip: boolean): number {
  return isVip ? total * VIP_DISCOUNT : total;
}

function applyLargeOrderDiscount(total: number): number {
  return total > LARGE_ORDER_THRESHOLD ? total - LARGE_ORDER_DISCOUNT : total;
}

function computeFinalTotal(items: OrderItem[], isVip: boolean): number {
  const subtotal = calculateSubtotal(items);
  const afterVip = applyVipDiscount(subtotal, isVip);
  return applyLargeOrderDiscount(afterVip);
}

function isValidOrder(order: Order): order is Order & { items: OrderItem[] } {
  return !!(order?.items && order.items.length > 0);
}

// ===== Side-Effect Functions =====

function logProcessing(orderId: string, total: number): void {
  console.log(`Order processed: ${orderId}, total: ${total}`);
}

function persistOrder(order: Order, result: ProcessedResult): void {
  saveToDatabase(order, result);
}

function notifyCustomer(email: string): void {
  sendEmail(email, 'Your order has been processed');
}

// ===== Main Orchestrator =====

function processOrder(order: Order): ProcessedResult {
  if (!isValidOrder(order)) {
    return {};
  }

  const total = computeFinalTotal(order.items, order.customer?.vip ?? false);

  if (total <= 0) {
    return {};
  }

  const result: ProcessedResult = {
    total,
    status: 'processed',
  };

  logProcessing(order.id, total);
  persistOrder(order, result);
  notifyCustomer(order.customer!.email);

  return result;
}

// ===== External Dependencies (declared but not implemented) =====
declare function saveToDatabase(order: Order, result: ProcessedResult): void;
declare function sendEmail(email: string, message: string): void;
