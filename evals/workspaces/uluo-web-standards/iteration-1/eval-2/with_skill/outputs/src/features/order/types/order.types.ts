// ============================================================
// 订单领域类型 — features/order/types/order.types.ts
// ============================================================

import type { OrderErrorCode } from '../../../types/api.types.js'

/** 订单状态 — string union，不用 enum */
export type OrderStatus = 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

/** 支付方式 */
export type PaymentMethod = 'wechat_pay' | 'alipay' | 'credit_card' | 'debit_card'

/** 订单条目 */
export interface OrderItem {
  itemId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

/** 服务端返回的完整订单 */
export interface Order {
  id: string
  userId: string
  items: OrderItem[]
  status: OrderStatus
  totalAmount: number
  actualAmount: number
  paymentMethod?: PaymentMethod
  paymentTransactionId?: string
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

/** 创建订单请求体 */
export interface CreateOrderPayload {
  userId: string
  items: Array<{
    productId: string
    quantity: number
  }>
  paymentMethod: PaymentMethod
  idempotencyKey: string
}

/** 更新订单请求体 */
export interface UpdateOrderPayload {
  status?: OrderStatus
  paymentMethod?: PaymentMethod
}

/** 订单查询参数 */
export interface OrderQueryParams {
  userId?: string
  status?: OrderStatus
  cursor?: string
  limit?: number
}

/** 订单创建结果 — 区分成功和部分失败 */
export type CreateOrderResult =
  | {
      status: 'success'
      order: Order
    }
  | {
      status: 'failed'
      errorCode: OrderErrorCode
      message: string
    }
