/**
 * HTTP 请求错误类型——封装请求失败时的结构化信息。
 * 用于监控和错误处理层，不与底层库（fetch/axios）的原始异常耦合。
 */
export interface HttpErrorPayload {
  status: number
  code: string
  message: string
  requestId?: string
}

export class HttpError extends Error
{
  public readonly status: number
  public readonly code: string
  public readonly requestId?: string

  constructor(payload: HttpErrorPayload)
  {
    super(payload.message)
    this.name = 'HttpError'
    this.status = payload.status
    this.code = payload.code
    this.requestId = payload.requestId
  }
}

export class NetworkError extends Error
{
  constructor(message: string)
  {
    super(message)
    this.name = 'NetworkError'
  }
}
