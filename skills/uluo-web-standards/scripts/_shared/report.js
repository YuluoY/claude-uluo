/**
 * 报告工具 —— 统一的校验报告容器。
 *
 * 用法：
 *   import { createReport, addError, addWarning, printReport } from './_shared/report.js'
 *   const report = createReport()
 *   addError(report, 'src/foo.ts', 3, 'MUST fix this')
 *   printReport(report, fileCount)
 */

import { relative } from 'path'

export function createReport()
{
  return { ok: [], errors: [], warnings: [] }
}

export function addIssue(report, severity, filePath, line, message)
{
  const entry = `${formatPath(filePath)}:${line}  ${severity === 'error' ? 'error' : 'warning'}  ${message}`
  if (severity === 'error')
    report.errors.push(entry)
  else
    report.warnings.push(entry)
}

export function addError(report, filePath, line, message)
{
  addIssue(report, 'error', filePath, line, message)
}

export function addWarning(report, filePath, line, message)
{
  addIssue(report, 'warning', filePath, line, message)
}

export function addOk(report, message)
{
  report.ok.push(message)
}

export function printReport(report, fileCount)
{
  console.log(`\n=== validation checked ${fileCount} file(s) ===`)

  for (const msg of report.ok)
    console.log(msg)
  for (const error of report.errors)
    console.log(error)
  for (const warning of report.warnings)
    console.log(warning)

  const errorStr = report.errors.length === 1 ? 'error' : 'errors'
  const warningStr = report.warnings.length === 1 ? 'warning' : 'warnings'

  if (report.errors.length === 0)
    console.log(`passed with ${report.warnings.length} ${warningStr}`)
  else
    console.log(`failed with ${report.errors.length} ${errorStr}, ${report.warnings.length} ${warningStr}`)
}

export function exitCode(report)
{
  return report.errors.length > 0 ? 1 : 0
}

function formatPath(filePath)
{
  return relative(process.cwd(), filePath) || filePath
}
