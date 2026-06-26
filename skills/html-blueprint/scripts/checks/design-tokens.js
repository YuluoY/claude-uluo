#!/usr/bin/env node

/**
 * design-tokens.js — 校验 tokens.css 是否包含必要的核心 token 和受控扩展合规性。
 *
 * 规则：
 *   HARD（必须存在）：
 *     --space-4, --space-8, --space-16, --space-24
 *     --radius-md, --radius-lg
 *     --font-size-h1, --font-size-body-base
 *     --color-primary, --color-text-primary, --color-bg-page
 *   SHOULD（建议存在）：
 *     --breakpoint-md, --breakpoint-lg
 *     --size-md
 *     --shadow-md
 *   受控扩展（WARN）：
 *     - 新增间距必须为 --space-{n}，n 为 4 的倍数
 *     - 新增颜色禁止裸 hex，应通过 color-mix() 派生
 *     - 新增字号应遵循 type scale 比率
 *     - 新增圆角/阴影应从标准刻度中选择
 *
 * 用法：
 *   node scripts/checks/design-tokens.js <css-file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无 HARD 发现，警告不影响）、1（有 HARD 发现）
 */

import { readFileSync } from 'fs'
import { collectFiles } from '../_shared/collect-files.js'

const EXTENSIONS = new Set(['.css'])

const HARD_TOKENS = [
  '--space-4',
  '--space-8',
  '--space-16',
  '--space-24',
  '--radius-md',
  '--radius-lg',
  '--font-size-h1',
  '--font-size-body-base',
  '--color-primary',
  '--color-text-primary',
  '--color-bg-page',
]

const SHOULD_TOKENS = [
  '--breakpoint-md',
  '--breakpoint-lg',
  '--size-md',
  '--shadow-md',
]

let hardFindings = 0
let warnFindings = 0
let scannedFiles = 0

function tokenExists(cssText, tokenName) {
  const re = new RegExp(`${tokenName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:`)
  return re.test(cssText)
}

function checkControlledExtensions(cssText, filePath) {
  const propRe = /--([\w-]+)\s*:\s*([^;]+);/g
  let match

  while ((match = propRe.exec(cssText)) !== null) {
    const name = `--${match[1]}`
    const value = match[2].trim()

    if (HARD_TOKENS.includes(name) || SHOULD_TOKENS.includes(name)) continue
    if (name.startsWith('--breakpoint-') || name.startsWith('--container-') ||
        name.startsWith('--grid-') || name.startsWith('--size-') ||
        name.startsWith('--font-') || name.startsWith('--line-height-') ||
        name.startsWith('--letter-spacing-') || name.startsWith('--font-weight-') ||
        name.startsWith('--motion-') || name.startsWith('--border-') ||
        name.startsWith('--focus-ring') || name.startsWith('--overlay') ||
        name.startsWith('--canvas-')) continue

    if (name.startsWith('--space-')) {
      const n = parseInt(name.replace('--space-', ''))
      if (isNaN(n) || n % 4 !== 0) {
        console.log(`${filePath}:0: 新增间距 ${name}: ${value} 应为 4 的倍数（如 --space-4/8/12/16/.../96），当前值 ${n}`)
        warnFindings++
      }
    }

    if (name.startsWith('--color-') && !name.startsWith('--color-text-') && !name.startsWith('--color-bg-') && !name.startsWith('--color-border-')) {
      if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
        console.log(`${filePath}:0: 新增颜色 ${name}: ${value} 使用裸 hex 值，建议通过 color-mix() 从已有色阶派生`)
        warnFindings++
      }
    }

    if (name.startsWith('--font-size-') && !name.includes('button') && !name.startsWith('--font-size-body') && !/^--font-size-h\d$/.test(name)) {
      console.log(`${filePath}:0: 新增字号 ${name}: ${value} 建议遵循 type scale 比率（1.25 或 1.333），从已有字号派生`)
      warnFindings++
    }

    if (name.startsWith('--radius-')) {
      const standard = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-2xl', '--radius-full']
      if (!standard.includes(name)) {
        console.log(`${filePath}:0: 新增圆角 ${name}: ${value} 建议从标准刻度中选择: sm/md/lg/xl/2xl/full`)
        warnFindings++
      }
    }

    if (name.startsWith('--shadow-')) {
      const standard = ['--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-focus-ring']
      if (!standard.includes(name)) {
        console.log(`${filePath}:0: 新增阴影 ${name}: ${value} 建议从标准层级中选择: sm/md/lg/xl`)
        warnFindings++
      }
    }
  }
}

function checkCssFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  scannedFiles++

  const missingHard = []
  const missingShould = []

  for (const token of HARD_TOKENS) {
    if (!tokenExists(content, token)) {
      missingHard.push(token)
    }
  }

  for (const token of SHOULD_TOKENS) {
    if (!tokenExists(content, token)) {
      missingShould.push(token)
    }
  }

  if (missingHard.length > 0) {
    console.log(`${filePath}:0: tokens.css 缺少必要的核心 token: ${missingHard.join(', ')}`)
    hardFindings += missingHard.length
  }

  if (missingShould.length > 0) {
    console.log(`${filePath}:0: tokens.css 建议补充的 token: ${missingShould.join(', ')}`)
    warnFindings += missingShould.length
  }

  checkControlledExtensions(content, filePath)
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/design-tokens.js <css-file-or-dir> [...more]')
    process.exit(0)
  }

  const allCssFiles = collectFiles(inputs, EXTENSIONS)
  const tokensFiles = allCssFiles.filter(f => {
    const lower = f.toLowerCase()
    return lower.endsWith('tokens.css')
  })

  const filesToCheck = tokensFiles.length > 0 ? tokensFiles : allCssFiles

  if (filesToCheck.length === 0) {
    console.log('No tokens.css files found')
    process.exit(0)
  }

  for (const file of filesToCheck) {
    checkCssFile(file)
  }

  console.log(`\ndesign-tokens: ${scannedFiles} files scanned, ${hardFindings} HARD finding(s), ${warnFindings} warning(s)`)
  process.exit(hardFindings > 0 ? 1 : 0)
}

main()
