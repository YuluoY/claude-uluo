// ============================================================
// API 常量 — constants/api.constants.ts
// ============================================================

/** 默认请求超时 (ms) */
export const DEFAULT_TIMEOUT = 10_000

/** 支付服务超时（支付操作耗时长，给更多时间） */
export const PAYMENT_TIMEOUT = 15_000

/** 默认分页大小 */
export const DEFAULT_PAGE_SIZE = 20

/** 最大分页大小 — 防滥查 */
export const MAX_PAGE_SIZE = 100

/** 幂等性 key 缓存有效期 (ms) — 24 小时 */
export const IDEMPOTENCY_KEY_TTL = 24 * 60 * 60 * 1000
