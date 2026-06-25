#!/usr/bin/env node

/**
 * charts.js — 检测图表区域的 convert 模式。
 *
 * 规则：
 *   1. data-chart 或 data-chart-lib 元素必须 data-convert="manual"
 *   2. 图表子元素不得包含 data-prop（说明 AI 误把图表条/段当业务组件）
 *   3. 图表元素不得标记 data-convert="component" 或 "auto"
 *
 * 用法：
 *   node scripts/checks/charts.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync } from 'fs'
import { parseHTML } from '../lib/html-parser.js'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.html'])

let findings = 0

function checkFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const $ = parseHTML(content)

  $('[data-chart], [data-chart-lib]').each((_, $el) => {
    const chartType = $el.attr('data-chart') || 'unknown'
    const mode = $el.attr('data-convert')?.trim()

    // 图表必须 data-convert="manual"
    if (!mode) {
      console.log(`${filePath}:0: 图表元素 (data-chart="${chartType}") 缺少 data-convert="manual" 声明`)
      findings++
    } else if (mode !== 'manual') {
      console.log(`${filePath}:0: 图表元素 (data-chart="${chartType}") data-convert="${mode}" 应为 "manual"，HTML 图表只是视觉预览`)
      findings++
    }

    // 检查图表子元素是否有 data-prop（反模式：把图条当业务组件）
    $el.find('[data-prop]').each((_, child) => {
      const $child = child
      const propName = $child.attr('data-prop')
      console.log(`${filePath}:0: 图表元素 (data-chart="${chartType}") 的子元素包含 data-prop="${propName}"，图表 DOM 不应包含业务数据属性`)
      findings++
    })

    // 检查图表子元素是否有 data-component（反模式：图条不应是独立组件）
    $el.find('[data-component]').each((_, child) => {
      const $child = child
      const compName = $child.attr('data-component')
      console.log(`${filePath}:0: 图表元素 (data-chart="${chartType}") 的子元素包含 data-component="${compName}"，图表条/段不应标记为独立组件`)
      findings++
    })
  })
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/charts.js <file-or-dir> [...more]')
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

  console.log(`\ncharts: ${files.length} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
