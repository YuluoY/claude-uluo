#!/usr/bin/env node

/**
 * check-responsive-viewport.js — 检测 HTML 是否声明了目标画布。
 *
 * 规则：
 *   1. HTML 文件必须包含 @viewport 注释声明或 <meta name="viewport">
 *   2. 缺失时标记为 HARD（无法确定目标画布尺寸）
 *
 * 用法：
 *   node scripts/check-responsive-viewport.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { collectFiles } from './lib/collect-files.js'

const EXTENSIONS = new Set(['.html'])

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const hasViewportComment = /<!--\s*@viewport\s/.test(content)
  const hasMetaViewport = /<meta\s+[^>]*name\s*=\s*["']viewport["']/.test(content)

  if (!hasViewportComment && !hasMetaViewport) {
    console.log(`${filePath}:0: HTML 文件缺少 @viewport 声明，应添加 <!-- @viewport width:1440 height:900 --> 或 <meta name="viewport">`)
    findings++
  }
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/check-responsive-viewport.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS)
  if (files.length === 0) {
    console.log('No supported files found (.html)')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\ncheck-responsive-viewport: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
