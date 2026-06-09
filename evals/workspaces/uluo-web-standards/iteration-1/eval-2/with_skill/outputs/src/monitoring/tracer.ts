// ============================================================
// 分布式追踪 — monitoring/tracer.ts
// 基于 OpenTelemetry SDK，管理 traceId/span 生命周期
// ============================================================

import { trace, context, type Span, SpanStatusCode } from '@opentelemetry/api'
import { AsyncLocalStorage } from 'node:async_hooks'

const TRACER_NAME = 'order-service'

const traceStorage = new AsyncLocalStorage<{ traceId: string; span: Span | null }>()

/**
 * 获取当前请求的 traceId。
 * 优先从 OpenTelemetry active span 提取，fallback 到 AsyncLocalStorage。
 */
export function getTraceId(): string | null {
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    return activeSpan.spanContext().traceId
  }

  const stored = traceStorage.getStore()
  return stored?.traceId ?? null
}

/**
 * 从 HTTP header 中提取或生成 traceId，并存入 AsyncLocalStorage。
 * 在请求中间件中调用。
 */
export function extractTraceId(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-trace-id']
  const headerTraceId = Array.isArray(raw) ? raw[0] : raw
  if (headerTraceId) {
    return headerTraceId
  }

  // 生成新的 traceId（128 位 hex）
  const crypto = getCrypto()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const traceId = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return traceId
}

/** 将 traceId 注入当前请求的 AsyncLocalStorage */
export function setCurrentTraceId(traceId: string): void {
  const store = traceStorage.getStore()
  if (store) {
    traceStorage.enterWith({ ...store, traceId })
  } else {
    traceStorage.enterWith({ traceId, span: null })
  }
}

/**
 * 创建一个追踪 Span 包裹异步操作。
 *
 * @example
 * const result = await withSpan('external.payment.create', async (span) => {
 *   span.setAttribute('orderId', orderId)
 *   return paymentClient.create(orderId, amount)
 * })
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME)
  const span = tracer.startSpan(name)

  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      () => fn(span),
    )
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error: unknown) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    span.end()
  }
}

function getCrypto(): { getRandomValues: (arr: Uint8Array) => Uint8Array } {
  // Node.js 19+ 内置 globalThis.crypto
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    return globalThis.crypto as typeof globalThis.crypto
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto') as typeof import('node:crypto')
  return nodeCrypto.webcrypto as unknown as { getRandomValues: (arr: Uint8Array) => Uint8Array }
}
