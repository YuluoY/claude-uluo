#!/usr/bin/env node

/**
 * check-hardcoded-colors.js — 检测硬编码颜色值，而非使用 CSS 变量/token。
 *
 * 检测模式：
 *   - #xxx, #xxxxxx hex 颜色
 *   - rgb(...), rgba(...)
 *   - hsl(...), hsla(...)
 *   - oklch(...)
 *   出现在 inline style、style 属性、类绑定中。
 *
 * 排除：
 *   - CSS 变量定义文件（tokens.css, variables.scss, _variables.scss, theme.*）
 *   - Tailwind config 文件
 *   - 注释行
 *   - SVG path/fill/stroke 中的颜色（图标集）
 *   - var(--...) 引用（证明已在用 token）
 *
 * 用法：
 *   node scripts/check-hardcoded-colors.js <file-or-dir> [...more]
 */

import { readFileSync } from 'fs'
import { basename, extname } from 'path'
import { collectFiles } from './lib/collect-files.js'

const EXTENSIONS = new Set(['.vue', '.jsx', '.tsx', '.scss', '.css', '.svelte', '.astro', '.html'])

// Files known to define colors as part of design system
const TOKEN_FILE_PATTERNS = [
  /tokens/i, /variables/i, /theme/i, /colors/i, /palette/i,
  /tailwind\.config/, /_variables\.scss/,
]

// Color regex patterns
const COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3}\b(?!\s*\))/g,                    // #xxx (but not in var() context)
  /#[0-9a-fA-F]{6}\b/g,                              // #xxxxxx
  /#[0-9a-fA-F]{8}\b/g,                              // #xxxxxxxx (with alpha)
  /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,           // rgb(n,n,n)
  /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g, // rgba(n,n,n,a)
  /hsl\(/g,                                           // hsl(...
  /hsla\(/g,                                          // hsla(...
  /oklch\(/g,                                         // oklch(...
  /color:\s*#[0-9a-fA-F]{3,8}/g,                     // color: #xxx
  /background:\s*#[0-9a-fA-F]{3,8}/g,                // background: #xxx
  /background-color:\s*#[0-9a-fA-F]{3,8}/g,           // background-color: #xxx
  /border-color:\s*#[0-9a-fA-F]{3,8}/g,              // border-color: #xxx
  /fill:\s*#[0-9a-fA-F]{3,8}/g,                       // fill: #xxx (non-SVG context)
  /stroke:\s*#[0-9a-fA-F]{3,8}/g,                     // stroke: #xxx (non-SVG context)
]

let findings = 0
let excluded = 0

function isTokenFile(filePath) {
  const name = basename(filePath).toLowerCase()
  return TOKEN_FILE_PATTERNS.some(p => p.test(name))
}

function isSvgFile(filePath) {
  return extname(filePath).toLowerCase() === '.svg'
}

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  if (isTokenFile(filePath)) {
    excluded++
    return // Token definition files are allowed to have raw colors
  }

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('* ')) {
      continue
    }

    // Skip lines that already use var(--...) — user knows about tokens
    if (/var\(--/.test(trimmed)) {
      continue
    }

    // Skip SVG-related fills/strokes (icon sets)
    if (isSvgFile(filePath) && /\b(fill|stroke)\s*[:=]\s*/.test(trimmed)) {
      continue
    }

    // Check only style/class attribute lines for inline colors
    for (const pattern of COLOR_PATTERNS) {
      pattern.lastIndex = 0 // Reset regex state
      const match = pattern.exec(line)
      if (match) {
        // Exclude if it looks like a data string
        if (isDataString(trimmed)) {
          excluded++
          continue
        }

        const colorValue = match[0].length > 30 ? match[0].slice(0, 30) + '...' : match[0]
        console.log(`${filePath}:${lineNum}: hardcoded color '${colorValue}' — 应使用 CSS 变量或 Design Token`)
        findings++
        break // One finding per line is enough
      }
    }
  }
}

function isDataString(line) {
  return /^\s*(const|let|var)\s+\w+\s*[:=]\s*['"`]/.test(line)
    || /\b(t|i18n|__|intl|locale|translate)\s*\(/.test(line)
    || /^\s*['"`]/.test(line)
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/check-hardcoded-colors.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS)
  if (files.length === 0) {
    console.log('No supported files found (.vue/.jsx/.tsx/.scss/.css/.svelte/.astro)')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\nHardcoded-color check: ${files.length} files scanned, ${findings} finding(s)${excluded > 0 ? `, ${excluded} skipped (token/data files)` : ''}`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
