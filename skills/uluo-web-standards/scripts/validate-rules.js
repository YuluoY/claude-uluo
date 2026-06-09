#!/usr/bin/env node

/**
 * uluo-web-standards 验证编排器。
 *
 * 管线：
 *   1. stylelint --fix  → SCSS 自动修复
 *   2. stylelint        → SCSS 审查
 *   3. eslint           → JS/TS/Vue 代码质量 + 格式 + 命名
 *   4. tsc --noEmit     → TS 类型检查
 *   5. 自定义检查        → DDD 层依赖边界
 *
 * 用法：
 *   node scripts/validate-rules.js <file-or-dir> [...more]
 */

import { readFileSync } from 'fs'
import { collectFiles } from './lib/collect-files.js'
import { createReport, printReport } from './lib/report.js'

import { lintStylelint } from './lint-stylelint.js'
import { lintEslint } from './lint-eslint.js'
import { checkTsc } from './check-tsc.js'
import { checkLayerBoundary } from './check-layer-boundary.js'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue'])
const STYLE_EXTENSIONS = new Set(['.scss', '.css', '.vue'])

function main()
{
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0)
  {
    console.log('Usage: node scripts/validate-rules.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const jsFiles = collectFiles(inputs, CODE_EXTENSIONS)
  const styleFiles = collectFiles(inputs, STYLE_EXTENSIONS)
  const allFiles = [...new Set([...jsFiles, ...styleFiles])]

  if (allFiles.length === 0)
  {
    console.log('No supported files found.')
    process.exit(0)
  }

  console.log(`Files to check: ${allFiles.length} (${jsFiles.length} JS/TS/Vue, ${styleFiles.length} SCSS/Vue)\n`)

  const report = createReport()

  // ── Step 1-2: stylelint ──
  if (styleFiles.length > 0)
    lintStylelint(styleFiles, report, true)

  // ── Step 3: eslint ──
  if (jsFiles.length > 0)
    lintEslint(jsFiles, report)

  // ── Step 3.5: tsc ──
  if (jsFiles.length > 0)
    checkTsc(report)

  // ── Step 5: 自定义检查（DDD 层边界——eslint 无法语义理解）──
  for (const filePath of jsFiles)
  {
    const content = readFileSync(filePath, 'utf-8')
    checkLayerBoundary(filePath, content, report)
  }

  printReport(report, jsFiles.length)
  process.exit(report.errors.length > 0 ? 1 : 0)
}

main()
