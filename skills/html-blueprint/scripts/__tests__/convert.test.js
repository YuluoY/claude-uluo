import { describe, it, expect } from 'vitest'
import { parse } from '../convert-lib/parser.js'
import { generateVueSFC } from '../convert-lib/vue-generator.js'
import { generateReactComponent } from '../convert-lib/react-generator.js'
import { generateReport } from '../convert-lib/report.js'

const STAT_CARD_HTML = `<!-- @viewport width:1440 height:900 -->
<main data-page="TestPage">
  <article data-component="StatCard" data-convert="component" class="stat-card">
    <div class="stat-card__decor" data-decorative="true" aria-hidden="true"></div>
    <p class="stat-card__title" data-prop="title">销售额</p>
    <span class="stat-card__value" data-prop="value" data-type="number">128000</span>
    <span class="stat-card__unit" data-static="true">元</span>
    <button data-event="click" data-action="viewDetail">查看</button>
  </article>
</main>`

const FORM_HTML = `<form data-component="LoginForm" data-model="login" class="login-form">
  <input class="input" data-field="username" data-type="string" data-required="true" placeholder="用户名" />
  <input class="input" data-field="password" data-type="string" data-required="true" type="password" placeholder="密码" />
  <button data-event="submit" data-action="login">登录</button>
</form>`

const LIST_HTML = `<main data-page="ListPage">
  <ul data-component="ItemList" data-convert="component" data-list="items" data-list-type="dynamic">
    <li data-component="ListItem" data-convert="component">
      <span data-prop="name">项目名</span>
    </li>
  </ul>
</main>`

const CHART_HTML = `<main data-page="ChartPage">
  <div data-component="SalesChart" data-chart="bar" data-chart-lib="echarts" data-convert="manual">
    <div class="chart-preview">Chart Preview</div>
  </div>
</main>`

describe('parser', () => {
  it('extracts component with props', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    expect(card).toBeDefined()
    expect(card.convertMode).toBe('component')
    expect(card.props).toHaveLength(2)
    expect(card.props[0].name).toBe('title')
    expect(card.props[1].name).toBe('value')
    expect(card.props[1].type).toBe('number')
  })

  it('extracts events', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    expect(card.events).toHaveLength(1)
    expect(card.events[0].name).toBe('viewDetail')
    expect(card.events[0].trigger).toBe('click')
  })

  it('extracts form with fields', () => {
    const nodes = parse(FORM_HTML)
    const form = nodes.find(n => n.name === 'LoginForm')
    expect(form).toBeDefined()
    expect(form.form).toBeDefined()
    expect(form.form.model).toBe('login')
    expect(form.form.fields).toHaveLength(2)
    expect(form.form.fields[0].field).toBe('username')
    expect(form.form.fields[0].required).toBe(true)
  })

  it('extracts list metadata', () => {
    const nodes = parse(LIST_HTML)
    const list = nodes.find(n => n.name === 'ItemList')
    expect(list.lists).toHaveLength(1)
    expect(list.lists[0].name).toBe('items')
    expect(list.lists[0].type).toBe('dynamic')
    expect(list.lists[0].itemComponent).toBe('ListItem')
  })

  it('marks chart as manual with low confidence', () => {
    const nodes = parse(CHART_HTML)
    const chart = nodes.find(n => n.name === 'SalesChart')
    expect(chart.convertMode).toBe('manual')
    expect(chart.confidence).toBe(0.35)
    expect(chart.chart).toBe('bar')
    expect(chart.chartLib).toBe('echarts')
    expect(chart.issues).toContain('图表区域为 preview-only，无法从 DOM 推断真实数据结构')
  })

  it('skips layout components from file generation list', () => {
    const html = `<main><section data-component="MyLayout" data-convert="layout"><div data-component="InnerCard" data-convert="component"></div></section></main>`
    const nodes = parse(html)
    const layout = nodes.find(n => n.name === 'MyLayout')
    expect(layout).toBeDefined()
    expect(layout.convertMode).toBe('layout')
  })

  it('handles HTML without any components', () => {
    const nodes = parse('<div>plain html</div>')
    expect(nodes).toHaveLength(0)
  })
})

