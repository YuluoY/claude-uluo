#!/usr/bin/env node

/**
 * validate-all.js — 串行执行所有 html-blueprint 硬约束检查。
 *
 * 管线：
 *   1. check-data-component.js     → 组件命名规范
 *   2. check-data-convert.js       → convert 模式合法性
 *   3. check-charts-manual.js      → 图表安全标记
 *   4. check-form-model.js         → 表单数据模型
 *   5. check-decorative-aria.js    → 装饰元素语义隔离
 *   6. check-class-names.js        → class 命名规范
 *   7. check-forbidden-selectors.js → CSS 反模式
 *   8. check-responsive-viewport.js → viewport 声明
 *
 * 用法：
 *   node scripts/validate-all.js <file-or-dir> [...more]
 *   node scripts/validate-all.js --json <file-or-dir> [...more]
 *
 * 输出：汇总报告 + 各脚本统计。
 * 退出码：0（无发现）、1（有发现）、2（脚本执行失败）
 */

import { spawnSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CHECKS = [
  { name: 'check-data-component', file: 'check-data-component.js', desc: 'data-component 命名规范' },
  { name: 'check-data-convert', file: 'check-data-convert.js', desc: 'data-convert 模式合法性' },
  { name: 'check-charts-manual', file: 'check-charts-manual.js', desc: '图表安全标记' },
  { name: 'check-form-model', file: 'check-form-model.js', desc: '表单数据模型' },
  { name: 'check-decorative-aria', file: 'check-decorative-aria.js', desc: '装饰元素语义隔离' },
  { name: 'check-class-names', file: 'check-class-names.js', desc: 'class 命名规范' },
  { name: 'check-forbidden-selectors', file: 'check-forbidden-selectors.js', desc: 'CSS 反模式' },
  { name: 'check-responsive-viewport', file: 'check-responsive-viewport.js', desc: 'viewport 声明' },
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
    } else {
      inputs.push(arg)
    }
  }

  if (inputs.length === 0) {
    console.log('Usage: node scripts/validate-all.js [--json] <file-or-dir> [...more]')
    console.log('\nSequentially runs all html-blueprint hard-constraint checks:')
    for (const check of CHECKS) {
      console.log(`  ${check.file} — ${check.desc}`)
    }
    process.exit(0)
  }

  const startTime = Date.now()
  const results = []
  let totalFindings = 0

  // ── Header ──
  if (!useJson) {
    console.log('══════════════════════════════════════════════')
    console.log('  html-blueprint 硬约束验证')
    console.log(`  目标: ${inputs.join(', ')}`)
    console.log('══════════════════════════════════════════════\n')
  }

  // ── Run each check ──
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

    // Count findings from the summary line
    const summaryMatch = result.stdout.match(/(\d+) finding/)
    if (summaryMatch) {
      totalFindings += parseInt(summaryMatch[1])
    }

    if (!useJson) console.log('')
  }

  // ── Summary ──
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
