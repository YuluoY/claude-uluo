import { describe, it, expect } from 'vitest'
import { checkSpecFidelity } from '../check-spec-fidelity.js'

// ─── 测试夹具 ─────────────────────────────────────────────

function validSpec() {
  return {
    version: '1.0',
    page: { name: 'TestPage' },
    components: [
      {
        name: 'StatCard',
        convertMode: 'component',
        props: [
          { name: 'title', type: 'string', required: true, example: 'Sales' },
          { name: 'value', type: 'number', required: true, example: 1000 },
        ],
        events: [{ name: 'viewDetail', trigger: 'click' }],
      },
    ],
  }
}

function validHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>TestPage</title>
<style>
.stat-card { display: flex; flex-direction: column; }
.stat-card__title { font-size: 13px; }
.stat-card__value { font-size: 24px; }
.stat-card__action-view-detail { padding: 8px 16px; }
</style>
</head>
<body>
<main data-page="TestPage">
  <article data-component="StatCard" data-convert="component" class="stat-card">
    <p class="stat-card__title" data-prop="title" data-type="string">Sales</p>
    <span class="stat-card__value" data-prop="value" data-type="number">1000</span>
    <button class="stat-card__action-view-detail" data-event="click" data-action="viewDetail">查看详情</button>
  </article>
</main>
</body>
</html>`
}

function validReactCodeFiles() {
  return [
    {
      path: 'StatCard.tsx',
      content: `import styles from './StatCard.module.css'

export interface StatCardProps {
  title: string
  value: number
}

export interface StatCardEvents {
  onViewDetail?: () => void
}

export function StatCard(props: StatCardProps & StatCardEvents) {
  const { title, value, onViewDetail } = props
  return null
}`,
    },
    {
      path: 'StatCard.module.css',
      content: `.stat-card {
  display: flex;
  flex-direction: column;
}
.stat-card__title {
  font-size: 13px;
}
.stat-card__value {
  font-size: 24px;
}
.stat-card__action-view-detail {
  padding: 8px 16px;
}`,
    },
  ]
}

function validVueCodeFiles() {
  return [
    {
      path: 'StatCard.vue',
      content: `<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: Number, required: true },
})
const emit = defineEmits(['viewDetail'])
</script>
<template>
  <div class="stat-card">
    <span class="stat-card__title">{{ title }}</span>
    <span class="stat-card__value">{{ value }}</span>
  </div>
</template>
<style>
.stat-card { display: flex; flex-direction: column; }
.stat-card__title { font-size: 13px; }
.stat-card__value { font-size: 24px; }
.stat-card__action-view-detail { padding: 8px 16px; }
</style>`,
    },
  ]
}

// ─── 测试用例 ─────────────────────────────────────────────

describe('check-spec-fidelity', () => {
  // ─── Spec ↔ HTML 校验 ──────────────────────────────────

  it('1. 不传 codeFiles 时只校验 Spec↔HTML（应通过）', () => {
    const report = checkSpecFidelity(validSpec(), validHtml())
    expect(report.summary.totalErrors).toBe(0)
    expect(report.summary.passed).toBe(true)
    expect(report.specVsCode.errors).toHaveLength(0)
    expect(report.specVsCode.warnings).toHaveLength(0)
  })

  it('2. Spec 有组件但 HTML 缺失 → HARD 错误', () => {
    const spec = validSpec()
    spec.components[0].name = 'OtherCard'
    const report = checkSpecFidelity(spec, validHtml())
    expect(report.specVsHtml.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'spec-component-missing-in-html',
      })
    )
  })

  it('3. HTML 有组件但 Spec 缺失 → HARD 错误', () => {
    const html = validHtml().replace(
      '<article data-component="StatCard"',
      '<article data-component="ExtraCard"'
    )
    const report = checkSpecFidelity(validSpec(), html)
    expect(report.specVsHtml.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'html-component-not-in-spec',
      })
    )
  })

  it('4. Spec 有 prop 但 HTML 缺失 → SHOULD 警告', () => {
    const html = validHtml().replace(
      'data-prop="value"',
      ''
    )
    const report = checkSpecFidelity(validSpec(), html)
    expect(report.specVsHtml.warnings).toContainEqual(
      expect.objectContaining({
        level: 'SHOULD',
        rule: 'spec-prop-missing-in-html',
      })
    )
  })

  it('5. HTML 有 prop 但 Spec 缺失 → HARD 错误', () => {
    const html = validHtml().replace(
      '</article>',
      '<span class="stat-card__extra" data-prop="extra" data-type="string">Extra</span>\n  </article>'
    )
    const report = checkSpecFidelity(validSpec(), html)
    expect(report.specVsHtml.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'html-prop-not-in-spec',
      })
    )
  })

  // ─── Spec ↔ 代码 校验（框架无关语义搜索） ──────────────

  it('6. Spec 有组件但代码文件缺失 → HARD 错误', () => {
    const codeFiles = [
      {
        path: 'Other.tsx',
        content: 'export function Other() { return null }',
      },
    ]
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    expect(report.specVsCode.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'code-file-missing',
      })
    )
  })

  it('7. React 代码缺少 required prop → HARD 错误', () => {
    const codeFiles = validReactCodeFiles()
    // 移除所有 value 标识符的出现
    codeFiles[0].content = codeFiles[0].content
      .replace('  value: number\n', '')
      .replace('const { title, value, onViewDetail } = props', 'const { title, onViewDetail } = props')
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    expect(report.specVsCode.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'code-missing-required-prop',
      })
    )
  })

  it('8. Vue 代码完全一致时通过', () => {
    const report = checkSpecFidelity(validSpec(), validHtml(), validVueCodeFiles())
    expect(report.summary.totalErrors).toBe(0)
    expect(report.summary.passed).toBe(true)
  })

  it('9. Vue 代码缺少 required prop → HARD 错误', () => {
    const codeFiles = validVueCodeFiles()
    codeFiles[0].content = codeFiles[0].content
      .replace('  value: { type: Number, required: true },\n', '')
      .replace('<span class="stat-card__value">{{ value }}</span>\n', '')
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    expect(report.specVsCode.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'code-missing-required-prop',
      })
    )
  })

  it('10. 代码缺少 event → HARD 错误', () => {
    const codeFiles = validReactCodeFiles()
    // 移除所有 viewDetail 和 onViewDetail 标识符
    codeFiles[0].content = codeFiles[0].content
      .replace('export interface StatCardEvents {\n  onViewDetail?: () => void\n}\n\n', '')
      .replace(', onViewDetail', '')
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    expect(report.specVsCode.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'code-missing-event',
      })
    )
  })

  it('11. React onEventName 形式的事件应被识别', () => {
    const codeFiles = validReactCodeFiles()
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    // onViewDetail 应被识别为 viewDetail 事件
    expect(report.specVsCode.errors).not.toContainEqual(
      expect.objectContaining({
        rule: 'code-missing-event',
      })
    )
  })

  // ─── HTML ↔ 代码 校验 ──────────────────────────────────

  it('12. HTML CSS 类在代码中缺失 → HARD 错误', () => {
    const codeFiles = validReactCodeFiles()
    codeFiles[1].content = codeFiles[1].content.replace(
      '.stat-card__value {\n  font-size: 24px;\n}\n',
      ''
    )
    const report = checkSpecFidelity(validSpec(), validHtml(), codeFiles)
    expect(report.htmlVsCode.errors).toContainEqual(
      expect.objectContaining({
        level: 'HARD',
        rule: 'html-class-missing-in-code',
      })
    )
  })
})
