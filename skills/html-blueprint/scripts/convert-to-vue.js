#!/usr/bin/env node

/**
 * convert-to-vue.js — 将 html-blueprint HTML 设计稿转换为 Vue 3 SFC 组件。
 *
 * 用法：
 *   node scripts/convert-to-vue.js <input.html> --out <output-dir>
 *   node scripts/convert-to-vue.js <input.html> --out <output-dir> --css scoped
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { parse } from './convert-lib/parser.js'
import { generateVueSFC } from './convert-lib/vue-generator.js'
import { writeComponent } from './convert-lib/code-writer.js'
import { generateReport, printSummary } from './convert-lib/report.js'

async function main() {
  const args = process.argv.slice(2).filter(Boolean)

  let outDir = './output'
  let useFormat = true
  const inputs = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--out' && args[i + 1]) {
      outDir = args[++i]
    } else if (arg === '--no-format') {
      useFormat = false
    } else if (!arg.startsWith('--')) {
      inputs.push(arg)
    }
  }

  if (inputs.length === 0) {
    console.log('Usage: node scripts/convert-to-vue.js <input.html> [--out <dir>] [--no-format]')
    process.exit(0)
  }

  const inputFile = resolve(inputs[0])
  let html
  try { html = readFileSync(inputFile, 'utf-8') }
  catch (_) { console.error(`Error: cannot read "${inputFile}"`); process.exit(1) }

  console.log(`Parsing: ${inputFile}`)
  const nodes = parse(html)
  if (nodes.length === 0) { console.log('No components found.'); process.exit(0) }

  console.log(`Found ${nodes.length} component(s).`)
  mkdirSync(outDir, { recursive: true })

  // 生成组件
  const written = []
  for (const node of nodes) {
    if (node.convertMode === 'layout' || node.convertMode === 'static') {
      console.log(`  ⊙ ${node.name} — ${node.convertMode}, 跳过文件生成`)
      continue
    }
    const sfc = generateVueSFC(node, nodes)
    await writeComponent(node.name, sfc, outDir, 'vue', useFormat)
    written.push(node.name)
    console.log(`  ✓ ${node.name}.vue`)
  }

  // 生成报告
  const report = generateReport(nodes, inputFile)
  const reportPath = join(outDir, 'conversion-report.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')

  printSummary(report)
  console.log(`Output: ${outDir}/ (${written.length} components + report)`)
}

main().catch(err => { console.error('Conversion failed:', err.message); process.exit(1) })
