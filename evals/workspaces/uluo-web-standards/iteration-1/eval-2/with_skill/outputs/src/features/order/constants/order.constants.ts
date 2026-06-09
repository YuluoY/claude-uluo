// ============================================================
// 订单领域常量 — features/order/constants/order.constants.ts
// ============================================================

/** 订单状态转换图：当前状态 -> 允许的下一状态 */
export const ORDER_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['paid', 'cancelled'],
  paid: ['shipped', 'refunded'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  refunded: [],
} as const

/** 可取消的状态 */
export const CANCELLABLE_STATUSES: readonly string[] = ['pending', 'confirmed']

/** 最大订单条目数 */
export const MAX_ORDER_ITEMS = 50

/** 单笔订单最大金额 */
export const MAX_ORDER_AMOUNT = 999_999_99

/** 超时未支付自动取消时间 (ms) — 30 分钟 */
export const ORDER_PAYMENT_TIMEOUT = 30 * 60 * 1000
