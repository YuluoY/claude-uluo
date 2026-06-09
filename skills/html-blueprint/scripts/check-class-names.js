#!/usr/bin/env node

/**
 * check-class-names.js — 检测 HTML 和 CSS 中的 class 命名规范。
 *
 * 规则：
 *   1. 禁止泛名 class: box1, box2, text1, left, right, wrapper-abc 等
 *   2. 禁止中文 class 名
 *   3. 单字 class 在 CSS 中独立出现时建议加 BEM 前缀（SHOULD 级别）
 *
 * 用法：
 *   node scripts/check-class-names.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { collectFiles } from './lib/collect-files.js'

const EXTENSIONS = new Set(['.html', '.css'])

// 禁止的泛名模式
const GENERIC_PATTERNS = [
  { re: /\bbox\d+\b/gi, desc: '泛名' },
  { re: /\btext\d+\b/gi, desc: '泛名' },
  { re: /\.left\d*\b/gi, desc: '位置名' },
  { re: /\.right\d*\b/gi, desc: '位置名' },
  { re: /\.top\d*\b/gi, desc: '位置名' },
  { re: /\.bottom\d*\b/gi, desc: '位置名' },
  { re: /\bwrapper-[a-z]{3,4}\b/gi, desc: '无意义包装名' },
  { re: /\bdiv-style\b/gi, desc: '无语义名' },
  { re: /\bcontainer-\w{3}\b(?![a-z])/gi, desc: '无意义容器名' },
]

// 中文检测
const CHINESE_RE = /[一-鿿]/

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 跳过注释行
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
      continue
    }

    // 检测泛名 class（在 HTML class 属性或 CSS 选择器中）
    for (const { re, desc } of GENERIC_PATTERNS) {
      re.lastIndex = 0
      let match
      while ((match = re.exec(line)) !== null) {
        console.log(`${filePath}:${lineNum}: class "${match[0]}" 是${desc}，请使用 BEM 约定如 ".stat-card__title"`)
        findings++
      }
    }

    // 检测中文 class
    if (CHINESE_RE.test(line) && /\bclass\s*[=:]/.test(line)) {
      const classMatch = line.match(/class\s*[=:]\s*["'][^"']*[一-鿿][^"']*["']/)
      if (classMatch) {
        console.log(`${filePath}:${lineNum}: class 名包含中文字符，应使用英文 BEM 命名`)
        findings++
      }
    }
  }
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/check-class-names.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS)
  if (files.length === 0) {
    console.log('No supported files found (.html, .css)')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\ncheck-class-names: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
