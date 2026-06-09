/**
 * 异常类层级 + 边界转换函数。
 * 所有领域异常在 domain 层抛出，在 API 层统一转换为用户可见格式。
 * 禁止第三方原始异常向上泄漏。
 */

import type { ErrorCode, FieldError } from '@/types/api.types'

/** 领域异常基类——domain 层抛出此类或子类异常 */
export class DomainError extends Error
{
  public readonly code: string

  constructor(message: string, code: string)
  {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

/** 资源未找到 */
export class NotFoundError extends DomainError
{
  constructor(resource: string, id: string)
  {
    super(`${resource} not found: ${id}`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/** 业务冲突——如重复预约、状态不允许 */
export class ConflictError extends DomainError
{
  constructor(message: string)
  {
    super(message, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

/** 校验错误——字段级 */
export class ValidationError extends DomainError
{
  public readonly details: FieldError[]

  constructor(message: string, details: FieldError[])
  {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.details = details
  }
}

/** 未授权 */
export class UnauthorizedError extends DomainError
{
  constructor(message = 'Authentication required')
  {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

/** API 层转换结果 */
export interface ApiErrorResult {
  status: number
  code: ErrorCode
  message: string
  details?: FieldError[]
}

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
}

/**
 * 将领域异常转换为 API 错误结果。
 * 在 application → interface 边界调用，确保不向上泄漏原始异常。
 */
export function domainErrorToApiResult(error: DomainError): ApiErrorResult
{
  return {
    status: STATUS_MAP[error.code] ?? 500,
    code: error.code as ErrorCode,
    message: error.message,
    details: error instanceof ValidationError ? error.details : undefined,
  }
}

/**
 * 将任意异常转换为 API 错误结果。
 * 通用兜底——处理非 DomainError 的未知异常。
 */
export function unknownErrorToApiResult(error: unknown): ApiErrorResult
{
  if (error instanceof DomainError)
    return domainErrorToApiResult(error)

  if (error instanceof Error)
  {
    return {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: error.message,
    }
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  }
}
