/**
 * 性能指标模块——前端 Web Vitals 采集。
 * 最少暴露 LCP / INP / CLS 三项核心指标。
 */

interface MetricEntry {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

/**
 * 上报 Web Vitals 指标。
 * 使用 sendBeacon 保证页面卸载时也能发送。
 */
function reportMetric(metric: MetricEntry): void
{
  if (import.meta.env.DEV)
    return

  const blob = new Blob([JSON.stringify({
    ...metric,
    timestamp: Date.now(),
  })], { type: 'application/json' })

  navigator.sendBeacon('/api/v1/analytics/metrics', blob)
}

/** 初始化 Web Vitals 采集（依赖 web-vitals 库） */
export function initMetricsCollector(): void
{
  // Web Vitals 回调注册由 web-vitals 库在应用入口处完成
  // onLCP((metric) => reportMetric({ name: 'LCP', value: metric.value, rating: metric.rating }))
  // onINP((metric) => reportMetric({ name: 'INP', value: metric.value, rating: metric.rating }))
  // onCLS((metric) => reportMetric({ name: 'CLS', value: metric.value, rating: metric.rating }))
}

export { reportMetric }
export type { MetricEntry }
