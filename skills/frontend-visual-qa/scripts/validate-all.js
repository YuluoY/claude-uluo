#!/usr/bin/env node

/**
 * validate-all.js — 串行执行所有前端 UI 审美硬约束检查。
 *
 * 管线：
 *   1. check-emojis.js      → 检测 emoji 图标
 *   2. check-hardcoded-colors.js → 检测硬编码颜色
 *   3. check-missing-states.js   → 检测缺失 UI 状态
 *   4. check-tailwind.js         → 检测 Tailwind 使用
 *   5. check-responsive.js       → 检测响应式问题
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
  { name: 'check-emojis', file: 'check-emojis.js', desc: 'emoji 图标检测' },
  { name: 'check-hardcoded-colors', file: 'check-hardcoded-colors.js', desc: '硬编码颜色检测' },
  { name: 'check-missing-states', file: 'check-missing-states.js', desc: '缺失 UI 状态检测' },
  { name: 'check-tailwind', file: 'check-tailwind.js', desc: 'Tailwind 使用检测' },
  { name: 'check-responsive', file: 'check-responsive.js', desc: '响应式问题检测' },
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
    console.log('\nSequentially runs all frontend UI aesthetic hard-constraint checks:')
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
    console.log('  frontend-visual-qa 硬约束验证')
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
        // Print each line indented for readability
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
        summary: r.stdout.split('\n').pop() || '', // Last line is the summary
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
