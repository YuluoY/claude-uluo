#!/usr/bin/env node

/**
 * data-convert.js — 检测 HTML 中 data-convert 属性的合法性。
 *
 * 规则：
 *   1. data-convert 值必须为: component, layout, static, decorative, manual
 *   2. data-convert="component" 的元素必须有 data-component
 *   3. data-convert="decorative" 的元素应有 aria-hidden="true"（SHOULD 级别）
 *
 * 用法：
 *   node scripts/checks/data-convert.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../lib/html-parser.js'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.html'])

const VALID_VALUES = new Set(['component', 'layout', 'static', 'decorative', 'manual'])

// 常见拼写错误的映射提示
const TYPO_SUGGESTIONS = {
  'components': 'component',
  'auto': 'component',
  'Componnet': 'component',
  'Comp': 'component',
  'Layout': 'layout',
  'Static': 'static',
  'Decorative': 'decorative',
  'Manual': 'manual',
  'text': 'static',
  'data': 'component',
}

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const $ = parseHTML(content)

  $('[data-convert]').each((_, $el) => {
    const mode = $el.attr('data-convert')?.trim()

    if (!mode) return

    // 检查值合法性
    if (!VALID_VALUES.has(mode)) {
      const suggestion = TYPO_SUGGESTIONS[mode]
      if (suggestion) {
        console.log(`${filePath}:0: data-convert="${mode}" 无效，是否应为 "${suggestion}"？有效值: component, layout, static, decorative, manual`)
      } else {
        console.log(`${filePath}:0: data-convert="${mode}" 无效，有效值: component, layout, static, decorative, manual`)
      }
      findings++
    }

    // 检查 component 模式必须有 data-component
    if (mode === 'component' && !$el.attr('data-component')) {
      console.log(`${filePath}:0: data-convert="component" 但缺少 data-component 属性`)
      findings++
    }

    // SHOULD: 检查 decorative 模式应有 aria-hidden
    if (mode === 'decorative' && !$el.attr('aria-hidden')) {
      console.log(`${filePath}:0: data-convert="decorative" 建议添加 aria-hidden="true" 以排除在可访问性树之外`)
      findings++
    }
  })
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/data-convert.js <file-or-dir> [...more]')
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

  console.log(`\ndata-convert: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
