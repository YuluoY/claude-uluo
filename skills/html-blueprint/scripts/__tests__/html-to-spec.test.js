import { describe, it, expect } from 'vitest'
import { htmlToSpec } from '../html-to-spec.js'
import { validateSpec } from '../validate-spec.js'

const STAT_CARD_HTML = `<!-- @viewport width:1440 height:900 -->
<!-- @theme ../tokens.css -->
<main data-page="DashboardPage">
  <article data-component="StatCard" data-convert="component" class="stat-card">
    <div class="stat-card__decor" data-decorative="true" aria-hidden="true"></div>
    <p class="stat-card__title" data-prop="title" data-type="string">本月销售额</p>
    <span data-prop="value" data-type="number">128000</span>
    <button data-event="click" data-action="viewDetail">查看详情</button>
  </article>
  <div data-chart="bar" data-chart-lib="echarts" data-convert="manual"></div>
</main>`

const FORM_HTML = `<main data-page="UserFormPage">
  <form data-component="UserForm" data-convert="component" data-model="user" class="user-form">
    <input data-field="name" data-type="string" data-required="true" placeholder="姓名" />
    <input data-field="email" data-type="email" data-required="true" placeholder="邮箱" />
    <input data-field="age" data-type="number" placeholder="年龄" />
    <button type="submit" data-event="submit" data-action="save">保存</button>
  </form>
</main>`

describe('html-to-spec', () => {
  const spec = htmlToSpec(STAT_CARD_HTML)

  it('1. 提取 page.name 正确', () => {
    expect(spec.page.name).toBe('DashboardPage')
  })

  it('2. 提取 viewport 正确', () => {
    expect(spec.page.viewport).toEqual({ width: 1440, height: 900 })
  })

  it('3. 提取 theme 正确', () => {
    expect(spec.page.theme).toBe('../tokens.css')
  })

  it('4. 提取组件名和 convertMode 正确', () => {
    expect(spec.components).toHaveLength(2)
    const statCard = spec.components[0]
    expect(statCard.name).toBe('StatCard')
    expect(statCard.convertMode).toBe('component')
    const chart = spec.components[1]
    expect(chart.name).toBe('Chart')
    expect(chart.convertMode).toBe('manual')
  })

  it('5. 提取 props（name, type, example）正确', () => {
    const statCard = spec.components[0]
    expect(statCard.props).toHaveLength(2)
    expect(statCard.props[0]).toEqual({
      name: 'title',
      type: 'string',
      example: '本月销售额',
    })
    expect(statCard.props[1]).toEqual({
      name: 'value',
      type: 'number',
      example: 128000,
    })
  })

  it('6. 提取 events（name, trigger）正确', () => {
    const statCard = spec.components[0]
    expect(statCard.events).toHaveLength(1)
    expect(statCard.events[0].name).toBe('viewDetail')
    expect(statCard.events[0].trigger).toBe('click')
  })

  it('7. 提取 decorative 元素正确', () => {
    const statCard = spec.components[0]
    expect(statCard.visual).toBeDefined()
    expect(statCard.visual.decorative).toHaveLength(1)
    expect(statCard.visual.decorative[0].ariaHidden).toBe(true)
  })

  it('8. 缺失字段标记为 _todo', () => {
    const statCard = spec.components[0]
    // states TODO
    expect(statCard.states).toEqual([
      { name: 'default' },
      { name: 'loading', _todo: '需补充骨架屏规格' },
      { name: 'error', _todo: '需补充错误态规格' },
    ])
    // dataSource TODO
    expect(statCard.dataSource).toEqual({ _todo: '需补充 API 契约' })
    // event payload TODO
    expect(statCard.events[0].payload).toBe('_todo: 需补充 payload 结构')
  })

  it('9. 图表组件提取 chart 配置', () => {
    const chart = spec.components[1]
    expect(chart.chart).toEqual({
      type: 'bar',
      lib: 'echarts',
      _todo: '需补充数据契约',
    })
    // manual 模式不补充 states / dataSource
    expect(chart.states).toBeUndefined()
    expect(chart.dataSource).toBeUndefined()
  })

  it('10. 表单组件提取 model 和字段', () => {
    const formSpec = htmlToSpec(FORM_HTML)
    const form = formSpec.components[0]
    expect(form.name).toBe('UserForm')
    expect(form.form).toBeDefined()
    expect(form.form.model).toBe('user')
    expect(form.form.fields).toHaveLength(3)
    expect(form.form.fields[0]).toEqual({
      field: 'name',
      type: 'string',
      required: true,
    })
    expect(form.form.fields[1]).toEqual({
      field: 'email',
      type: 'email',
      required: true,
    })
    expect(form.form.fields[2]).toEqual({
      field: 'age',
      type: 'number',
      required: false,
    })
  })

  it('生成的 Spec 通过 validate-spec 校验', () => {
    const { errors } = validateSpec(spec)
    expect(errors).toEqual([])
  })
})
