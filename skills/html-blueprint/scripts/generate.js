#!/usr/bin/env node

/**
 * generate.js — 从 Design Spec JSON 生成 HTML 设计稿。
 *
 * 功能：
 *   1. 读取 Spec JSON 文件
 *   2. 生成完整的 HTML 文件（DOCTYPE/head/body + 内联 CSS + data-* 标注）
 *   3. 支持 page/layout/block/component 四种输出类型
 *   4. 支持自动输出到 design/ 目录结构
 *   5. 输出到 stdout 或写入文件
 *
 * 用法：
 *   node scripts/generate.js <spec.json> [options]
 *
 * Options:
 *   --out <path>       Output file path (overrides auto-path)
 *   --name <name>      Page/component/block name for auto-path
 *   --type <type>      Output type: page (default), layout, block, component
 *   --design-dir <dir> Base design directory (default: design/)
 *   --stdout           Force output to stdout
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── 命名转换工具 ───

/** PascalCase → kebab-case（StatCard → stat-card） */
function pascalToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/** camelCase → kebab-case（viewDetail → view-detail） */
function camelToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

// ─── HTML 转义 ───

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── 事件名 → 中文标签 ───

const EVENT_LABELS = {
  submit: '提交',
  cancel: '取消',
  confirm: '确认',
  delete: '删除',
  remove: '移除',
  edit: '编辑',
  view: '查看',
  viewDetail: '查看详情',
  save: '保存',
  reset: '重置',
  search: '搜索',
  refresh: '刷新',
  export: '导出',
  import: '导入',
  download: '下载',
  upload: '上传',
  close: '关闭',
  back: '返回',
  next: '下一步',
  previous: '上一步',
  toggle: '切换',
  select: '选择',
  copy: '复制',
  share: '分享',
  login: '登录',
  logout: '退出登录',
  register: '注册',
  add: '添加',
  create: '创建',
  update: '更新',
}

function getEventLabel(name) {
  if (EVENT_LABELS[name]) return EVENT_LABELS[name]
  return name.replace(/([a-z])([A-Z])/g, '$1 $2')
}

// ─── CSS 生成 ───

const LAYOUT_MAP = {
  'flex-column': 'display: flex; flex-direction: column;',
  'flex-row': 'display: flex; flex-direction: row;',
  'grid': 'display: grid;',
  'absolute': 'position: relative;',
}

function generateBaseCSS(containerMaxWidth) {
  return [
    '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
    'body {',
    "  font-family: var(--font-family-base, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);",
    '  background: var(--color-bg-page, #f8fafc);',
    '  color: var(--color-text-primary, #1e293b);',
    '  line-height: 1.5;',
    '}',
    '.container {',
    `  max-width: ${containerMaxWidth || 'var(--container-max-width, 1320px)'};`,
    '  margin: 0 auto;',
    '  padding: 0 var(--space-6, 24px);',
    '  width: 100%;',
    '}',
    '.layout-slot {',
    '  padding: var(--space-8, 32px);',
    '  border: 2px dashed var(--color-border, #cbd5e1);',
    '  border-radius: var(--radius-md, 8px);',
    '  color: var(--color-text-secondary, #64748b);',
    '  text-align: center;',
    '  min-height: 80px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
  ].join('\n')
}

