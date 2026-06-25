#!/usr/bin/env node

/**
 * data-component.js — 检测 HTML 中 data-component 的命名规范。
 *
 * 规则：
 *   1. data-component 值必须为 PascalCase（大写开头，仅字母数字）
 *   2. 禁止泛名：card, button, table, form, box, item, list, component 等
 *   3. 嵌套在 data-list 内的 data-component 元素必须有 data-convert
 *
 * 用法：
 *   node scripts/checks/data-component.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../lib/html-parser.js'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.html'])

// 禁止的泛名（不区分大小写）
const GENERIC_NAMES = new Set([
  'card', 'button', 'table', 'form', 'input', 'modal', 'dialog',
  'box', 'item', 'list', 'component', 'header', 'footer', 'sidebar',
  'navbar', 'container', 'wrapper', 'layout', 'grid', 'row', 'col',
  'text', 'image', 'icon', 'link', 'menu', 'dropdown', 'tab', 'panel',
  'section', 'article', 'nav', 'main', 'aside',
])

// PascalCase: 大写开头，仅字母数字
const PASCAL_CASE_RE = /^[A-Z][a-zA-Z0-9]+$/

let findings = 0

function findLineNumber(html, targetStr, startFrom) {
  const lines = html.split('\n')
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(targetStr)) return i + 1
  }
  return 0
}

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const $ = parseHTML(content)

  $('[data-component]').each((_, $el) => {
    const name = $el.attr('data-component')?.trim()

    if (!name) return

    // 检查 PascalCase
    if (!PASCAL_CASE_RE.test(name)) {
      // 给出具体的问题描述
      if (/[一-鿿]/.test(name)) {
        console.log(`${filePath}:0: data-component "${name}" 包含中文，应使用 PascalCase 如 "StatCard"`)
      } else if (/^[a-z]/.test(name)) {
        console.log(`${filePath}:0: data-component "${name}" 首字母小写，应使用 PascalCase 如 "${name.charAt(0).toUpperCase() + name.slice(1)}"`)
      } else {
        console.log(`${filePath}:0: data-component "${name}" 不是 PascalCase，仅允许字母数字且大写开头`)
      }
      findings++
    }

    // 检查泛名
    if (GENERIC_NAMES.has(name.toLowerCase())) {
      console.log(`${filePath}:0: data-component "${name}" 是泛名，应使用具体业务名称如 "UserCard", "ProjectTable"`)
      findings++
    }

    // 检查 data-list 内的组件是否有 data-convert
    const $listAncestor = $el.closest('[data-list]')
    if ($listAncestor.length && !$el.attr('data-convert')) {
      console.log(`${filePath}:0: data-component "${name}" 在 data-list 内但缺少 data-convert 属性，应标记 data-convert="component"`)
      findings++
    }
  })
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/data-component.js <file-or-dir> [...more]')
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

  console.log(`\ndata-component: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
