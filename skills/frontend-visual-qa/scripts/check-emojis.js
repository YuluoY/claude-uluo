#!/usr/bin/env node

/**
 * check-emojis.js — 检测组件文件中用作 UI 的 emoji 字符。
 *
 * 检测目标：Unicode emoji 出现在 JSX 文本节点、模板文本节点或 HTML 文本内容中。
 * 排除：注释行、字符串字面量（可能是数据而非 UI）。
 *
 * 用法：
 *   node scripts/check-emojis.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: emoji 字符 问题描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { collectFiles } from './lib/collect-files.js'

// Unicode emoji ranges (simplified, covers most common emoji)
const EMOJI_RANGES = [
  [0x1F300, 0x1F9FF], // Miscellaneous Symbols, Emoticons, Supplement, Transport, etc.
  [0x2600, 0x27BF],   // Miscellaneous Symbols
  [0x231A, 0x231B],   // Watch, Hourglass
  [0x23E9, 0x23F3],   // Double triangles, Hourglass with flowing sand
  [0x23F8, 0x23FA],   // Control symbols
  [0x1FA00, 0x1FA6F], // Chess Symbols
  [0x1FA70, 0x1FAFF], // Symbols Extended-A
  [0x2702, 0x27B0],   // Dingbats
  [0x1F600, 0x1F64F], // Emoticons
  [0x1F680, 0x1F6FF], // Transport & Map
  [0x1F900, 0x1F9FF], // Supplemental Symbols & Pictographs
  [0x1FA00, 0x1FA6F], // Chess
  [0x1FA70, 0x1FAFF], // Symbols Extended-A
  [0xFE00, 0xFE0F],   // Variation Selectors
  [0x200D, 0x200D],   // ZWJ
  [0xFE4E5, 0xFE4EE], // Special
]

const EXTENSIONS = new Set(['.jsx', '.tsx', '.vue', '.html', '.js', '.ts', '.svelte'])
// Files that are known to use emoji for valid non-icon reasons
// Match only .test. / .spec. in the filename or __tests__ / __spec__ directories
const SKIP_PATTERNS = [/\.test\./, /\.spec\./, /__tests__/, /__specs__/]

let findings = 0
let excluded = 0

function isEmoji(codePoint) {
  return EMOJI_RANGES.some(([lo, hi]) => codePoint >= lo && codePoint <= hi)
}

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const shouldSkip = SKIP_PATTERNS.some(p => p.test(filePath))
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    // Skip comment-only lines
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('* ')) {
      continue
    }

    // Skip lines that look like string data assignments (key-value, i18n, JSON-like)
    if (isStringDataLine(trimmed)) {
      if (hasEmoji(trimmed)) excluded++
      continue
    }

    // Check each character
    for (let j = 0; j < line.length; j++) {
      const cp = line.codePointAt(j)
      if (cp === undefined) continue

      if (isEmoji(cp)) {
        // Get the emoji and a few characters around it for context
        const emoji = String.fromCodePoint(cp)
        const start = Math.max(0, j - 10)
        const end = Math.min(line.length, j + 15)
        const context = line.slice(start, end).trim()

        if (shouldSkip) {
          console.log(`  [SKIPPED] ${filePath}:${lineNum}: emoji '${emoji}' — ${context} (test/spec file)`)
          continue
        }

        console.log(`${filePath}:${lineNum}: emoji '${emoji}' 用作 UI 文本，应替换为项目图标库 (${context})`)
        findings++

        // Handle surrogate pairs (emoji can be 2 JS chars)
        if (cp > 0xFFFF) j++
      }
    }
  }
}

function hasEmoji(str) {
  for (let i = 0; i < str.length; i++) {
    const cp = str.codePointAt(i)
    if (cp !== undefined && isEmoji(cp)) return true
    if (cp !== undefined && cp > 0xFFFF) i++
  }
  return false
}

function isStringDataLine(line) {
  // Heuristic: lines that are clearly data assignments, not UI content
  return /^\s*(const|let|var)\s+\w+\s*[:=]\s*['"`]/.test(line)
    || /\b(t|i18n|__|intl|locale|translate)\s*\(/.test(line)
    || /^\s*\w+\s*:\s*['"`].*['"`]\s*,?\s*$/.test(line)
    || /^\s*['"`].*['"`]\s*,\s*$/.test(line)
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/check-emojis.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS)
  if (files.length === 0) {
    console.log('No supported files found (.jsx/.tsx/.vue/.html/.js/.ts/.svelte)')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\nEmoji check: ${files.length} files scanned, ${findings} finding(s)${excluded > 0 ? `, ${excluded} excluded (data/string lines)` : ''}`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
