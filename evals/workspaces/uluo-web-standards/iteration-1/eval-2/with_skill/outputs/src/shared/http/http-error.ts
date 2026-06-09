// ============================================================
// HTTP 请求错误类型定义 — shared/http/http-error.ts
// ============================================================

/** HTTP 请求错误 — infrastructure 层抛出 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** 上游服务超时 */
export class UpstreamTimeoutError extends HttpError {
  constructor(serviceName: string, timeoutMs: number) {
    super(
      `Upstream service ${serviceName} timed out after ${timeoutMs}ms`,
      504,
    )
    this.name = 'UpstreamTimeoutError'
  }
}

/** 上游服务不可用 */
export class UpstreamUnavailableError extends HttpError {
  constructor(serviceName: string, cause?: string) {
    super(
      `Upstream service ${serviceName} is unavailable${cause ? `: ${cause}` : ''}`,
      502,
    )
    this.name = 'UpstreamUnavailableError'
  }
}
