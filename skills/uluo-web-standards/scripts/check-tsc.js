#!/usr/bin/env node

/**
 * TypeScript 类型检查 —— tsc --noEmit。
 *
 * tsc --project 始终检查整个 tsconfig.json 项目，不支持按文件过滤。
 * 调用方应先判断 jsFiles.length > 0 再触发本检查。
 *
 * 用法：
 *   直接调用：  node scripts/check-tsc.js [project-root]
 *   编排器 import：import { checkTsc } from './check-tsc.js'
 */

import { createReport, addOk, addError, printReport } from './lib/report.js'
import { runBin } from './lib/run-command.js'

/**
 * 执行 tsc --noEmit 类型检查。
 * @param {object} report — 由 createReport() 创建的报告容器
 * @param {string} [projectRoot] — tsconfig.json 所在目录，默认 cwd
 */
export function checkTsc(report, projectRoot)
{
  const root = projectRoot || process.cwd()
  const result = runBin('tsc', ['--noEmit', '--project', root])

  if (result.code === 0)
    addOk(report, '[tsc] passed')
  else
    addError(report, '.', 1, '[tsc] type errors found (see above)')
}

// 直接命令行调用
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[\\/]/, '')))
{
  const projectRoot = process.argv[2] || process.cwd()
  const report = createReport()
  checkTsc(report, projectRoot)
  printReport(report, 0)
  process.exit(report.errors.length > 0 ? 1 : 0)
}