/** 根据 prop 类型生成默认 CSS 规则 */
function getPropCSSRules(type) {
  switch (type) {
    case 'string':
      return [
        'font-size: var(--font-size-sm, 13px);',
        'color: var(--color-text-secondary, #64748b);',
      ]
    case 'number':
      return [
        'font-size: var(--font-size-2xl, 24px);',
        'font-weight: 700;',
        'color: var(--color-text-primary, #1e293b);',
      ]
    case 'boolean':
      return [
        'display: inline-block;',
        'padding: var(--space-1, 4px) var(--space-2, 8px);',
        'font-size: var(--font-size-xs, 12px);',
        'border-radius: var(--radius-full, 999px);',
        'background: var(--color-success-bg, #ecfdf3);',
        'color: var(--color-success, #027a48);',
      ]
    case 'date':
      return [
        'font-size: var(--font-size-sm, 13px);',
        'color: var(--color-text-secondary, #64748b);',
      ]
    case 'email':
    case 'url':
      return [
        'font-size: var(--font-size-base, 14px);',
        'color: var(--color-primary, #3b82f6);',
        'text-decoration: none;',
      ]
    default:
      return [
        'font-size: var(--font-size-base, 14px);',
        'color: var(--color-text-primary, #1e293b);',
      ]
  }
}

function generateComponentCSS(component) {
  const blockName = pascalToKebab(component.name)
  const visual = component.visual || {}
  const lines = []

  // ── Block 样式 ──
  const blockRules = []
  if (visual.layout && LAYOUT_MAP[visual.layout]) {
    blockRules.push(LAYOUT_MAP[visual.layout])
  }
  if (visual.padding) blockRules.push(`padding: ${visual.padding};`)
  if (visual.gap) blockRules.push(`gap: ${visual.gap};`)
  if (visual.background) blockRules.push(`background: ${visual.background};`)
  if (visual.border) {
    if (visual.border.radius) blockRules.push(`border-radius: ${visual.border.radius};`)
    if (visual.border.width && visual.border.color) {
      blockRules.push(`border: ${visual.border.width} solid ${visual.border.color};`)
    }
  }
  if (visual.shadow) blockRules.push(`box-shadow: ${visual.shadow};`)
  if (visual.sizing) {
    if (visual.sizing.height) blockRules.push(`height: ${visual.sizing.height};`)
    if (visual.sizing.width) blockRules.push(`width: ${visual.sizing.width};`)
  }
  if (visual.decorative && visual.decorative.length > 0) {
    blockRules.push('position: relative;')
  }

  if (blockRules.length > 0) {
    lines.push(`.${blockName} {`)
    for (const rule of blockRules) lines.push(`  ${rule}`)
    lines.push('}')
  }

  // ── 装饰元素样式 ──
  if (visual.decorative) {
    for (const decor of visual.decorative) {
      const decorClass = `${blockName}__decor-${camelToKebab(decor.name)}`
      const decorRules = []
      if (decor.position) decorRules.push(`position: ${decor.position};`)
      if (decor.top !== undefined) decorRules.push(`top: ${decor.top};`)
      if (decor.right !== undefined) decorRules.push(`right: ${decor.right};`)
      if (decor.bottom !== undefined) decorRules.push(`bottom: ${decor.bottom};`)
      if (decor.left !== undefined) decorRules.push(`left: ${decor.left};`)
      if (decor.width) decorRules.push(`width: ${decor.width};`)
      if (decor.height) decorRules.push(`height: ${decor.height};`)
      if (decor.blur) decorRules.push(`filter: blur(${decor.blur});`)
      if (decor.color) decorRules.push(`background: ${decor.color};`)
      if (decor.radius) decorRules.push(`border-radius: ${decor.radius};`)

      if (decorRules.length > 0) {
        lines.push(`.${decorClass} {`)
        for (const rule of decorRules) lines.push(`  ${rule}`)
        lines.push('}')
      }
    }
  }

  // ── Prop 元素样式（基于类型） ──
  if (component.props) {
    for (const prop of component.props) {
      const propClass = `${blockName}__${camelToKebab(prop.name)}`
      const propRules = getPropCSSRules(prop.type)
      if (propRules.length > 0) {
        lines.push(`.${propClass} {`)
        for (const rule of propRules) lines.push(`  ${rule}`)
        lines.push('}')
      }
    }
  }

  // ── 事件按钮样式 ──
  if (component.events) {
    for (const event of component.events) {
      const eventClass = `${blockName}__action-${camelToKebab(event.name)}`
      lines.push(`.${eventClass} {`)
      lines.push('  padding: var(--space-2, 8px) var(--space-4, 16px);')
      lines.push('  border: none;')
      lines.push('  border-radius: var(--radius-md, 8px);')
      lines.push('  background: var(--color-primary, #3b82f6);')
      lines.push('  color: #ffffff;')
      lines.push('  font-size: var(--font-size-base, 14px);')
      lines.push('  cursor: pointer;')
      lines.push('}')
      lines.push(`.${eventClass}:hover {`)
      lines.push('  opacity: 0.9;')
      lines.push('}')
      lines.push(`.${eventClass}:focus-visible {`)
      lines.push('  outline: 2px solid var(--color-primary, #3b82f6);')
      lines.push('  outline-offset: 2px;')
      lines.push('}')
    }
  }

  return lines.join('\n')
}

