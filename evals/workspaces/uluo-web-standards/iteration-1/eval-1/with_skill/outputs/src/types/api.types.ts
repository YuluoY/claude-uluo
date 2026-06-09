/**
 * 跨领域共享的 API 响应信封类型。
 * 使用 discriminated union 区分成功与失败——调用方检查 success 后 TS 自动窄化类型。
 */

/** 语义化错误码——前后端共享 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

/** 字段级校验错误 */
export interface FieldError {
  field: string
  message: string
}

/** API 成功响应 */
export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

/** API 失败响应 */
export interface ApiError {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: FieldError[]
  }
  requestId?: string
}

/** API 响应——discriminated union，success 字段区分布尔分支 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError

/** 分页数据包装（offset-based） */
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
