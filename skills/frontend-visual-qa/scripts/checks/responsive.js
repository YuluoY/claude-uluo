#!/usr/bin/env node

/**
 * responsive.js — 检测可能导致响应式问题的样式模式。
 *
 * 检测规则：
 *   1. 固定 width/height px 值（非 SVG/icon 场景）
 *   2. max-width 小于 320px（移动端溢出风险）
 *   3. 较大文件（> 50 行）缺少 @media 断点声明
 *   4. 硬编码 viewport 字体（如 font-size: 14px）
 *
 * 用法：
 *   node scripts/checks/responsive.js <file-or-dir> [...more]
 */

import { readFileSync } from 'fs'
import { extname } from 'path'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.vue', '.jsx', '.tsx', '.scss', '.css', '.svelte', '.astro', '.html'])

const FIXED_WIDTH_REGEX = /width\s*:\s*(\d{3,})px/g
const FIXED_HEIGHT_REGEX = /height\s*:\s*(\d{3,})px/g
const FIXED_INLINE_WIDTH = /style\s*=\s*["'][^"']*width\s*:\s*\d{3,}px[^"']*["']/g
const VIEWPORT_FONT_REGEX = /font-size\s*:\s*(\d+)v[wh]/g

const SMALL_MAX_WIDTH = /max-width\s*:\s*(\d+)px/g

const RESPONSIVE_PATTERNS = [
  /@media/,
  /md:/, /sm:/, /lg:/, /xl:/,
  /[.:]?(sm|md|lg|xl)-\w/,
]

const SVG_ICON_PATTERNS = [/<svg/, /<path/, /<circle/, /<rect/, /icon/i]

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const lines = content.split('\n')
  const ext = extname(filePath).toLowerCase()
  const isStyleFile = ext === '.scss' || ext === '.css'

  let fileFindings = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue

    let match
    FIXED_WIDTH_REGEX.lastIndex = 0
    while ((match = FIXED_WIDTH_REGEX.exec(line)) !== null) {
      const pxValue = parseInt(match[1])
      if (SVG_ICON_PATTERNS.some(p => p.test(line))) continue
      console.log(`${filePath}:${lineNum}: 固定宽度 ${pxValue}px，可能在小屏溢出，建议使用 max-width 或百分比`)
      fileFindings++
    }

    FIXED_HEIGHT_REGEX.lastIndex = 0
    while ((match = FIXED_HEIGHT_REGEX.exec(line)) !== null) {
      const pxValue = parseInt(match[1])
      if (SVG_ICON_PATTERNS.some(p => p.test(line))) continue
      console.log(`${filePath}:${lineNum}: 固定高度 ${pxValue}px，建议考虑内容溢出和响应式降级`)
      fileFindings++
    }

    SMALL_MAX_WIDTH.lastIndex = 0
    while ((match = SMALL_MAX_WIDTH.exec(line)) !== null) {
      const pxValue = parseInt(match[1])
      if (pxValue < 320) {
        console.log(`${filePath}:${lineNum}: max-width ${pxValue}px (<320px)，移动端可能溢出`)
        fileFindings++
      }
    }

    VIEWPORT_FONT_REGEX.lastIndex = 0
    while ((match = VIEWPORT_FONT_REGEX.exec(line)) !== null) {
      console.log(`${filePath}:${lineNum}: 视口字体 font-size: ${match[0]}，应使用 tokens 和组件尺寸替代`)
      fileFindings++
    }

    FIXED_INLINE_WIDTH.lastIndex = 0
    while ((match = FIXED_INLINE_WIDTH.exec(line)) !== null) {
      console.log(`${filePath}:${lineNum}: inline style 中有固定宽度，建议提取为 class 并响应式处理`)
      fileFindings++
    }
  }

  if (isStyleFile && lines.length > 50) {
    const hasResponsive = RESPONSIVE_PATTERNS.some(p => p.test(content))
    if (!hasResponsive) {
      console.log(`${filePath}: 样式文件 ${lines.length} 行但缺少响应式断点 (@media / 响应式类名)，建议补充移动端降级`)
      fileFindings++
    }
  }

  findings += fileFindings
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/responsive.js <file-or-dir> [...more]')
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

  console.log(`\nResponsive check: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
