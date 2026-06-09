// ============================================================
// 异常类层级 + 边界转换 — monitoring/errors.ts
// ============================================================

import type { OrderErrorCode, ApiError } from '../types/api.types.js'

// ---- 异常基类 ----

/** 领域异常基类 — domain 层抛出此类异常 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

/** 订单领域异常 */
export class OrderDomainError extends DomainError {
  constructor(
    message: string,
    code: OrderErrorCode,
  ) {
    super(message, code)
    this.name = 'OrderDomainError'
  }
}

/** 基础设施异常 — 外部调用失败、DB 错误等 */
export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly source?: string,
  ) {
    super(message)
    this.name = 'InfrastructureError'
  }
}

// ---- 边界转换函数 ----

/** 资源未找到错误 */
export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/** 将 InfrastructureError/HttpError/DomainError 转换为 API 层 ApiError */
export function toApiError(error: unknown): ApiError {
  if (error instanceof OrderDomainError) {
    return {
      success: false,
      error: {
        code: error.code as OrderErrorCode,
        message: error.message,
      },
    }
  }

  if (error instanceof DomainError) {
    return {
      success: false,
      error: {
        code: error.code as 'CONFLICT' | 'NOT_FOUND',
        message: error.message,
      },
    }
  }

  if (error instanceof InfrastructureError) {
    return {
      success: false,
      error: {
        code: 'UPSTREAM_SERVICE_UNAVAILABLE',
        message: error.message,
      },
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    }
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unknown error occurred',
    },
  }
}

/** 判断是否为可重放的客户端错误（非服务端故障） */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof InfrastructureError) {
    return true
  }
  return false
}
