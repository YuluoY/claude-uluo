import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { tmpdir } from 'os'

import { generateHTML } from '../generate-html.js'
import { validateSpec } from '../validate-spec.js'
import { checkSpecFidelity } from '../check-spec-fidelity.js'
import { htmlToSpec } from '../html-to-spec.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPTS_DIR = resolve(__dirname, '..')

// ─── 测试用 Spec ─────────────────────────────────────────

const STAT_CARD_SPEC = {
  version: '1.0',
  page: {
    name: 'TestPage',
    viewport: { width: 1440, height: 900 },
  },
  components: [
    {
      name: 'StatCard',
      convertMode: 'component',
      props: [
        { name: 'title', type: 'string', required: true, example: '销售额' },
        { name: 'value', type: 'number', required: true, example: 1280 },
      ],
      events: [
        { name: 'viewDetail', trigger: 'click' },
      ],
      visual: {
        layout: 'flex-column',
        padding: 'var(--space-4)',
      },
    },
  ],
}

// ─── 辅助函数 ─────────────────────────────────────────────

function runValidateAll(htmlPath) {
  const result = spawnSync('node', [resolve(SCRIPTS_DIR, 'validate-all.js'), htmlPath], {
    encoding: 'utf-8',
    timeout: 30000,
  })
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  }
}

// ─── E2E 测试 ─────────────────────────────────────────────

