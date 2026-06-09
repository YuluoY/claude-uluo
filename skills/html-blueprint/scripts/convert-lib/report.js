/**
 * report.js — 生成转换置信度报告。
 *
 * 用法：
 *   import { generateReport } from './convert-lib/report.js'
 *   const report = generateReport(nodes, inputFile)
 */

/**
 * 从 ComponentNode[] 生成转换置信度报告。
 * @param {import('./ir.js').ComponentNode[]} nodes
 * @param {string} inputFile — 输入文件路径
 * @returns {Object} 报告对象
 */
export function generateReport(nodes, inputFile) {
  const components = nodes
    .filter(n => n.convertMode === 'component' || n.convertMode === 'manual')
    .map(node => ({
      component: node.name,
      confidence: node.confidence,
      convertMode: node.confidence >= 0.85 ? 'auto' : node.confidence >= 0.6 ? 'review' : 'manual',
      issues: node.issues,
      props: node.props.map(p => p.name),
      events: node.events.map(e => e.name),
      slots: node.slots.map(s => s.name),
    }))

  return {
    _notice: '生成的代码为开发骨架，非生产就绪。需补充：API 调用、业务逻辑、错误处理等。',
    source: inputFile,
    generatedAt: new Date().toISOString(),
    totalComponents: components.length,
    autoConverted: components.filter(c => c.convertMode === 'auto').length,
    reviewNeeded: components.filter(c => c.convertMode === 'review').length,
    manualOnly: components.filter(c => c.convertMode === 'manual').length,
    components,
  }
}

/**
 * 打印人类可读的转换摘要。
 * @param {Object} report
 */
export function printSummary(report) {
  console.log('\n══════════════════════════════════════════════')
  console.log('  html-blueprint 转换报告')
  console.log(`  源文件: ${report.source}`)
  console.log('══════════════════════════════════════════════')
  console.log(`  组件总数: ${report.totalComponents}`)
  console.log(`  自动转换: ${report.autoConverted}`)
  console.log(`  需人工审核: ${report.reviewNeeded}`)
  console.log(`  仅手动: ${report.manualOnly}`)
  console.log('')

  for (const comp of report.components) {
    const icon = comp.convertMode === 'auto' ? '✓' : comp.convertMode === 'review' ? '⚠' : '✗'
    console.log(`  ${icon} ${comp.component} — ${comp.convertMode} (${(comp.confidence * 100).toFixed(0)}%)`)
    for (const issue of comp.issues) {
      console.log(`    → ${issue}`)
    }
  }
  console.log('══════════════════════════════════════════════\n')
}
