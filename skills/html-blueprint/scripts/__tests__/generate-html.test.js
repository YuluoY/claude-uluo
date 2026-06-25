import { describe, it, expect } from 'vitest'
import { generateHTML } from '../generate-html.js'

const STAT_CARD_SPEC = {
  version: '1.0',
  page: {
    name: 'DashboardPage',
    viewport: { width: 1440, height: 900 },
    theme: '../tokens.css',
  },
  components: [
    {
      name: 'StatCard',
      convertMode: 'component',
      props: [
        { name: 'title', type: 'string', required: true, example: '本月销售额' },
        { name: 'value', type: 'number', required: true, example: 128000 },
      ],
      events: [
        { name: 'viewDetail', trigger: 'click' },
      ],
      visual: {
        layout: 'flex-column',
        padding: 'var(--space-6)',
        background: 'linear-gradient(135deg, #fff 0%, #f7faff 100%)',
        border: { radius: 'var(--radius-lg)' },
        decorative: [
          { name: 'glow', position: 'absolute', blur: '24px', color: 'rgba(59, 130, 246, 0.16)', ariaHidden: true },
        ],
      },
    },
  ],
}

describe('generate-html', () => {
  const html = generateHTML(STAT_CARD_SPEC)

  it('1. 生成基本 HTML 结构（DOCTYPE, html, head, body）', () => {
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toMatch(/<html[^>]*>/)
    expect(html).toContain('<head>')
    expect(html).toContain('</head>')
    expect(html).toContain('<body>')
    expect(html).toContain('</body>')
    expect(html).toContain('</html>')
  })

  it('2. data-page 属性正确', () => {
    expect(html).toContain('data-page="DashboardPage"')
    expect(html).toContain('<main')
  })

  it('3. 每个组件生成 data-component 和 data-convert', () => {
    expect(html).toContain('data-component="StatCard"')
    expect(html).toContain('data-convert="component"')
  })

  it('4. props 生成 data-prop 和 data-type', () => {
    expect(html).toContain('data-prop="title"')
    expect(html).toContain('data-type="string"')
    expect(html).toContain('data-prop="value"')
    expect(html).toContain('data-type="number"')
  })

  it('5. events 生成 data-event 和 data-action', () => {
    expect(html).toContain('data-event="click"')
    expect(html).toContain('data-action="viewDetail"')
  })

  it('6. decorative 元素有 aria-hidden="true"', () => {
    expect(html).toContain('data-decorative="true"')
    expect(html).toContain('aria-hidden="true"')
    // decorative 元素应同时具有 data-decorative 和 aria-hidden
    expect(html).toMatch(/data-decorative="true"[^>]*aria-hidden="true"/)
  })

  it('7. CSS 包含 BEM 类名', () => {
    expect(html).toContain('.stat-card')
    expect(html).toContain('.stat-card__title')
    expect(html).toContain('.stat-card__value')
    expect(html).toContain('.stat-card__decor-glow')
  })

  it('8. viewport meta 正确', () => {
    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain('@viewport width:1440 height:900')
  })
})
