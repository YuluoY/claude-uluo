// ============================================================
// 性能指标 — monitoring/metrics.ts
// RED 四指标：Rate / Error / Duration(P50/P99) / External Call Duration
// ============================================================

import { logger } from './logger.js'

// ---- 指标存储（内存实现，生产替换为 Prometheus client） ----

interface MetricsSnapshot {
  totalRequests: number
  errorRequests: number
  latencies: number[]
  externalCallDurations: Map<string, number[]>
}

const snapshot: MetricsSnapshot = {
  totalRequests: 0,
  errorRequests: 0,
  latencies: [],
  externalCallDurations: new Map(),
}

/** 记录一次请求 */
export function recordRequest(statusCode: number, durationMs: number): void {
  snapshot.totalRequests++
  if (statusCode >= 500) {
    snapshot.errorRequests++
  }
  snapshot.latencies.push(durationMs)

  // 保留最近 1000 个样本
  if (snapshot.latencies.length > 1000) {
    snapshot.latencies = snapshot.latencies.slice(-1000)
  }
}

/** 记录一次外部调用延迟 */
export function recordExternalCall(serviceName: string, durationMs: number): void {
  const existing = snapshot.externalCallDurations.get(serviceName)
  if (existing) {
    existing.push(durationMs)
    if (existing.length > 500) {
      snapshot.externalCallDurations.set(serviceName, existing.slice(-500))
    }
  } else {
    snapshot.externalCallDurations.set(serviceName, [durationMs])
  }
}

/** 计算当前 QPS（基于最近 60 秒的滑动窗口） */
export function getCurrentMetrics(): {
  qps: number
  errorRate: number
  p50Latency: number
  p99Latency: number
  externalCalls: Record<string, { avg: number; p99: number }>
} {
  const { totalRequests, errorRequests, latencies, externalCallDurations } = snapshot

  const sorted = [...latencies].sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0
  const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0

  const externalCalls: Record<string, { avg: number; p99: number }> = {}
  for (const [name, durations] of externalCallDurations.entries()) {
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const avg = sortedDurations.reduce((s, v) => s + v, 0) / sortedDurations.length
    const p99Duration = sortedDurations[Math.floor(sortedDurations.length * 0.99)] ?? 0
    externalCalls[name] = { avg: Math.round(avg), p99: p99Duration }
  }

  return {
    qps: totalRequests,
    errorRate: totalRequests > 0 ? errorRequests / totalRequests : 0,
    p50Latency: p50,
    p99Latency: p99,
    externalCalls,
  }
}

/** 定期输出指标快照（每 60 秒） */
export function startMetricsReporter(): void {
  setInterval(() => {
    const metrics = getCurrentMetrics()
    logger.info({ metrics }, 'metrics snapshot')
  }, 60_000)
}
