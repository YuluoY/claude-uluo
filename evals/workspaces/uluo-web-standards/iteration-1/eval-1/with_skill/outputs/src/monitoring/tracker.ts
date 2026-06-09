/**
 * 埋点模块——统一事件追踪。
 * 事件模型：{ event, userId, timestamp, context }
 * 事件名 snake_case 过去式，不埋敏感数据。
 */

interface TrackEventPayload {
  event: string
  userId?: string
  context?: Record<string, unknown>
}

/**
 * 发送埋点事件。
 * 生产环境通过 navigator.sendBeacon 异步上报，
 * 开发环境仅记录到 logger。
 */
function sendTrack(payload: TrackEventPayload): void
{
  const eventData = {
    ...payload,
    timestamp: Date.now(),
  }

  if (import.meta.env.DEV)
    return

  // 通过 sendBeacon 异步上报，不阻塞主线程
  const blob = new Blob([JSON.stringify(eventData)], { type: 'application/json' })
  navigator.sendBeacon('/api/v1/analytics/events', blob)
}

export const tracker = {
  track: (event: string, context?: Record<string, unknown>): void =>
  {
    sendTrack({ event, context })
  },

  /** 带用户身份的埋点 */
  trackWithUser: (event: string, userId: string, context?: Record<string, unknown>): void =>
  {
    sendTrack({ event, userId, context })
  },
}
