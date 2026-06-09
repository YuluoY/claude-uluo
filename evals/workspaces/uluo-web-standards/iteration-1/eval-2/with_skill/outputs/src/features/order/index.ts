// ============================================================
// 订单领域出口 — features/order/index.ts
// ============================================================

export { OrderService } from './services/order.service.js'
export { createOrderApiClients } from './api/order.api.js'
export type { OrderApiClients, UserInfo, PaymentCreateRequest, PaymentCreateResponse, InventoryReserveRequest, InventoryReleaseRequest } from './api/order.api.js'
export type {
  Order,
  OrderStatus,
  OrderItem,
  OrderQueryParams,
  CreateOrderPayload,
  UpdateOrderPayload,
  CreateOrderResult,
  PaymentMethod,
} from './types/order.types.js'
export {
  ORDER_STATUS_TRANSITIONS,
  CANCELLABLE_STATUSES,
  MAX_ORDER_ITEMS,
  MAX_ORDER_AMOUNT,
  ORDER_PAYMENT_TIMEOUT,
} from './constants/order.constants.js'