describe('E2E: Spec-First Workflow', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = join(tmpdir(), `html-blueprint-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  // ─── 场景 1: Spec → HTML → 校验（无代码） ───────────────

  describe('场景 1: Spec → HTML → 校验全流程', () => {
    it('完整工作流应全部通过', () => {
      // 1. 校验 Spec
      const { errors: specErrors } = validateSpec(STAT_CARD_SPEC)
      expect(specErrors).toEqual([])

      // 2. 生成 HTML
      const html = generateHTML(STAT_CARD_SPEC)
      expect(html).toContain('data-component="StatCard"')
      expect(html).toContain('data-prop="title"')
      expect(html).toContain('data-prop="value"')

      const htmlPath = join(tmpDir, 'stat-card.html')
      writeFileSync(htmlPath, html, 'utf-8')

      // 3. 用 validate-all.js 校验 HTML（应通过）
      const validateResult = runValidateAll(htmlPath)
      expect(validateResult.status).toBe(0)

      // 4. 用 check-spec-fidelity.js 校验 Spec↔HTML 一致性（应通过）
      const report = checkSpecFidelity(STAT_CARD_SPEC, html)
      expect(report.summary.totalErrors).toBe(0)
      expect(report.summary.passed).toBe(true)
    })
  })

  // ─── 场景 2: Spec 变更 → 同步更新 → 校验 ───────────────

  describe('场景 2: Spec 变更 → 同步更新 → 校验', () => {
    it('新增 prop 后重新生成并校验应通过', () => {
      // 1. 用初始 Spec 生成 HTML
      const initialHtml = generateHTML(STAT_CARD_SPEC)
      const initialReport = checkSpecFidelity(STAT_CARD_SPEC, initialHtml)
      expect(initialReport.summary.totalErrors).toBe(0)

      // 2. 修改 Spec：新增一个 prop
      const updatedSpec = JSON.parse(JSON.stringify(STAT_CARD_SPEC))
      updatedSpec.components[0].props.push({
        name: 'trend',
        type: 'number',
        required: false,
        example: 12.5,
      })

      // 校验修改后的 Spec 仍合法
      const { errors: updatedSpecErrors } = validateSpec(updatedSpec)
      expect(updatedSpecErrors).toEqual([])

      // 3. 重新生成 HTML
      const updatedHtml = generateHTML(updatedSpec)

      // 验证新 prop 出现在 HTML 中
      expect(updatedHtml).toContain('data-prop="trend"')

      // 4. 校验 Spec↔HTML 一致性（应通过）
      const updatedReport = checkSpecFidelity(updatedSpec, updatedHtml)
      expect(updatedReport.summary.totalErrors).toBe(0)
      expect(updatedReport.summary.passed).toBe(true)
    })
  })

  // ─── 场景 3: HTML → Spec 逆向 → 补充 → 生成 → 校验 ─────

  describe('场景 3: HTML → Spec 逆向 → 补充 → 生成 → 校验', () => {
    it('逆向生成 Spec 并补充 _todo 后全流程应通过', () => {
      // 1. 先用原始 Spec 生成 HTML（作为逆向输入）
      const originalHtml = generateHTML(STAT_CARD_SPEC)
      const htmlPath = join(tmpDir, 'source.html')
      writeFileSync(htmlPath, originalHtml, 'utf-8')

      // 2. 用 html-to-spec.js 从 HTML 逆向生成 Spec
      const reversedSpec = htmlToSpec(originalHtml)

      // 验证逆向 Spec 基本结构正确
      expect(reversedSpec.version).toBe('1.0')
      expect(reversedSpec.page.name).toBe('TestPage')
      expect(reversedSpec.components).toHaveLength(1)
      expect(reversedSpec.components[0].name).toBe('StatCard')
      expect(reversedSpec.components[0].convertMode).toBe('component')

      // 3. 人工补充 _todo 字段（在测试中模拟）
      const component = reversedSpec.components[0]

      // 清理 events 的 payload _todo
      if (component.events) {
        for (const evt of component.events) {
          if (typeof evt.payload === 'string' && evt.payload.startsWith('_todo')) {
            delete evt.payload
          }
        }
      }

      // 清理 dataSource _todo
      if (component.dataSource && component.dataSource._todo) {
        delete component.dataSource
      }

      // 清理 states _todo
      if (component.states) {
        component.states = component.states
          .filter(s => s.name === 'default')
          .map(s => ({ name: s.name }))
      }

      // 补充 visual（逆向时未提取到 layout）
      if (!component.visual) {
        component.visual = { layout: 'flex-column', padding: 'var(--space-4)' }
      }

      // 校验补充后的 Spec 合法
      const { errors: filledSpecErrors } = validateSpec(reversedSpec)
      expect(filledSpecErrors).toEqual([])

      // 4. 用补充后的 Spec 生成 HTML
      const regeneratedHtml = generateHTML(reversedSpec)

      const regenHtmlPath = join(tmpDir, 'regenerated.html')
      writeFileSync(regenHtmlPath, regeneratedHtml, 'utf-8')

      // 5. 用 validate-all.js 校验重新生成的 HTML（应通过）
      const validateResult = runValidateAll(regenHtmlPath)
      expect(validateResult.status).toBe(0)

      // 6. 用 check-spec-fidelity.js 校验 Spec↔HTML 一致性（应通过）
      const report = checkSpecFidelity(reversedSpec, regeneratedHtml)
      expect(report.summary.totalErrors).toBe(0)
      expect(report.summary.passed).toBe(true)
    })
  })

  // ─── 场景 4: Spec ↔ 代码 框架无关校验 ──────────────────

  describe('场景 4: Spec ↔ 代码 框架无关语义搜索', () => {
    it('应支持校验任意框架代码（以 Vue 为例）', () => {
      // 1. 生成 HTML
      const html = generateHTML(STAT_CARD_SPEC)
      const htmlPath = join(tmpDir, 'stat-card.html')
      writeFileSync(htmlPath, html, 'utf-8')

      // 2. 模拟 AI 生成的 Vue 代码（不是由 html-blueprint 生成，而是 AI 参考 Spec 生成）
      //    包含 HTML 中所有 CSS 类，确保 HTML↔代码 校验通过
      const vueCode = `<script setup>
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
.stat-card {}
.stat-card__title {}
.stat-card__value {}
.stat-card__action-view-detail {}
</style>`
      writeFileSync(join(tmpDir, 'StatCard.vue'), vueCode, 'utf-8')

      // 3. 用 check-spec-fidelity.js 校验 Spec↔HTML↔代码 一致性
      const codeFiles = [{ path: 'StatCard.vue', content: vueCode }]
      const report = checkSpecFidelity(STAT_CARD_SPEC, html, codeFiles)
      expect(report.summary.totalErrors).toBe(0)
      expect(report.summary.passed).toBe(true)
    })

    it('应支持校验 React 代码', () => {
      // 1. 生成 HTML
      const html = generateHTML(STAT_CARD_SPEC)

      // 2. 模拟 AI 生成的 React 代码 + CSS 文件
      const reactCode = `interface StatCardProps {
  title: string;
  value: number;
}
interface StatCardEvents {
  onViewDetail?: () => void;
}
export function StatCard({ title, value, onViewDetail }: StatCardProps & StatCardEvents) {
  return <div className="stat-card">{title}{value}</div>
}`
      const cssCode = `.stat-card {}
.stat-card__title {}
.stat-card__value {}
.stat-card__action-view-detail {}`
      const codeFiles = [
        { path: 'StatCard.tsx', content: reactCode },
        { path: 'StatCard.module.css', content: cssCode },
      ]
      const report = checkSpecFidelity(STAT_CARD_SPEC, html, codeFiles)
      expect(report.summary.totalErrors).toBe(0)
      expect(report.summary.passed).toBe(true)
    })

    it('应检测到缺失的 required prop', () => {
      const html = generateHTML(STAT_CARD_SPEC)
      // 代码中缺少 value prop
      const vueCode = `<script setup>
defineProps({
  title: { type: String, required: true },
})
</script>
<style>
.stat-card {}
.stat-card__title {}
.stat-card__value {}
.stat-card__action-view-detail {}
</style>`
      const codeFiles = [{ path: 'StatCard.vue', content: vueCode }]
      const report = checkSpecFidelity(STAT_CARD_SPEC, html, codeFiles)
      expect(report.specVsCode.errors.some(e => e.rule === 'code-missing-required-prop')).toBe(true)
    })

    it('应检测到缺失的 event', () => {
      const html = generateHTML(STAT_CARD_SPEC)
      // 代码中缺少 viewDetail 事件
      const vueCode = `<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: Number, required: true },
})
</script>
<style>
.stat-card {}
.stat-card__title {}
.stat-card__value {}
.stat-card__action-view-detail {}
</style>`
      const codeFiles = [{ path: 'StatCard.vue', content: vueCode }]
      const report = checkSpecFidelity(STAT_CARD_SPEC, html, codeFiles)
      expect(report.specVsCode.errors.some(e => e.rule === 'code-missing-event')).toBe(true)
    })
  })
})
