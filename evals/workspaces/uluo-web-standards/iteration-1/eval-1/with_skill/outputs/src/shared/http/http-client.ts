/**
 * 统一 HTTP 请求客户端（基于 fetch 封装）。
 * 处理 baseURL、timeout、统一错误转换和 token 注入。
 * 各 features 的 api/ 只 import 此 client，不直接调底层库。
 */
import type { ApiError, ApiResponse } from '@/types/api.types'
import { HttpError, NetworkError } from './http-error'
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api.constants'

const HTTP_TIMEOUT_MS = API_TIMEOUT

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>>
{
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)

  const mergedOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  try
  {
    const response = await fetch(`${API_BASE_URL}${path}`, mergedOptions)
    clearTimeout(timeoutId)

    const body = await response.json() as ApiResponse<T>

    if (!response.ok)
    {
      const errorBody = body as ApiError

      throw new HttpError({
        status: response.status,
        code: errorBody.error?.code ?? 'INTERNAL_ERROR',
        message: errorBody.error?.message ?? 'Unknown error',
        requestId: errorBody.requestId,
      })
    }

    return body
  }
  catch (error: unknown)
  {
    clearTimeout(timeoutId)

    // 已经是业务异常 → 直接重抛
    if (error instanceof HttpError)
      throw error

    // AbortError → timeout
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new NetworkError('Request timeout')

    // 网络层异常
    if (error instanceof TypeError)
      throw new NetworkError('Network error')

    throw error
  }
}

export const http = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(
      path,
      { ...options, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined },
    ),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(
      path,
      { ...options, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined },
    ),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(
      path,
      { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined },
    ),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
