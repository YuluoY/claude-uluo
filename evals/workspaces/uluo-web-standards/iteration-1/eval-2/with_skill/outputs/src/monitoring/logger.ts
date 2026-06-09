// ============================================================
// 结构化日志 — monitoring/logger.ts
// 基于 pino，每条日志携带 timestamp/level/traceId/service
// ============================================================

import pino from 'pino'
import { getTraceId } from './tracer.js'

const SERVICE_NAME = 'order-service'

/** 生产环境 JSON 输出，开发环境 pretty-print */
const isProduction = process.env.NODE_ENV === 'production'

export const logger = pino({
  name: SERVICE_NAME,
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
  mixin() {
    const traceId = getTraceId()
    return traceId ? { traceId } : {}
  },
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
})

/**
 * 创建子 Logger，携带 module 标识。
 * 各领域/文件通过 createChildLogger('order.service') 获取带 module 字段的实例。
 */
export function createChildLogger(moduleName: string): pino.Logger {
  return logger.child({ module: moduleName })
}