describe('vue-generator', () => {
  it('generates valid SFC structure', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const sfc = generateVueSFC(card, nodes)

    expect(sfc).toContain('<template>')
    expect(sfc).toContain('</template>')
    expect(sfc).toContain('<script setup lang="ts">')
    expect(sfc).toContain('</script>')
  })

  it('replaces data-prop with template expressions', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const sfc = generateVueSFC(card, nodes)

    expect(sfc).toContain('{{ title }}')
    expect(sfc).toContain('{{ value }}')
  })

  it('replaces data-event with @click handler', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const sfc = generateVueSFC(card, nodes)

    expect(sfc).toContain('@click="viewDetail"')
  })

  it('generates defineProps with defaults', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const sfc = generateVueSFC(card, nodes)

    expect(sfc).toContain('defineProps<Props>()')
    expect(sfc).toContain('withDefaults')
    expect(sfc).toContain("title: '销售额'")
    expect(sfc).toContain('value: 128000')
  })

  it('generates v-model for form fields', () => {
    const nodes = parse(FORM_HTML)
    const form = nodes.find(n => n.name === 'LoginForm')
    const sfc = generateVueSFC(form, nodes)

    expect(sfc).toContain('v-model="login.username"')
    expect(sfc).toContain('v-model="login.password"')
  })

  it('generates reactive() for form state', () => {
    const nodes = parse(FORM_HTML)
    const form = nodes.find(n => n.name === 'LoginForm')
    const sfc = generateVueSFC(form, nodes)

    expect(sfc).toContain('const login = reactive({')
    expect(sfc).toContain("username: ''")
    expect(sfc).toContain("password: ''")
  })

  it('generates defineEmits for events', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const sfc = generateVueSFC(card, nodes)

    expect(sfc).toContain('defineEmits<{')
    expect(sfc).toContain("(e: 'viewDetail')")
  })

  it('adds TODO comment for manual components', () => {
    const nodes = parse(CHART_HTML)
    const chart = nodes.find(n => n.name === 'SalesChart')
    const sfc = generateVueSFC(chart, nodes)

    expect(sfc).toContain('TODO: manual conversion')
  })
})

describe('react-generator', () => {
  it('generates valid TSX with props interface', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain('export interface StatCardProps')
    expect(tsx).toContain('title?: string')
    expect(tsx).toContain('value?: number')
  })

  it('maps class to className', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain('className="stat-card"')
    expect(tsx).not.toMatch(/\sclass="/)
  })

  it('replaces data-prop with JSX expressions', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain('{title}')
    expect(tsx).toContain('{value}')
  })

  it('replaces data-event with onClick handler', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain('onClick={handleViewDetail}')
    expect(tsx).toContain('onViewDetail?: () => void')
  })

  it('generates useCallback for event handlers', () => {
    const nodes = parse(STAT_CARD_HTML)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain('useCallback')
    expect(tsx).toContain('handleViewDetail')
  })

  it('generates useState for form data', () => {
    const nodes = parse(FORM_HTML)
    const form = nodes.find(n => n.name === 'LoginForm')
    const { tsx } = generateReactComponent(form, nodes)

    expect(tsx).toContain('useState')
    expect(tsx).toContain('formState')
  })

  it('generates CSS module import', () => {
    const html = `${STAT_CARD_HTML}<style>.stat-card { padding: 16px; }</style>`
    const nodes = parse(html)
    const card = nodes.find(n => n.name === 'StatCard')
    const { tsx } = generateReactComponent(card, nodes)

    expect(tsx).toContain("import styles from './StatCard.module.css'")
  })

  it('adds TODO comment for manual components', () => {
    const nodes = parse(CHART_HTML)
    const chart = nodes.find(n => n.name === 'SalesChart')
    const { tsx } = generateReactComponent(chart, nodes)

    expect(tsx).toContain('TODO: manual conversion')
  })
})

describe('report', () => {
  it('generates correct conversion report', () => {
    const nodes = parse(STAT_CARD_HTML)
    const report = generateReport(nodes, 'test.html')

    expect(report.source).toBe('test.html')
    expect(report.components).toHaveLength(1)
    expect(report.components[0].component).toBe('StatCard')
    expect(report.components[0].props).toContain('title')
    expect(report.components[0].events).toContain('viewDetail')
  })

  it('classifies manual components correctly', () => {
    const nodes = parse(CHART_HTML)
    const report = generateReport(nodes, 'test.html')

    expect(report.manualOnly).toBe(1)
    expect(report.autoConverted).toBe(0)
  })
})
