#!/usr/bin/env node

/**
 * stylelint 调用器 —— SCSS 自动修复 + 审查。
 *
 * 用法：
 *   node scripts/lint-stylelint.js <file> [...more]           # 审查模式
 *   node scripts/lint-stylelint.js --fix <file> [...more]     # 自动修复 + 审查
 *   或从编排器 import：import { lintStylelint } from './lint-stylelint.js'
 */

import { collectFiles } from './lib/collect-files.js'
import { createReport, addOk, addError, addWarning, printReport } from './lib/report.js'
import { runBin, findConfig } from './lib/run-command.js'

const STYLE_EXTENSIONS = new Set(['.scss', '.css', '.vue'])

// 直接命令行调用
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[\\/]/, '')))
{
  const isFix = process.argv.includes('--fix')
  const inputs = process.argv.slice(2).filter(a => a !== '--fix').filter(Boolean)
  const files = collectFiles(inputs, STYLE_EXTENSIONS)
  if (!files.length) { console.log('No SCSS/CSS/Vue files found'); process.exit(0) }

  const report = createReport()
  lintStylelint(files, report, isFix)
  printReport(report, files.length)
  process.exit(report.errors.length > 0 ? 1 : 0)
}

/** 可被编排器 import 调用的入口。先行 --fix，再审查。 */
export function lintStylelint(files, report, shouldFix = true)
{
  const configPath = findConfig('stylelint.config.mjs')

  // Step 1: 自动修复（属性排序等）
  if (shouldFix)
  {
    const fixArgs = ['--fix']
    if (configPath) fixArgs.push('--config', configPath)
    fixArgs.push(...files)

    const fixResult = runBin('stylelint', fixArgs)
    if (fixResult.code === 0)
      addOk(report, '[stylelint --fix] auto-fixed')
    else
      addWarning(report, '.', 1, '[stylelint --fix] some issues could not be auto-fixed')
  }

  // Step 2: 审查
  const checkArgs = []
  if (configPath) checkArgs.push('--config', configPath)
  checkArgs.push(...files)

  const result = runBin('stylelint', checkArgs)

  if (result.code === 0)
  {
    addOk(report, '[stylelint] passed')
    return
  }

  addError(report, '.', 1, '[stylelint] style issues found (see above)')
}
