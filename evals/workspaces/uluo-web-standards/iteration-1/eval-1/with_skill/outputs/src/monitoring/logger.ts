/**
 * 日志模块——结构化日志，禁止 console.log。
 * 每条日志携带 timestamp / level / module / traceId。
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  traceId?: string
  message: string
  context?: Record<string, unknown>
}

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const CURRENT_LEVEL: LogLevel = import.meta.env.PROD ? 'WARN' : 'DEBUG'

function createLogEntry(
  level: LogLevel,
  module: string,
  message: string,
  traceId?: string,
  context?: Record<string, unknown>,
): LogEntry
{
  return {
    timestamp: new Date().toISOString(),
    level,
    module,
    traceId,
    message,
    context,
  }
}

function shouldLog(level: LogLevel): boolean
{
  return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[CURRENT_LEVEL]
}

function output(entry: LogEntry): void
{
  const json = JSON.stringify(entry)

  switch (entry.level)
  {
    case 'ERROR':
      process.stderr.write(`${json}\n`)
      break
    case 'WARN':
      process.stderr.write(`${json}\n`)
      break
    default:
      process.stdout.write(`${json}\n`)
  }
}

export function createLogger(moduleName: string)
{
  return {
    debug: (message: string, context?: Record<string, unknown>): void =>
    {
      if (!shouldLog('DEBUG'))
        return

      output(createLogEntry('DEBUG', moduleName, message, undefined, context))
    },

    info: (message: string, context?: Record<string, unknown>): void =>
    {
      if (!shouldLog('INFO'))
        return

      output(createLogEntry('INFO', moduleName, message, undefined, context))
    },

    warn: (message: string, context?: Record<string, unknown>): void =>
    {
      if (!shouldLog('WARN'))
        return

      output(createLogEntry('WARN', moduleName, message, undefined, context))
    },

    error: (message: string, error?: unknown, context?: Record<string, unknown>): void =>
    {
      output(createLogEntry('ERROR', moduleName, message, undefined, {
        ...context,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }))
    },
  }
}
