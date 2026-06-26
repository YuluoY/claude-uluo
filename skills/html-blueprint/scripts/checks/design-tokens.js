#!/usr/bin/env node

/**
 * design-tokens.js — 校验 tokens.css 是否包含必要的核心 token。
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
