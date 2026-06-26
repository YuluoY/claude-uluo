#!/usr/bin/env node

/**
 * ESLint 调用器 —— 检查 JS/TS/Vue 代码质量 + 模板格式。
 *
 * 用法：
 *   node scripts/checks/eslint.js <file> [...more]
 */

import { collectFiles } from '../_shared/collect-files.js'
import { createReport, addOk, addError, printReport } from '../_shared/report.js'
import { runBin, findConfig } from '../_shared/run-command.js'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue'])

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[\\/]/, '')))
{
  const files = collectFiles(process.argv.slice(2).filter(Boolean), CODE_EXTENSIONS)
  if (files.length === 0) { console.log('No JS/TS/Vue files found'); process.exit(0) }

  const report = createReport()
  lintEslint(files, report)
  printReport(report, files.length)
  process.exit(report.errors.length > 0 ? 1 : 0)
}

export function lintEslint(files, report)
{
  const configPath = findConfig('eslint.config.mjs')
  const args = ['--max-warnings', '999']
  if (configPath) args.push('--config', configPath)
  args.push(...files)

  const result = runBin('eslint', args)

  if (result.code === 0)
  {
    addOk(report, '[eslint] passed')
    return
  }

  addError(report, '.', 1, '[eslint] issues found (see above)')
}