function generateLayoutCSS(layout) {
  if (!layout) return ''
  const rules = []

  if (layout.type === 'grid') {
    rules.push('display: grid;')
    if (layout.columns) rules.push(`grid-template-columns: repeat(${layout.columns}, 1fr);`)
    if (layout.gap) rules.push(`gap: ${layout.gap};`)
  } else if (layout.type === 'flex') {
    rules.push('display: flex;')
    if (layout.gap) rules.push(`gap: ${layout.gap};`)
    if (layout.direction) rules.push(`flex-direction: ${layout.direction};`)
  }

  if (rules.length === 0) return ''

  const lines = ['.page-layout {']
  for (const rule of rules) lines.push(`  ${rule}`)
  lines.push('}')
  return lines.join('\n')
}

function generateCSS(spec, options = {}) {
  const containerMaxWidth = spec.page?.container?.maxWidth
  const parts = [generateBaseCSS(containerMaxWidth)]

  if (spec.layout) {
    const layoutCSS = generateLayoutCSS(spec.layout)
    if (layoutCSS) parts.push(layoutCSS)
  }

  for (const component of spec.components || []) {
    const css = generateComponentCSS(component)
    if (css) parts.push(css)
  }

  return parts.join('\n\n')
}

// ─── HTML 生成 ───

/** 根据 prop 类型选择语义化 HTML 标签 */
function getPropTag(type) {
  switch (type) {
    case 'string': return 'p'
    case 'number': return 'span'
    case 'boolean': return 'span'
    case 'date': return 'time'
    case 'email': return 'a'
    case 'url': return 'a'
    case 'object': return 'div'
    case 'array': return 'ul'
    default: return 'span'
  }
}

/** 获取 prop 的示例内容 */
function getPropContent(prop) {
  if (prop.example === undefined || prop.example === null) return ''
  if (prop.type === 'boolean') return prop.example ? '是' : '否'
  return escapeHTML(prop.example)
}

/** 选择组件根标签 */
function getComponentTag(component) {
  if (component.events && component.events.some(e => e.trigger === 'submit')) {
    return 'form'
  }
  if (component.convertMode === 'layout') return 'section'
  if (component.convertMode === 'decorative') return 'div'
  if (component.chart) return 'div'
  return 'article'
}

/** 从组件名推导表单 data-model 名称 */
function deriveDataModel(componentName) {
  let name = componentName
  if (name.endsWith('Form')) name = name.slice(0, -4)
  return name.charAt(0).toLowerCase() + name.slice(1)
}

