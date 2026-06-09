/**
 * parser.js — 从带 data-* 标注的 HTML 中提取 ComponentNode IR 树。
 *
 * 用法：
 *   import { parse } from './convert-lib/parser.js'
 *   const nodes = parse(htmlString)
 */

import { parseHTML, cloneHTML, getInnerHTML } from '../lib/html-parser.js'

/**
 * 解析 HTML 字符串，返回组件节点列表。
 * @param {string} html — 原始 HTML 字符串
 * @returns {import('./ir.js').ComponentNode[]}
 */
export function parse(html) {
  const $ = parseHTML(html)
  const nodes = []

  // 1. 提取页面级 CSS tokens
  const globalCSS = extractGlobalCSS($, html)

  // 2. 找到页面入口
  const $page = $('[data-page]').first()
  const pageName = ($page.attr('data-page') || '').trim()

  // 3. 收集所有 data-component
  const componentEls = []
  $('[data-component]').each((_, el) => {
    componentEls.push(el)
  })

  // 4. 为每个组件构建 ComponentNode
  const nameSet = new Set()
  for (const $el of componentEls) {
    const name = ($el.attr('data-component') || '').trim()
    if (!name || nameSet.has(name)) continue
    nameSet.add(name)

    const node = buildComponentNode($, $el, name, globalCSS)
    node.pageName = pageName || undefined
    nodes.push(node)
  }

  // 5. 建立父子关系
  buildParentRelations(nodes, $, componentEls)

  // 6. 标记根组件 & 补充 data-convert=layout 的组件入树
  markRootAndLayouts(nodes, $, $page, pageName, componentEls)

  // 7. 计算置信度
  for (const node of nodes) {
    computeConfidence(node)
  }

  return nodes
}

/**
 * 从 HTML 提取全局 CSS tokens 和样式。
 */
function extractGlobalCSS($, html) {
  // 提取 :root 中的 CSS 变量
  const rootCSS = []
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleMatch) {
    for (const block of styleMatch) {
      // 如果 style 标签没有被 scoped 标记，视为全局
      if (!block.includes('scoped')) {
        rootCSS.push(block.replace(/<\/?style[^>]*>/gi, '').trim())
      }
    }
  }
  // 也提取内联 <style> 外的 CSS
  const rootBlock = html.match(/:root\s*\{([^}]+)\}/)
  if (rootBlock) {
    rootCSS.push(`:root {${rootBlock[1]}}`)
  }
  return rootCSS.join('\n\n')
}

/**
 * 为单个 data-component 元素构建 ComponentNode。
 */
function buildComponentNode($, $el, name, globalCSS) {
  /** @type {import('./ir.js').ComponentNode} */
  const node = {
    name,
    convertMode: normalizeConvertMode($el.attr('data-convert') || 'component'),
    props: extractProps($, $el, name),
    events: extractEvents($, $el, name),
    slots: extractSlots($, $el, name),
    lists: extractLists($, $el, name),
    form: extractForm($, $el, name),
    template: extractTemplate($, $el),
    css: extractComponentCSS($, $el, name, globalCSS),
    children: [],
    isRoot: false,
    confidence: 0,
    issues: [],
    responsive: extractResponsive($el),
    chart: $el.attr('data-chart')?.trim() || undefined,
    chartLib: $el.attr('data-chart-lib')?.trim() || undefined,
    states: $el.attr('data-states')?.split(',').map(s => s.trim()).filter(Boolean) || undefined,
  }

  // 收集嵌套子组件
  $el.find('[data-component]').each((_, child) => {
    const childName = (child.attr('data-component') || '').trim()
    if (childName && childName !== name && !node.children.includes(childName)) {
      node.children.push(childName)
    }
  })

  return node
}

/**
 * 提取 props: 从 data-prop 元素收集属性定义。
 */
function extractProps($, $el, componentName) {
  /** @type {import('./ir.js').PropDef[]} */
  const props = []
  const seen = new Set()

  // 在组件自身范围内查找 data-prop
  $el.find('[data-prop]').each((_, el) => {
    const $p = el

    // data-prop 归属于最近的 data-component 祖先
    const $owner = $p.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return // 属于嵌套子组件，跳过
    }

    const propName = ($p.attr('data-prop') || '').trim()
    if (!propName || seen.has(propName)) return
    seen.add(propName)

    const type = ($p.attr('data-type') || 'string').trim()
    const defaultValue = $p.text().trim() || undefined

    props.push({
      name: propName,
      type,
      required: type !== 'boolean' && !defaultValue ? true : false,
      defaultValue,
    })
  })

  return props
}

