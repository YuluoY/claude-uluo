#!/usr/bin/env node

/**
 * tailwind.js — 检测项目是否使用了 Tailwind CSS（默认禁止）。
 *
 * 检测模式：
 *   1. 扫描 className/class 属性中是否有一连串工具类（如 flex items-center justify-between）
 *   2. 检查是否有 tailwind.config 文件（如果有则不检测）
 *   3. 检查 @tailwind 或 @apply 指令
 *
 * 用法：
 *   node scripts/checks/tailwind.js <file-or-dir> [...more]
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { collectFiles } from '../_shared/collect-files.js'

const EXTENSIONS = new Set(['.vue', '.jsx', '.tsx', '.svelte', '.astro', '.html', '.scss', '.css'])

const TAILWIND_CLASSES = [
  /flex\b/, /grid\b/, /items-center\b/, /justify-between\b/, /justify-center\b/,
  /\bp-[0-9]/, /\bm-[0-9]/, /\bpx-[0-9]/, /\bpy-[0-9]/, /\bmx-\b/, /\bmy-\b/,
  /\bgap-[0-9]/, /\bspace-[xy]-[0-9]/, /\bw-\b/, /\bh-\b/,
  /\bgray-[0-9]/, /\bslate-[0-9]/, /\bzinc-[0-9]/, /\bred-[0-9]/, /\bblue-[0-9]/,
  /\bgreen-[0-9]/, /\byellow-[0-9]/, /\bbg-\b/, /\btext-\b/,
  /\bdark:/, /\bhover:/, /\bfocus:/, /\bactive:/, /\bdisabled:/,
  /\blg:/, /\bmd:/, /\bsm:/, /\bxl:/,
  /\brounded\b/, /\brounded-/,
  /\bshadow\b/, /\bshadow-/,
  /\bmax-w-\b/, /\bmin-h-\b/,
  /\bleading-\b/, /\btracking-\b/, /\bfont-\b/,
]

const TAILWIND_CONFIGS = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs']

const TAILWIND_DIRECTIVES = [
  /@tailwind\b/, /@apply\b/, /@layer\b\s+(base|components|utilities)/,
]

let findings = 0
let suspectedFiles = 0
let excludedProject = false

function checkTailwindConfig(searchDir) {
  let dir = searchDir
  while (dir && dir !== '/') {
    for (const config of TAILWIND_CONFIGS) {
      if (existsSync(join(dir, config))) return true
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return false
}

function isTailwindUtilityClass(token) {
  return TAILWIND_CLASSES.some(p => p.test(token))
}

function countTailwindClasses(classValue) {
  const tokens = classValue.split(/\s+/).filter(Boolean)
  const tailwindTokens = tokens.filter(t => isTailwindUtilityClass(t))

  if (tailwindTokens.length >= 3) return tailwindTokens
  return []
}

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  for (const directive of TAILWIND_DIRECTIVES) {
    if (directive.test(content)) {
      console.log(`${filePath}: 检测到 Tailwind 指令 (@tailwind/@apply/@layer)，项目默认禁止 Tailwind`)
      findings++
      return
    }
  }

  const lines = content.split('\n')
  let fileHasFinding = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue

    const classMatch = trimmed.match(/(?:className|class)\s*=\s*["'`]([^"'`]*)["'`]/)
    if (!classMatch) continue

    const classValue = classMatch[1]
    const tailwindTokens = countTailwindClasses(classValue)

    if (tailwindTokens.length >= 3) {
      const preview = tailwindTokens.slice(0, 5).join(' ')
      console.log(`${filePath}:${lineNum}: 检测到 Tailwind 使用 (${preview}...) — 项目默认禁止 Tailwind，优先使用 Sass + BEM`)
      findings++
      fileHasFinding = true
    }
  }

  if (fileHasFinding) suspectedFiles++
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/tailwind.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const searchDir = inputs[0]
  if (checkTailwindConfig(searchDir)) {
    console.log('Project has tailwind.config — Tailwind is part of project conventions, skipping check.')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS)
  if (files.length === 0) {
    console.log('No supported files found')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\nTailwind check: ${files.length} files scanned, ${findings} finding(s) in ${suspectedFiles} file(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