function generatePropHTML(prop, blockName, isForm) {
  // 表单内的 object 类型 prop 展开为输入字段
  if (isForm && prop.type === 'object' && prop.properties) {
    const lines = []
    for (const [fieldName, fieldDef] of Object.entries(prop.properties)) {
      const fieldClass = `${blockName}__field-${camelToKebab(fieldName)}`
      const fieldType = fieldDef.type || 'string'
      lines.push(`    <input class="${fieldClass}" data-field="${escapeHTML(fieldName)}" data-type="${escapeHTML(fieldType)}" placeholder="${escapeHTML(fieldName)}" />`)
    }
    return lines.join('\n')
  }

  // 表单内的原始类型 prop 也展开为输入字段
  if (isForm && ['string', 'email', 'number', 'date', 'url', 'boolean'].includes(prop.type)) {
    const fieldClass = `${blockName}__field-${camelToKebab(prop.name)}`
    const inputType = prop.type === 'number' ? 'number' : (prop.type === 'email' ? 'email' : 'text')
    return `    <input class="${fieldClass}" data-field="${escapeHTML(prop.name)}" data-type="${escapeHTML(prop.type)}" placeholder="${escapeHTML(prop.name)}" type="${inputType}" />`
  }

  const tag = getPropTag(prop.type)
  const className = `${blockName}__${camelToKebab(prop.name)}`
  const attrs = [
    `data-prop="${escapeHTML(prop.name)}"`,
    `data-type="${escapeHTML(prop.type)}"`,
  ]
  if (prop.required) attrs.push('data-required="true"')
  const content = getPropContent(prop)

  // 链接类型特殊处理
  if (prop.type === 'email' && prop.example) {
    return `    <${tag} class="${className}" ${attrs.join(' ')} href="mailto:${escapeHTML(prop.example)}">${content}</${tag}>`
  }
  if (prop.type === 'url' && prop.example) {
    return `    <${tag} class="${className}" ${attrs.join(' ')} href="${escapeHTML(prop.example)}">${content}</${tag}>`
  }

  return `    <${tag} class="${className}" ${attrs.join(' ')}>${content}</${tag}>`
}

function generateEventHTML(event, blockName) {
  const label = getEventLabel(event.name)
  const className = `${blockName}__action-${camelToKebab(event.name)}`

  if (event.trigger === 'submit') {
    return `    <button type="submit" class="${className}" data-event="submit" data-action="${escapeHTML(event.name)}">${label}</button>`
  }

  return `    <button type="button" class="${className}" data-event="${escapeHTML(event.trigger)}" data-action="${escapeHTML(event.name)}">${label}</button>`
}

function generateDecorativeHTML(decor, blockName) {
  const className = `${blockName}__decor-${camelToKebab(decor.name)}`
  return `    <div class="${className}" data-decorative="true" aria-hidden="true"></div>`
}

function generateComponentHTML(component) {
  const blockName = pascalToKebab(component.name)
  const tag = getComponentTag(component)
  const isForm = tag === 'form'
  const lines = []

  // ── 组件根属性 ──
  const rootAttrs = [
    `data-component="${escapeHTML(component.name)}"`,
    `data-convert="${escapeHTML(component.convertMode)}"`,
    `class="${blockName}"`,
  ]

  if (isForm) {
    rootAttrs.push(`data-model="${escapeHTML(deriveDataModel(component.name))}"`)
  }

  if (component.chart) {
    if (component.chart.type) rootAttrs.push(`data-chart="${escapeHTML(component.chart.type)}"`)
    if (component.chart.lib) rootAttrs.push(`data-chart-lib="${escapeHTML(component.chart.lib)}"`)
  }

  lines.push(`  <${tag} ${rootAttrs.join(' ')}>`)

  // ── 装饰元素（放在最前面） ──
  if (component.visual && component.visual.decorative) {
    for (const decor of component.visual.decorative) {
      lines.push(generateDecorativeHTML(decor, blockName))
    }
  }

  // ── Props ──
  if (component.props) {
    for (const prop of component.props) {
      lines.push(generatePropHTML(prop, blockName, isForm))
    }
  }

  // ── Events ──
  if (component.events) {
    for (const event of component.events) {
      lines.push(generateEventHTML(event, blockName))
    }
  }

  // ── Children slots ──
  if (component.children) {
    for (const child of component.children) {
      const slotName = child.slot || camelToKebab(child.name)
      const slotClass = `${blockName}__slot-${camelToKebab(slotName)}`
      lines.push(`    <div class="${slotClass}" data-slot="${escapeHTML(slotName)}"></div>`)
    }
  }

  // ── Chart placeholder ──
  if (component.chart) {
    const previewClass = `${blockName}__chart-preview`
    lines.push(`    <div class="${previewClass}">图表预览区域 (${escapeHTML(component.chart.type || 'chart')})</div>`)
  }

  lines.push(`  </${tag}>`)

  return lines.join('\n')
}