/**
 * 提取 events: 从 data-event 元素收集事件定义。
 */
function extractEvents($, $el, componentName) {
  /** @type {import('./ir.js').EventDef[]} */
  const events = []
  const seen = new Set()

  $el.find('[data-event]').each((_, el) => {
    const $ev = el

    const $owner = $ev.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }

    const action = ($ev.attr('data-action') || '').trim()
    const trigger = ($ev.attr('data-event') || 'click').trim()
    const key = `${trigger}:${action}`

    if (!action || seen.has(key)) return
    seen.add(key)

    events.push({
      name: action,
      trigger,
      payload: $ev.attr('data-payload')?.trim() || undefined,
      confirm: $ev.attr('data-confirm') === 'true',
    })
  })

  return events
}

/**
 * 提取 slots: 从 data-slot 元素收集插槽定义。
 */
function extractSlots($, $el, componentName) {
  /** @type {import('./ir.js').SlotDef[]} */
  const slots = []

  $el.find('[data-slot]').each((_, el) => {
    const $s = el

    const $owner = $s.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }

    const slotName = ($s.attr('data-slot') || 'default').trim()
    const content = cloneHTML($s)

    if (!slots.find(s => s.name === slotName)) {
      slots.push({ name: slotName, content })
    }
  })

  return slots
}

/**
 * 提取 lists: 从 data-list 元素收集列表定义。
 */
function extractLists($, $el, componentName) {
  /** @type {import('./ir.js').ListDef[]} */
  const lists = []

  // 组件自身可能是 list 容器（data-list 和 data-component 在同一元素上）
  if ($el.attr('data-list')) {
    const list = buildListDef($, $el)
    if (list) lists.push(list)
  }

  // 组件内部嵌套的 data-list 子元素
  $el.find('[data-list]').each((_, el) => {
    const $l = el

    const $owner = $l.closest('[data-component]')
    if ($owner.length && ($owner.attr('data-component') || '').trim() !== componentName) {
      return
    }

    const list = buildListDef($, $l)
    if (list) lists.push(list)
  })

  return lists
}

/**
 * 从单个元素构建 ListDef。
 */
function buildListDef($, $listEl) {
  const listName = ($listEl.attr('data-list') || '').trim()
  const listType = ($listEl.attr('data-list-type') || 'static').trim()
  if (!listName) return null

  let itemComponent
  $listEl.find('[data-component]').first().each((_, item) => {
    itemComponent = (item.attr('data-component') || '').trim()
  })

  return {
    name: listName,
    type: /** @type {'dynamic'|'static'|'config'} */ (listType),
    itemComponent: itemComponent || undefined,
  }
}

/**
 * 提取 form: 从 <form data-model> 收集表单定义。
 */
function extractForm($, $el, componentName) {
  const $form = $el.is('form') ? $el : $el.find('form').first()
  if (!$form.length) return null

  const model = ($form.attr('data-model') || '').trim()
  if (!model) return null

  /** @type {import('./ir.js').FormDef} */
  const form = { model, fields: [] }

  $form.find('input, select, textarea').each((_, ctrl) => {
    const $ctrl = ctrl
    const field = ($ctrl.attr('data-field') || '').trim()
    if (!field || $ctrl.attr('data-static') === 'true') return

    const type = $ctrl.attr('type')?.toLowerCase()
    if (['submit', 'reset', 'button', 'hidden'].includes(type)) return

    form.fields.push({
      field,
      type: ($ctrl.attr('data-type') || 'string').trim(),
      required: $ctrl.attr('data-required') === 'true',
    })
  })

  return form.fields.length > 0 ? form : null
}

/**
 * 提取组件的 HTML 模板片段（保留 data-* 标注用于后续生成）。
 */
function extractTemplate($, $el) {
  // 克隆元素，移除不需要的内容
  const clone = $el.clone()

  // 不移除 data-* 属性 — 生成阶段需要它们来替换为框架语法
  return cloneHTML(clone)
}

/**
 * 提取组件相关的 CSS 样式。
 */
