// ============================================================
// 统一埋点 — monitoring/tracker.ts
// 事件模型：{ event, userId, timestamp, sessionId, traceId, context }
// ============================================================

import { logger } from './logger.js'
import { getTraceId } from './tracer.js'

/** 埋点事件模型 */
export interface TrackingEvent {
  /** snake_case 过去式事件名，如 "order_created" */
  event: string
  /** 操作人 */
  userId?: string
  /** 事件时间戳 (ms) */
  timestamp: number
  /** 会话 ID，串联同一用户会话 */
  sessionId?: string
  /** 分布式追踪 ID */
  traceId?: string
  /** 业务上下文 — 不埋敏感数据 */
  context?: Record<string, unknown>
}

/** 埋点上下文 — 注入常驻字段 */
let trackingContext: {
  userId?: string
  sessionId?: string
} = {}

/** 设置全局埋点上下文（在请求中间件中调用） */
export function setTrackingContext(ctx: { userId?: string; sessionId?: string }): void {
  trackingContext = { ...trackingContext, ...ctx }
}

/** 清除全局埋点上下文（请求结束时调用） */
export function clearTrackingContext(): void {
  trackingContext = {}
}

/**
 * 发送埋点事件。
 * 当前实现为日志输出，可替换为 Kafka / ClickHouse / 第三方 SDK 写入。
 */
export function track(event: string, context?: Record<string, unknown>): void {
  const traceId = getTraceId()

  const trackingEvent: TrackingEvent = {
    event,
    userId: trackingContext.userId,
    timestamp: Date.now(),
    sessionId: trackingContext.sessionId,
    traceId: traceId ?? undefined,
    context,
  }

  logger.info({ trackingEvent }, `track: ${event}`)
}
