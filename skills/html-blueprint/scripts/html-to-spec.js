#!/usr/bin/env node

/**
 * html-to-spec.js — 从 HTML 设计稿逆向生成 Design Spec JSON。
 *
 * 读取含 data-* 标注的 HTML，提取为 Spec JSON，便于迁移到 Spec-First 工作流。
 *
 * 用法：
 *   node scripts/html-to-spec.js <input.html> [--out <output.json>]
 *
 * 不指定 --out 时输出到 stdout，指定时写入文件。
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { parseHTML } from './lib/html-parser.js'

// ─── 工具函数 ───

/** 将文本转换为对应类型的示例值 */
function coerceExample(text, type) {
  if (text === null || text === undefined) return undefined
  const value = String(text).trim()
  if (value === '') return undefined
  switch (type) {
    case 'number': {
      const n = Number(value)
      return Number.isNaN(n) ? value : n
    }
    case 'boolean':
      return value === 'true' || value === '1'
    default:
      return value
  }
}

/** 从 HTML 注释中提取 @viewport 和 @theme 声明 */
function extractComments(html) {
  const result = { viewport: null, theme: null }
  const re = /<!--\s*([\s\S]*?)\s*-->/g
  let m
  while ((m = re.exec(html)) !== null) {
    const content = m[1]
    const vp = content.match(/@viewport\s+width:(\d+)\s+height:(\d+)/)
    if (vp) {
      result.viewport = { width: parseInt(vp[1], 10), height: parseInt(vp[2], 10) }
    }
    const theme = content.match(/@theme\s+(\S+)/)
    if (theme) {
      result.theme = theme[1]
    }
  }
  return result
}

// ─── 组件字段提取 ───

/** 提取 props: 从 data-prop 元素收集属性定义 */
function extractProps($el, componentName) {
  const props = []
  const seen = new Set()
  $el.find('[data-prop]').each((_, p) => {
    const $p = p
    // data-prop 归属于最近的 data-component 祖先
    const $owner = $p.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }
    const name = ($p.attr('data-prop') || '').trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    const type = ($p.attr('data-type') || 'string').trim()
    const example = coerceExample($p.text(), type)
    const prop = { name, type }
    if (example !== undefined) prop.example = example
    props.push(prop)
  })
  return props
}

/** 提取 events: 从 data-event 元素收集事件定义 */
function extractEvents($el, componentName) {
  const events = []
  const seen = new Set()
  $el.find('[data-event]').each((_, ev) => {
    const $ev = ev
    const $owner = $ev.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }
    const action = ($ev.attr('data-action') || '').trim()
    const trigger = ($ev.attr('data-event') || 'click').trim()
    if (!action || seen.has(action)) return
    seen.add(action)
    events.push({
      name: action,
      trigger,
      payload: '_todo: 需补充 payload 结构',
    })
  })
  return events
}

/** 提取 decorative 元素 */
function extractDecorative($el, componentName) {
  const decorative = []
  $el.find('[data-decorative]').each((_, d) => {
    const $d = d
    const $owner = $d.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }
    decorative.push({
      ariaHidden: $d.attr('aria-hidden') === 'true',
    })
  })
  return decorative
}

/** 提取 children slots */
function extractChildren($el, componentName) {
  const children = []
  const seen = new Set()
  $el.find('[data-slot]').each((_, s) => {
    const $s = s
    const $owner = $s.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }
    const slot = ($s.attr('data-slot') || 'default').trim()
    if (seen.has(slot)) return
    seen.add(slot)
    children.push({ slot })
  })
  return children
}

