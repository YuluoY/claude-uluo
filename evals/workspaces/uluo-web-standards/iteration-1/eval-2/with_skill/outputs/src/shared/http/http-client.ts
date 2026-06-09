// ============================================================
// 统一 HTTP Client — shared/http/http-client.ts
// 封装请求实例：baseURL / timeout / interceptor / token 注入 / 错误包装
// ============================================================

import type { ApiResponse } from '../../types/api.types.js'
import { HttpError, UpstreamTimeoutError } from './http-error.js'
import { logger } from '../../monitoring/logger.js'
import { getTraceId } from '../../monitoring/tracer.js'

/** HttpClient 配置 */
export interface HttpClientConfig {
  baseURL: string
  timeout: number
  retryConfig?: RetryConfig
}

/** 重试配置 */
export interface RetryConfig {
  maxRetries: number
  backoffMs: number
  retryableStatuses: readonly number[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  backoffMs: 500,
  retryableStatuses: [502, 503, 504],
}

/** 请求选项 */
export interface RequestOptions {
  headers?: Record<string, string>
  params?: Record<string, string>
  signal?: AbortSignal
}

/**
 * 建立统一的 HTTP 客户端实例。
 * 各 features/api/ 只通过此 client 发请求，不直接调 fetch。
 */
export function createHttpClient(config: HttpClientConfig) {
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config.retryConfig,
  }

  const controller = new AbortController()

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = buildUrl(config.baseURL, path, options?.params)
    const traceId = getTraceId()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(traceId ? { 'X-Trace-Id': traceId } : {}),
      ...options?.headers,
    }

    const startTime = Date.now()

    let lastError: unknown

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = retryConfig.backoffMs * Math.pow(2, attempt - 1)
        await sleep(delay)
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: options?.signal ?? controller.signal,
        })

        const duration = Date.now() - startTime

        if (!response.ok) {
          let bodyText = ''
          try {
            bodyText = await response.text()
          } catch {
            // 无法读取 body 时忽略
          }

          const httpErr = new HttpError(
            `HTTP ${response.status} ${method} ${path}: ${bodyText.slice(0, 200)}`,
            response.status,
            bodyText,
          )

          if (retryConfig.retryableStatuses.includes(response.status) && attempt < retryConfig.maxRetries) {
            logger.warn(httpErr, `Retry attempt ${attempt + 1}/${retryConfig.maxRetries} for ${method} ${path}`)
            lastError = httpErr
            continue
          }

          throw httpErr
        }

        logger.info(
          { method, path, status: response.status, duration, traceId },
          `${method} ${path} completed`,
        )

        // 204 No Content
        if (response.status === 204) {
          return undefined as T
        }

        const data = await response.json() as T
        return data
      } catch (error: unknown) {
        if (error instanceof HttpError) {
          lastError = error
          continue
        }

        // AbortError — 超时
        if (error instanceof DOMException && error.name === 'AbortError') {
          const timeoutErr = new UpstreamTimeoutError(url, config.timeout)
          logger.error({ url, traceId, timeout: config.timeout }, `Request timeout: ${method} ${path}`)
          throw timeoutErr
        }

        // 网络错误
        lastError = error
        if (attempt < retryConfig.maxRetries) {
          logger.warn(error, `Network error, retrying (${attempt + 1}/${retryConfig.maxRetries})`)
          continue
        }
        throw new HttpError(
          `Network error for ${method} ${path}: ${String(error)}`,
          0,
        )
      }
    }

    throw lastError
  }

  return {
    get<T>(path: string, options?: RequestOptions): Promise<T> {
      return request<T>('GET', path, undefined, options)
    },

    post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('POST', path, body, options)
    },

    put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('PUT', path, body, options)
    },

    patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>('PATCH', path, body, options)
    },

    delete<T>(path: string, options?: RequestOptions): Promise<T> {
      return request<T>('DELETE', path, undefined, options)
    },

    /** 取消所有进行中的请求 */
    abortAll(): void {
      controller.abort()
    },
  }
}

/** 构建完整 URL，拼接查询参数 */
function buildUrl(baseURL: string, path: string, params?: Record<string, string>): string {
  const url = new URL(path, baseURL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value)
    }
  }
  return url.toString()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
