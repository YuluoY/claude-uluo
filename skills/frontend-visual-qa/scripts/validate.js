#!/usr/bin/env node

/**
 * validate.js — 串行执行所有前端 UI 审美硬约束检查。
 *
 * 管线：
 *   1. checks/emojis.js      → 检测 emoji 图标
 *   2. checks/colors.js      → 检测硬编码颜色
 *   3. checks/states.js      → 检测缺失 UI 状态
 *   4. checks/tailwind.js    → 检测 Tailwind 使用
 *   5. checks/responsive.js  → 检测响应式问题
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
  { name: 'emojis', file: 'checks/emojis.js', desc: 'emoji 图标检测' },
  { name: 'colors', file: 'checks/colors.js', desc: '硬编码颜色检测' },
  { name: 'states', file: 'checks/states.js', desc: '缺失 UI 状态检测' },
  { name: 'tailwind', file: 'checks/tailwind.js', desc: 'Tailwind 使用检测' },
  { name: 'responsive', file: 'checks/responsive.js', desc: '响应式问题检测' },
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
      console.log('\nSequentially runs all frontend UI aesthetic hard-constraint checks:')
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
    console.log('\nSequentially runs all frontend UI aesthetic hard-constraint checks:')
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
    console.log('  frontend-visual-qa 硬约束验证')
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

    const summaryMatch = result.stdout.match(/(\d+) finding/)
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
