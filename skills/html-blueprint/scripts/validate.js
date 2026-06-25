#!/usr/bin/env node

/**
 * validate.js — 串行执行所有 html-blueprint 硬约束检查。
 *
 * 管线：
 *   1. checks/data-component.js     → 组件命名规范
 *   2. checks/data-convert.js       → convert 模式合法性
 *   3. checks/charts.js             → 图表安全标记
 *   4. checks/form-model.js         → 表单数据模型
 *   5. checks/decorative-aria.js    → 装饰元素语义隔离
 *   6. checks/class-names.js        → class 命名规范
 *   7. checks/forbidden-selectors.js → CSS 反模式
 *   8. checks/responsive-viewport.js → viewport 声明
 *   9. checks/theme-consistency.js   → 跨蓝图主题一致性
 *  10. checks/design-structure.js    → design/ 目录结构校验
 *  11. checks/design-tokens.js       → tokens.css 核心 token 校验
 *
 * 用法：
 *   node scripts/validate.js <file-or-dir> [...more]
 *   node scripts/validate.js --json <file-or-dir> [...more]
 *
 * 输出：汇总报告 + 各脚本统计。
 * 退出码：0（无发现）、1（有发现）、2（脚本执行失败）
 */

import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CHECKS = [
  { name: 'data-component', file: 'checks/data-component.js', desc: 'data-component 命名规范' },
  { name: 'data-convert', file: 'checks/data-convert.js', desc: 'data-convert 模式合法性' },
  { name: 'charts', file: 'checks/charts.js', desc: '图表安全标记' },
  { name: 'form-model', file: 'checks/form-model.js', desc: '表单数据模型' },
  { name: 'decorative-aria', file: 'checks/decorative-aria.js', desc: '装饰元素语义隔离' },
  { name: 'class-names', file: 'checks/class-names.js', desc: 'class 命名规范' },
  { name: 'forbidden-selectors', file: 'checks/forbidden-selectors.js', desc: 'CSS 反模式' },
  { name: 'responsive-viewport', file: 'checks/responsive-viewport.js', desc: 'viewport 声明' },
  { name: 'theme-consistency', file: 'checks/theme-consistency.js', desc: '跨蓝图主题一致性' },
  { name: 'design-structure', file: 'checks/design-structure.js', desc: 'design/ 目录结构校验' },
  { name: 'design-tokens', file: 'checks/design-tokens.js', desc: 'tokens.css 核心 token 校验' },
]

function runCheck(name, file, inputs) {
  const scriptPath = resolve(__dirname, file)
  const args = [...inputs]

  const result = spawnSync('node', [scriptPath, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
    timeout: 30000,
  })

  const stdout = result.stdout?.trim() || ''
  const stderr = result.stderr?.trim() || ''

  return {
    name,
    exitCode: result.status,
    stdout,
    stderr,
    error: result.error?.message || null,
  }
}

function main() {
  const args = process.argv.slice(2).filter(Boolean)

  let useJson = false
  const inputs = []

  for (const arg of args) {
    if (arg === '--json') {
      useJson = true
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/validate.js [--json] <file-or-dir> [...more]')
      console.log('\nSequentially runs all html-blueprint hard-constraint checks:')
      for (const check of CHECKS) {
        console.log(`  ${check.file} — ${check.desc}`)
      }
      process.exit(0)
    } else {
      inputs.push(arg)
    }
  }

  if (inputs.length === 0) {
    console.log('Usage: node scripts/validate.js [--json] <file-or-dir> [...more]')
    console.log('\nSequentially runs all html-blueprint hard-constraint checks:')
    for (const check of CHECKS) {
      console.log(`  ${check.file} — ${check.desc}`)
    }
    process.exit(0)
  }

  const startTime = Date.now()
  const results = []
  let totalFindings = 0

  if (!useJson) {
    console.log('══════════════════════════════════════════════')
    console.log('  html-blueprint 硬约束验证')
    console.log(`  目标: ${inputs.join(', ')}`)
    console.log('══════════════════════════════════════════════\n')
  }

  for (const check of CHECKS) {
    if (!useJson) {
      console.log(`── ${check.desc} ──`)
    }

    const result = runCheck(check.name, check.file, inputs)
    results.push(result)

    if (result.error) {
      if (!useJson) console.log(`  ✗ 脚本执行失败: ${result.error}`)
      continue
    }

    if (result.stdout) {
      if (!useJson) {
        for (const line of result.stdout.split('\n')) {
          console.log(`  ${line}`)
        }
      }
    }

    if (result.stderr) {
      if (!useJson) {
        for (const line of result.stderr.split('\n')) {
          if (line.trim()) console.log(`  [stderr] ${line}`)
        }
      }
    }

    const hardMatch = result.stdout.match(/(\d+)\s+HARD\s+finding/)
    const summaryMatch = hardMatch || result.stdout.match(/(\d+)\s+finding/)
    if (summaryMatch) {
      totalFindings += parseInt(summaryMatch[1])
    }

    if (!useJson) console.log('')
  }

  const elapsed = Date.now() - startTime

  if (useJson) {
    const jsonOutput = {
      elapsed: `${elapsed}ms`,
      totalFindings,
      checks: results.map(r => ({
        name: r.name,
        exitCode: r.exitCode,
        error: r.error,
        summary: r.stdout.split('\n').pop() || '',
      })),
    }
    console.log(JSON.stringify(jsonOutput, null, 2))
  } else {
    console.log('══════════════════════════════════════════════')
    console.log(`  总计: ${totalFindings} 个发现 · ${elapsed}ms`)
    console.log('══════════════════════════════════════════════')

    if (totalFindings > 0) {
      console.log('\n提示：上述发现为自动检测结果，可能存在 false positive。')
      console.log('请根据项目上下文判断是否需要修复。')
    } else {
      console.log('\n✓ 所有硬约束检查通过。')
    }
  }

  process.exit(totalFindings > 0 ? 1 : 0)
}

main()