function extractComponentCSS($, $el, componentName, globalCSS) {
  // 从 style 标签中提取 BEM 匹配的 CSS
  // 简单策略：匹配 .component-name 及 .component-name__* 相关规则
  const kebabName = componentName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
  const relevantRules = []

  // 从全局 CSS 中提取相关规则
  const cssBlocks = globalCSS.split('}')
  for (const block of cssBlocks) {
    if (block.includes(`.${kebabName}`)) {
      relevantRules.push(block.trim() + '}')
    }
  }

  return relevantRules.join('\n')
}

/**
 * 提取响应式声明。
 */
function extractResponsive($el) {
  const responsive = $el.attr('data-responsive')?.trim()
  const breakpoints = $el.attr('data-breakpoints')?.trim()
  if (!responsive && !breakpoints) return undefined

  const result = {}
  if (responsive) result.strategy = responsive
  if (breakpoints) {
    result.breakpoints = {}
    for (const bp of breakpoints.split(',')) {
      const [key, val] = bp.split(':').map(s => s.trim())
      if (key && val) result.breakpoints[key] = parseInt(val)
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * 规范化 convertMode 值。
 */
function normalizeConvertMode(value) {
  const VALID = new Set(['component', 'layout', 'static', 'decorative', 'manual'])
  const v = (value || 'component').trim().toLowerCase()
  return VALID.has(v) ? /** @type {import('./ir.js').ConvertMode} */ (v) : 'component'
}

/**
 * 建立组件父子关系。
 */
function buildParentRelations(nodes, $, componentEls) {
  for (const $el of componentEls) {
    const name = ($el.attr('data-component') || '').trim()
    const node = nodes.find(n => n.name === name)
    if (!node) continue

    // 找到父 data-component
    const $parent = $el.parent().closest('[data-component]')
    if ($parent.length) {
      const parentName = ($parent.attr('data-component') || '').trim()
      if (parentName && parentName !== name) {
        node.parent = parentName
      }
    }
  }
}

/**
 * 标记根组件（页面入口），同时将 layout 组件加入 children。
 */
function markRootAndLayouts(nodes, $, $page, pageName, componentEls) {
  for (const $el of componentEls) {
    const name = ($el.attr('data-component') || '').trim()
    const mode = normalizeConvertMode($el.attr('data-convert') || '')

    // 找到没有父组件的顶层组件 → 标记为根
    // layout 组件不单独生成文件，但其子组件需要被纳入
    if (mode === 'layout') {
      // 收集 layout 内的所有子组件
      $el.find('[data-component]').each((_, child) => {
        const childName = (child.attr('data-component') || '').trim()
        const childNode = nodes.find(n => n.name === childName)
        if (childNode) {
          childNode.parent = 'ROOT_PAGE'
        }
      })
    }
  }

  // 根组件：没有父组件的 component 模式节点
  for (const node of nodes) {
    if (node.convertMode === 'component' && !node.parent) {
      node.isRoot = true
    }
    // layout 不独立生成文件
    if (node.convertMode === 'layout') {
      node.isRoot = false
    }
  }
}

/**
 * 计算转换置信度。
 */
function computeConfidence(node) {
  let score = 0.95 // 默认最高 0.95——骨架完整但不等于生产就绪
  const issues = []

  // 图表 → 强制 manual
  if (node.chart || node.chartLib) {
    score = 0.35
    issues.push('图表区域为 preview-only，无法从 DOM 推断真实数据结构')
  }

  // 缺少 props/slots/lists → 可能为纯展示组件
  if (node.props.length === 0 && node.slots.length === 0 && node.lists.length === 0) {
    if (node.convertMode === 'component') {
      issues.push('组件无 props/slots/lists，可能为纯展示组件。需人工确认是否需要参数化')
      score -= 0.05
    }
  }

  // data-risk → 降低信心
  if (node.template.includes('data-risk=')) {
    score -= 0.1
    issues.push('包含 data-risk 标记的区域，需人工复核')
  }

  // manual → 低置信度正常
  if (node.convertMode === 'manual') {
    if (!node.chart) score = Math.min(score, 0.5)
    issues.push('标记为 manual，需人工转换')
  }

  // decorative → 不需要转换
  if (node.convertMode === 'decorative') {
    score = 1.0
  }

  // 过多 props → 提醒
  if (node.props.length > 10) {
    issues.push(`props 较多 (${node.props.length})，建议确认是否全部需要暴露`)
    score -= 0.05
  }

  // 始终提醒：生成的代码需要人工补充
  issues.push('生成骨架需补充：API 调用、业务逻辑、错误处理等')

  node.confidence = Math.max(0, Math.min(1, Math.round(score * 100) / 100))
  node.issues = issues
}