const DEFAULT_LAYOUT_MAP = {
  landing: 'main-layout',
  dashboard: 'main-layout',
  detail: 'main-layout',
  list: 'main-layout',
  form: 'main-layout',
}

function inferDefaultLayout(pageType) {
  return DEFAULT_LAYOUT_MAP[pageType] || null
}

function generateHTML(spec, options = {}) {
  const type = options.type || 'page'
  const page = spec.page || {}
  const pageName = page.name || (spec.components && spec.components[0] && spec.components[0].name) || 'Document'
  const lang = page.lang || 'zh-CN'
  const viewport = page.viewport
  const theme = page.theme || '../tokens.css'

  let layoutRef = null
  if (type === 'page') {
    if (page.layoutRef) {
      if (page.layoutRef.includes('/') || page.layoutRef.endsWith('.html')) {
        layoutRef = page.layoutRef
      } else {
        layoutRef = `../layout/${page.layoutRef}.html`
      }
    } else {
      const defaultLayout = inferDefaultLayout(page.pageType)
      if (defaultLayout) {
        layoutRef = `../layout/${defaultLayout}.html`
      }
    }
  }

  const lines = []

  // ── Head ──
  lines.push('<!DOCTYPE html>')
  lines.push(`<html lang="${escapeHTML(lang)}">`)
  lines.push('<head>')
  lines.push('<meta charset="UTF-8">')
  lines.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">')

  if (viewport) {
    lines.push(`<!-- @viewport width:${viewport.width} height:${viewport.height} -->`)
  }

  lines.push(`<!-- @theme ${escapeHTML(theme)} -->`)

  if (layoutRef) {
    lines.push(`<!-- @layout ${escapeHTML(layoutRef)} -->`)
  }

  lines.push(`<title>${escapeHTML(pageName)}</title>`)
  lines.push(`<link rel="stylesheet" href="${escapeHTML(theme)}">`)

  lines.push('<style>')
  lines.push(generateCSS(spec, options))
  lines.push('</style>')
  lines.push('</head>')

  // ── Body ──
  lines.push('<body>')

  const useContainer = type === 'layout' || type === 'block'

  if (type === 'page') {
    lines.push(`<main data-page="${escapeHTML(pageName)}">`)
    if (spec.layout) {
      lines.push(`  <div class="page-layout" data-layout="${escapeHTML(spec.layout.type || 'flow')}">`)
    }
    for (const component of spec.components || []) {
      lines.push(generateComponentHTML(component))
    }
    if (spec.layout) {
      lines.push('  </div>')
    }
    lines.push('</main>')
  } else if (type === 'layout') {
    lines.push(`<div data-layout="${escapeHTML(pageName)}" class="layout-preview">`)
    if (useContainer) lines.push('  <div class="container">')
    for (const slot of spec.slots || [{ name: 'header' }, { name: 'main' }, { name: 'footer' }]) {
      const slotName = slot.name || 'slot'
      lines.push(`    <div data-slot="${escapeHTML(slotName)}" class="layout-slot layout-slot--${camelToKebab(slotName)}">[${escapeHTML(slotName)}]</div>`)
    }
    if (useContainer) lines.push('  </div>')
    lines.push('</div>')
  } else if (type === 'block') {
    lines.push(`<section data-block="${escapeHTML(pageName)}">`)
    if (useContainer) lines.push('  <div class="container">')
    for (const component of spec.components || []) {
      lines.push(generateComponentHTML(component))
    }
    if (useContainer) lines.push('  </div>')
    lines.push('</section>')
  } else if (type === 'component') {
    lines.push('<div class="component-preview" style="padding: var(--space-6, 24px);">')
    for (const component of spec.components || []) {
      lines.push(generateComponentHTML(component))
    }
    lines.push('</div>')
  }

  lines.push('</body>')
  lines.push('</html>')

  return lines.join('\n')
}