/** 提取表单 model 和字段 */
function extractForm($el) {
  let $form = null
  if ($el.is('form')) {
    $form = $el
  } else {
    $el.find('form').first().each((_, f) => {
      $form = f
    })
  }
  if (!$form || !$form.length) return null

  const model = ($form.attr('data-model') || '').trim()
  if (!model) return null

  const fields = []
  $form.find('input, select, textarea').each((_, ctrl) => {
    const $ctrl = ctrl
    const field = ($ctrl.attr('data-field') || '').trim()
    if (!field || $ctrl.attr('data-static') === 'true') return
    const inputType = $ctrl.attr('type')?.toLowerCase()
    if (['submit', 'reset', 'button', 'hidden'].includes(inputType)) return
    fields.push({
      field,
      type: ($ctrl.attr('data-type') || 'string').trim(),
      required: $ctrl.attr('data-required') === 'true',
    })
  })

  return { model, fields }
}

/** 构建单个组件的 spec 对象 */
function buildComponent($el) {
  const name = ($el.attr('data-component') || 'Chart').trim()
  const convertMode = ($el.attr('data-convert') || 'component').trim()

  const component = {
    name,
    convertMode,
  }

  // chart 配置
  const chartType = $el.attr('data-chart')?.trim()
  const chartLib = $el.attr('data-chart-lib')?.trim()
  if (chartType || chartLib) {
    const chart = {}
    if (chartType) chart.type = chartType
    if (chartLib) chart.lib = chartLib
    chart._todo = '需补充数据契约'
    component.chart = chart
  }

  // props
  const props = extractProps($el, name)
  if (props.length > 0) component.props = props

  // events
  const events = extractEvents($el, name)
  if (events.length > 0) component.events = events

  // decorative
  const decorative = extractDecorative($el, name)
  if (decorative.length > 0) {
    component.visual = { decorative }
  }

  // children slots
  const children = extractChildren($el, name)
  if (children.length > 0) component.children = children

  // form
  const form = extractForm($el)
  if (form) component.form = form

  // states / dataSource TODO 仅对 component 模式补充
  if (convertMode === 'component') {
    component.states = [
      { name: 'default' },
      { name: 'loading', _todo: '需补充骨架屏规格' },
      { name: 'error', _todo: '需补充错误态规格' },
    ]
    component.dataSource = { _todo: '需补充 API 契约' }
  }

  return component
}

// ─── 主函数 ───

/**
 * 从 HTML 内容逆向生成 Design Spec 对象。
 * @param {string} htmlContent - HTML 字符串
 * @returns {object} Design Spec 对象
 */
export function htmlToSpec(htmlContent) {
  const $ = parseHTML(htmlContent)

  // page
  const $page = $('[data-page]').first()
  const pageName = ($page.attr('data-page') || '').trim()
  const comments = extractComments(htmlContent)

  const page = { name: pageName }
  if (comments.viewport) page.viewport = comments.viewport
  if (comments.theme) page.theme = comments.theme

  // components: data-component 元素 + 有 data-chart 但无 data-component 的元素
  const components = []
  const seenElements = new Set()

  $('[data-component]').each((_, el) => {
    const node = el._raw()
    if (seenElements.has(node)) return
    seenElements.add(node)
    components.push(buildComponent(el))
  })

  $('[data-chart]').each((_, el) => {
    const node = el._raw()
    if (seenElements.has(node)) return
    seenElements.add(node)
    components.push(buildComponent(el))
  })

  return {
    version: '1.0',
    page,
    components,
  }
}

// ─── CLI ───

function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: node scripts/html-to-spec.js <input.html> [--out <output.json>]')
    process.exit(0)
  }

  let inputPath = null
  let outPath = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outPath = args[++i]
    } else if (!args[i].startsWith('--')) {
      inputPath = args[i]
    }
  }

  if (!inputPath) {
    console.error('Error: input.html path is required')
    process.exit(1)
  }

  let html
  try {
    html = readFileSync(resolve(inputPath), 'utf-8')
  } catch (e) {
    console.error(`Error: cannot read input file: ${inputPath}`)
    process.exit(1)
  }

  const spec = htmlToSpec(html)
  const json = JSON.stringify(spec, null, 2)

  if (outPath) {
    writeFileSync(resolve(outPath), json, 'utf-8')
    console.log(`Generated: ${outPath}`)
  } else {
    console.log(json)
  }
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMainModule) {
  main()
}
