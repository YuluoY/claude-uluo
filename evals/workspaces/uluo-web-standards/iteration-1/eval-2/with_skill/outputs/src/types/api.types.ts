// ============================================================
// 跨领域 API 类型定义 — 响应信封 + 错误码
// ============================================================

/** 字段级校验错误 */
export interface FieldError {
  field: string
  message: string
}

/** 跨服务共享的错误码 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_SERVICE_UNAVAILABLE'
  | 'UPSTREAM_TIMEOUT'

/** 领域错误码 — order 服务专属 */
export type OrderErrorCode =
  | 'INSUFFICIENT_INVENTORY'
  | 'ORDER_STATUS_CONFLICT'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'USER_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'DUPLICATE_ORDER'
  | 'PAYMENT_FAILED'

/** 成功响应信封 */
export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

/** 失败响应信封 */
export interface ApiError {
  success: false
  error: {
    code: ErrorCode | OrderErrorCode
    message: string
    details?: FieldError[]
  }
  requestId?: string
}

/** 统一 API 响应 — discriminated union，前端检查 success 后 TS 自动窄化 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** 分页 — cursor-based（推荐用于实时数据） */
export interface CursorPagination {
  nextCursor: string | null
  prevCursor: string | null
  hasNext: boolean
  hasPrev: boolean
  limit: number
}

/** 分页 — offset-based（用于后台管理） */
export interface OffsetPagination {
  total: number
  page: number
  pageSize: number
}

/** cursor-based 分页响应包裹 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: CursorPagination
}

/** 泛型工具：从 ApiResponse 中提取 Success 分支 */
export type SuccessData<T> = T extends ApiResponse<infer U> ? U : never