// ─── CLI ───

function computeAutoOutputPath(type, name, designDir) {
  const kebabName = pascalToKebab(name)
  const base = designDir || 'design'

  switch (type) {
    case 'layout': {
      const fileBase = kebabName.endsWith('-layout') ? kebabName : `${kebabName}-layout`
      return `${base}/layout/${fileBase}.html`
    }
    case 'block': {
      const isGroup = name.endsWith('Group') || kebabName.endsWith('-group')
      const suffix = isGroup ? '-group' : '-section'
      const alreadyHasSuffix = kebabName.endsWith('-section') || kebabName.endsWith('-group')
      const fileBase = alreadyHasSuffix ? kebabName : `${kebabName}${suffix}`
      return `${base}/blocks/${fileBase}.html`
    }
    case 'component':
      return `${base}/components/${kebabName}.html`
    case 'page':
    default:
      return `${base}/pages/${kebabName}.html`
  }
}

function printUsage() {
  console.log(`Usage: node scripts/generate.js <spec.json> [options]

Options:
  --out <path>       Output file path (overrides auto-path)
  --name <name>      Page/component/block name for auto-path
  --type <type>      Output type: page (default), layout, block, component
  --design-dir <dir> Base design directory (default: design/)
  --stdout           Force output to stdout`)
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage()
    process.exit(0)
  }

  let specPath = null
  let outPath = null
  let name = null
  let type = 'page'
  let designDir = null
  let forceStdout = false

  const validTypes = ['page', 'layout', 'block', 'component']

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--out' && args[i + 1]) {
      outPath = args[++i]
    } else if (arg === '--name' && args[i + 1]) {
      name = args[++i]
    } else if (arg === '--type' && args[i + 1]) {
      type = args[++i]
      if (!validTypes.includes(type)) {
        console.error(`错误: 无效的类型 "${type}"，有效类型: ${validTypes.join(', ')}`)
        process.exit(1)
      }
    } else if (arg === '--design-dir' && args[i + 1]) {
      designDir = args[++i]
    } else if (arg === '--stdout') {
      forceStdout = true
    } else if (!arg.startsWith('--')) {
      specPath = arg
    }
  }

  if (!specPath) {
    console.error('错误: 必须指定 spec.json 文件路径')
    process.exit(1)
  }

  let specContent
  try {
    specContent = readFileSync(resolve(specPath), 'utf-8')
  } catch (e) {
    console.error(`错误: 无法读取 spec 文件: ${specPath}`)
    process.exit(1)
  }

  let spec
  try {
    spec = JSON.parse(specContent)
  } catch (e) {
    console.error(`错误: JSON 解析失败: ${e.message}`)
    process.exit(1)
  }

  if (name) {
    if (!spec.page) spec.page = {}
    spec.page.name = name
  }

  const html = generateHTML(spec, { type })

  if (forceStdout || (!outPath && !name)) {
    console.log(html)
  } else {
    const targetPath = outPath || computeAutoOutputPath(type, name || (spec.page && spec.page.name) || 'output', designDir)
    const resolvedPath = resolve(targetPath)
    try {
      mkdirSync(dirname(resolvedPath), { recursive: true })
    } catch (e) {
      // Directory may already exist
    }
    writeFileSync(resolvedPath, html, 'utf-8')
    console.log(`已生成: ${targetPath}`)
  }
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMainModule) {
  main()
}

export { generateHTML, generateCSS, generateComponentHTML }
