#!/usr/bin/env node

/**
 * decorative-aria.js — 检测装饰元素的语义隔离。
 *
 * 规则：
 *   1. data-decorative="true" 的元素必须有 aria-hidden="true"
 *   2. data-decorative="true" 的元素不得包含 data-prop, data-field,
 *      data-event, data-slot（装饰元素不应承载业务语义）
 *   3. 装饰元素内的文本内容不宜过长
 *
 * 用法：
 *   node scripts/checks/decorative-aria.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../lib/html-parser.js'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.html'])

// 装饰元素禁止包含的业务属性
const FORBIDDEN_ATTRS = ['data-prop', 'data-field', 'data-event', 'data-slot']

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const $ = parseHTML(content)

  $('[data-decorative="true"]').each((_, $el) => {

    // 必须有 aria-hidden
    if ($el.attr('aria-hidden') !== 'true') {
      console.log(`${filePath}:0: data-decorative="true" 元素缺少 aria-hidden="true"，装饰元素应排除在可访问性树之外`)
      findings++
    }

    // 不得包含业务属性
    for (const attr of FORBIDDEN_ATTRS) {
      if ($el.attr(attr)) {
        console.log(`${filePath}:0: data-decorative="true" 元素不应包含 ${attr}="${$el.attr(attr)}"，装饰元素不能承载业务语义`)
        findings++
      }
    }

    // 检查子元素是否有业务属性（递归）
    $el.find(FORBIDDEN_ATTRS.map(a => `[${a}]`).join(', ')).each((_, child) => {
      const $child = child
      const badAttr = FORBIDDEN_ATTRS.find(a => $child.attr(a))
      if (badAttr) {
        console.log(`${filePath}:0: data-decorative="true" 元素的子元素包含 ${badAttr}="${$child.attr(badAttr)}"，装饰元素子节点不能承载业务语义`)
        findings++
      }
    })

    // SHOULD: 文本内容不宜过长
    const text = $el.text().trim()
    if (text.length > 30) {
      console.log(`${filePath}:0: data-decorative="true" 元素文本内容较长 (${text.length}字符)，装饰元素不应包含可读业务文本`)
      findings++
    }
  })
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/decorative-aria.js <file-or-dir> [...more]')
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

  console.log(`\ndecorative-aria: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
