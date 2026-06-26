#!/usr/bin/env node

/**
 * form-model.js — 检测表单的数据模型和字段声明。
 *
 * 规则：
 *   1. <form> 必须有 data-model
 *   2. <form> 必须有 data-component
 *   3. <form> 内的 <input>/<select>/<textarea> 必须有 data-field
 *      除非标记了 data-static="true"
 *   4. 表单字段建议声明 data-type
 *
 * 用法：
 *   node scripts/checks/form-model.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../_shared/html-parser.js'
import { collectFiles } from '../_shared/collect-files.js'

const EXTENSIONS = new Set(['.html'])

const FORM_CONTROLS = 'input, select, textarea'

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const $ = parseHTML(content)

  $('form').each((_, el) => {
    const $form = el

    // 检查 data-model
    const model = $form.attr('data-model')?.trim()
    if (!model) {
      console.log(`${filePath}:0: <form> 缺少 data-model 属性，应声明表单数据模型名称如 data-model="user"`
      )
      findings++
    }

    // 检查 data-component
    if (!$form.attr('data-component')) {
      console.log(`${filePath}:0: <form${model ? ` data-model="${model}"` : ''}> 缺少 data-component 属性，表单应声明为组件`)
      findings++
    }

    // 检查表单控件
    $form.find(FORM_CONTROLS).each((_, ctrl) => {
      const $ctrl = ctrl
      const tagName = ctrl.tagName?.toLowerCase() || ctrl.name

      // 跳过标记为 static 的控件
      if ($ctrl.attr('data-static') === 'true') return

      // 跳过 submit/reset/button 类型的 input
      const type = $ctrl.attr('type')?.toLowerCase()
      if (tagName === 'input' && ['submit', 'reset', 'button', 'hidden'].includes(type)) return

      // 检查 data-field
      const field = $ctrl.attr('data-field')?.trim()
      if (!field) {
        const placeholder = $ctrl.attr('placeholder') || ''
        const name = $ctrl.attr('name') || ''
        const id = $ctrl.attr('id') || ''
        const label = placeholder || name || id || `<${tagName}>`
        console.log(`${filePath}:0: <form> 内的 ${label} 缺少 data-field 属性，表单控件必须声明字段名`)
        findings++
      }

      // SHOULD: 建议声明 data-type
      if (field && !$ctrl.attr('data-type')) {
        console.log(`${filePath}:0: <form> 内的字段 "${field}" 建议声明 data-type（如 string, number, boolean, email, date）`)
        findings++
      }
    })

    // 检查提交按钮
    const $submit = $form.find('button[type="submit"], input[type="submit"], button:not([type])').first()
    if ($submit.length && !$submit.attr('data-event')) {
      console.log(`${filePath}:0: <form> 内的提交按钮缺少 data-event="submit" 声明`)
      findings++
    }
  })
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/form-model.js <file-or-dir> [...more]')
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

  console.log(`\nform-model: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
