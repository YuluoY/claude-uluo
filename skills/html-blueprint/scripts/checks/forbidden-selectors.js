#!/usr/bin/env node

/**
 * forbidden-selectors.js — 检测 CSS 中的脆弱选择器和反模式。
 *
 * 规则：
 *   1. 禁止 !important
 *   2. 禁止深度后代选择器（>3 层嵌套的标签选择器）
 *   3. 禁止 :nth-child() 无前置 class（如 div:nth-child(2)）
 *   4. 禁止 *:not(...) 选择器
 *   5. 业务元素使用 position:absolute 时需 data-risk 标记
 *
 * 用法：
 *   node scripts/checks/forbidden-selectors.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../lib/html-parser.js'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.html', '.css'])

let findings = 0

function checkCSS(filePath, content) {
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 跳过注释行
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue
    }

    // 检测 !important
    if (line.includes('!important')) {
      console.log(`${filePath}:${lineNum}: CSS 中使用 !important，应通过优先级合理的 class 选择器替代`)
      findings++
    }

    // 检测深度嵌套选择器: div > div > span 等（3层以上标签选择器）
    const tagCombinators = trimmed.match(/([a-z]+)\s*>\s*[a-z]+\s*>\s*[a-z]+(?:\s*>\s*[a-z]+)*/gi)
    if (tagCombinators) {
      for (const match of tagCombinators) {
        const depth = (match.match(/>/g) || []).length
        if (depth >= 2) {
          console.log(`${filePath}:${lineNum}: 深度标签选择器 "${match.trim()}" 脆弱，应使用明确的 class 选择器`)
          findings++
          break // 每行只报一次
        }
      }
    }

    // 检测 :nth-child() 无前置 class
    if (/:nth-child\(/.test(trimmed)) {
      // 检查 nth-child 前面是否为标签选择器或后代选择器（非 class）
      const beforeNth = trimmed.split(':nth-child')[0]
      // 如果前面是一个裸标签、或者是后代选择器结尾的标签（如 "div"、"div > "、"div "、" tr"）
      // 简单判断：如果是裸标签名结尾，没有 class/id 前缀
      const beforeStripped = beforeNth.trim()
      if (/^[a-z]+$/.test(beforeStripped) || /\s+[a-z]+$/.test(beforeStripped) || />\s*[a-z]+$/.test(beforeStripped)) {
        console.log(`${filePath}:${lineNum}: :nth-child() 前无明确 class 选择器，应使用 .class:nth-child() 增加稳定性`)
        findings++
      }
    }

    // 检测 *:not(...)
    if (/\*:not\(/.test(trimmed)) {
      console.log(`${filePath}:${lineNum}: CSS 使用 *:not() 过于宽泛，应限定具体选择器范围`)
      findings++
    }
  }
}

function checkHTML(filePath, content) {
  const $ = parseHTML(content)

  // 检测 position:absolute 的业务元素
  const businessAttrs = ['data-prop', 'data-component', 'data-field']
  const selector = businessAttrs.map(a => `[${a}]`).join(', ')

  $(selector).each((_, $el) => {
    const style = $el.attr('style') || ''

    if (/position\s*:\s*absolute/.test(style) && $el.attr('data-risk') !== 'absolute-content') {
      const has = businessAttrs.find(a => $el.attr(a))
      console.log(`${filePath}:0: 业务元素 (${has}="${$el.attr(has)}") 使用 position:absolute，应标记 data-risk="absolute-content"`)
      findings++
    }
  })
}

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  // CSS 检查适用于所有文件
  checkCSS(filePath, content)

  // HTML 特有问题（absolute 定位业务内容）
  if (filePath.endsWith('.html')) {
    checkHTML(filePath, content)
  }
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/forbidden-selectors.js <file-or-dir> [...more]')
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

  console.log(`\nforbidden-selectors: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
