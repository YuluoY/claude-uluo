/**
 * react-generator.js — 从 ComponentNode IR 生成 React TSX 代码字符串。
 *
 * 用法：
 *   import { generateReactTSX } from './convert-lib/react-generator.js'
 *   const tsx = generateReactTSX(componentNode)
 */

/**
 * 从 ComponentNode 生成 .tsx 文件内容。
 * @param {import('./ir.js').ComponentNode} node
 * @param {import('./ir.js').ComponentNode[]} allNodes — 所有组件节点
 * @returns {{ tsx: string, css: string }} — TSX 代码和 CSS Module 代码
 */
export function generateReactComponent(node, allNodes = []) {
  const jsx = generateJSX(node)
  const script = generateScript(node, allNodes)
  const css = generateCSSModule(node)

  const importReact = "import { useState, useCallback } from 'react'"
  const cssImport = node.css ? `import styles from './${node.name}.module.css'` : ''

  const tsx = [
    '/**',
    ' * 由 html-blueprint 自动生成 — 开发骨架，非生产就绪代码。',
    ' * TODO: 补充 API 调用、业务逻辑、错误处理、完整校验、路由等。',
    ' */',
    importReact,
    cssImport,
    ...generateChildImports(node, allNodes),
    '',
    script,
    '',
    `export function ${node.name}(props: ${node.name}Props) {`,
    indent(generateComponentBody(node)),
    `  return (`,
    indent(indent(jsx), 2),
    `  )`,
    `}`,
    '',
  ].filter(Boolean).join('\n')

  return { tsx, css }
}

/**
 * 生成 JSX 内容。
 */
function generateJSX(node) {
  let html = node.template

  // 1. HTML → JSX 属性映射
  html = htmlToJSXAttributes(html)

  // 2. 替换 data-prop → {propName}
  html = replaceDataProps(html, node)

  // 3. 替换 data-event → onClick={handler}
  html = replaceDataEvents(html, node)

  // 4. 替换 data-slot → {slotName}
  html = replaceDataSlots(html, node)

  // 5. 替换 data-list → .map()
  html = replaceDataLists(html, node)

  // 6. 替换表单 → value/onChange
  html = replaceFormBindings(html, node)

  // 7. 替换子组件引用
  html = replaceChildComponents(html, node)

  // 8. 清理 data-*
  html = cleanDataAttrs(html, node)

  // 9. manual → TODO
  if (node.convertMode === 'manual') {
    html = `{/* TODO: manual conversion — ${node.issues.join('; ') || '需要人工处理'} */}\n${html}`
  }

  return html
}

/**
 * HTML 属性 → JSX 属性映射。
 */
function htmlToJSXAttributes(html) {
  let result = html

  // class → className
  result = result.replace(/\sclass="/g, ' className="')

  // for → htmlFor
  result = result.replace(/\sfor="/g, ' htmlFor="')

  // style string → style object
  result = result.replace(/style="([^"]*)"/g, (_, styles) => {
    const obj = cssStringToObject(styles)
    return `style={${obj}}`
  })

  // tabindex → tabIndex
  result = result.replace(/\stabindex=/g, ' tabIndex=')

  // Self-closing void elements
  const voidElements = ['input', 'img', 'br', 'hr', 'area', 'base', 'col', 'embed', 'link', 'meta', 'param', 'source', 'track', 'wbr']
  for (const tag of voidElements) {
    const regex = new RegExp(`<${tag}([^>]*?)>\\s*</${tag}>`, 'gi')
    result = result.replace(regex, `<${tag}$1 />`)
  }

  // Boolean attributes (disabled, checked, readonly, required)
  for (const attr of ['disabled', 'checked', 'readonly', 'required', 'multiple', 'autofocus']) {
    result = result.replace(new RegExp(`\\s${attr}=""`, 'g'), ` ${attr}={true}`)
  }

  return result
}

/**
 * CSS 字符串 → JS 对象字符串。
 */
function cssStringToObject(cssStr) {
  if (!cssStr || !cssStr.trim()) return '{}'
  const pairs = cssStr.split(';').filter(Boolean).map(pair => {
    const [key, value] = pair.split(':').map(s => s.trim())
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const numValue = parseFloat(value)
    const jsValue = !isNaN(numValue) && value.endsWith('px') ? numValue : `'${value}'`
    return `${camelKey}: ${jsValue}`
  })
  return `{ ${pairs.join(', ')} }`
}

/**
 * 替换 data-prop 文本为 JSX 表达式。
 */
function replaceDataProps(html, node) {
  return html.replace(
    /(<(\w+)([^>]*)\sdata-prop="([^"]+)"([^>]*)>)([\s\S]*?)(<\/\2>)/g,
    (match, openTag, tagName, pre, propName, post, content, closeTag) => {
      if (openTag.includes('data-static="true"')) return match
      const newOpen = `<${tagName}${pre}${post}>`
      return `${newOpen}{${propName}}${closeTag}`
    }
  )
}

/**
 * 替换 data-event → JSX 事件处理器。
 */
function replaceDataEvents(html, node) {
  return html.replace(
    /\sdata-event="([^"]+)"(\s+data-action="([^"]+)")?(\s+data-confirm="([^"]+)")?(\s+data-payload="([^"]+)")?/g,
    (_, event, _a, action, _c, confirm, _p, payload) => {
      const handlerName = action ? `handle${action.charAt(0).toUpperCase() + action.slice(1)}` : 'handleEvent'
      const evName = `on${(event || 'click').charAt(0).toUpperCase() + (event || 'click').slice(1)}`
      return ` ${evName}={${handlerName}}`
    }
  )
}

/**
 * 替换 data-slot → {children} / 命名 slot。
 */
function replaceDataSlots(html, node) {
  return html.replace(
    /<(\w+)([^>]*)\sdata-slot="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g,
    (_, tag, pre, slotName, post, content) => {
      if (slotName === 'default') return `{children}`
      return `{${slotName}}`
    }
  )
}

/**
 * 替换 data-list → .map()。
 */
function replaceDataLists(html, node) {
  let result = html

  for (const list of node.lists) {
    if (list.type !== 'dynamic' || !list.itemComponent) continue

    // 替换列表容器 → .map()
    const listRegex = new RegExp(
      `<(\\w+)([^>]*\\sdata-list="${list.name}"[^>]*)>[\\s\\S]*?<\\/\\1>`,
      'g'
    )
    result = result.replace(listRegex, (match) => {
      // 提取列表项组件引用
      return `{${list.name}.map((item, index) => (\n  <${list.itemComponent} key={index} {...item} />\n))}`
    })
  }

  return result
}

/**
 * 替换子组件标签引用。
 */
function replaceChildComponents(html, node) {
  let result = html

  for (const childName of node.children) {
    // 跳过已经在 list.map() 中处理的子组件
    const isInList = node.lists.some(l => l.itemComponent === childName)
    if (isInList) continue

    const childRegex = new RegExp(
      `<\\w+[^>]*\\sdata-component="${childName}"[^>]*>[\\s\\S]*?<\\/\\w+>`,
      'g'
    )
    result = result.replace(childRegex, () => `<${childName} />`)
  }

  return result
}

/**
 * 替换表单绑定 → value/onChange。
 */
function replaceFormBindings(html, node) {
  if (!node.form) return html

  let result = html

  result = result.replace(
    /<(\w+)([^>]*)\sdata-field="([^"]+)"([^>]*)>/g,
    (_, tag, pre, fieldName, post) => {
      let attrs = pre + post
      attrs = attrs.replace(/\sdata-field="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-type="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-required="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-static="[^"]*"/g, '')

      const field = node.form.fields.find(f => f.field === fieldName)
      if (field?.required) attrs += ' required'

      attrs += ` value={formState.${fieldName}}`
      attrs += ` onChange={(e) => setFormState(prev => ({ ...prev, ${fieldName}: e.target.value }))}`

      return `<${tag}${attrs}>`
    }
  )

  result = result.replace(/\sdata-model="[^"]*"/g, '')
  result = result.replace(/\sdata-component="[^"]*"/g, '')
  result = result.replace(/\sdata-convert="[^"]*"/g, '')

  return result
}

/**
 * 清理 data-* 属性。
 */
function cleanDataAttrs(html, node) {
  const ATTRS = [
    'data-component', 'data-convert', 'data-prop', 'data-event',
    'data-action', 'data-payload', 'data-confirm', 'data-slot',
    'data-list', 'data-list-type', 'data-field', 'data-model',
    'data-type', 'data-required', 'data-static', 'data-decorative',
    'data-risk', 'data-manual', 'data-responsive', 'data-breakpoints',
    'data-chart', 'data-chart-lib', 'data-states', 'data-state',
    'data-ui-lib', 'data-ui-name', 'data-role', 'data-variant',
    'data-prop-owner', 'data-i18n',
  ]
  let result = html
  for (const attr of ATTRS) {
    result = result.replace(new RegExp(`\\s${attr}="[^"]*"`, 'g'), '')
  }
  return result
}

/**
 * 生成组件脚本部分（props 接口 + hooks + handlers）。
 */
function generateScript(node, allNodes) {
  const lines = []

  // Props interface
  const hasProps = node.props.length > 0
  const hasEvents = node.events.length > 0
  const hasSlots = node.slots.length > 0
  const hasForm = !!node.form

  if (hasProps || hasEvents || hasSlots) {
    lines.push(`export interface ${node.name}Props {`)
    for (const prop of node.props) {
      const tsType = mapTypeToTS(prop.type)
      const optional = prop.defaultValue ? '?' : ''
      lines.push(`  ${prop.name}${optional}: ${tsType}`)
    }
    for (const ev of node.events) {
      const payloadType = ev.payload ? 'string' : 'void'
      lines.push(`  on${ev.name.charAt(0).toUpperCase() + ev.name.slice(1)}?: (${ev.payload ? `payload: ${payloadType}` : ''}) => void`)
    }
    for (const slot of node.slots) {
      const slotKey = slot.name === 'default' ? 'children' : slot.name
      lines.push(`  ${slotKey}?: React.ReactNode`)
    }
    lines.push('}')
    lines.push('')
  } else {
    lines.push(`export interface ${node.name}Props {}`)
    lines.push('')
  }

  return lines.join('\n').trim()
}

/**
 * 生成组件 body（hooks + handlers）。
 */
function generateComponentBody(node) {
  const lines = []

  // 解构 props
  const destructured = []
  for (const prop of node.props) {
    const defaultVal = prop.defaultValue ? mapDefaultValue(prop.defaultValue, prop.type) : undefined
    destructured.push(defaultVal ? `${prop.name} = ${defaultVal}` : prop.name)
  }
  for (const ev of node.events) {
    destructured.push(`on${ev.name.charAt(0).toUpperCase() + ev.name.slice(1)}`)
  }
  for (const slot of node.slots) {
    const key = slot.name === 'default' ? 'children' : slot.name
    destructured.push(key)
  }

  if (destructured.length > 0) {
    lines.push(`const { ${destructured.join(', ')} } = props`)
  }

  // Form state
  if (node.form) {
    lines.push(`const [formState, setFormState] = useState({`)
    for (const field of node.form.fields) {
      lines.push(`  ${field.field}: ${mapTypeDefault(field.type)},`)
    }
    lines.push('})')
  }

  // List state placeholders
  for (const list of node.lists) {
    if (list.type === 'dynamic') {
      lines.push(`const [${list.name}, set${list.name.charAt(0).toUpperCase() + list.name.slice(1)}] = useState<any[]>([])`)
    } else if (list.type === 'config') {
      lines.push(`const ${list.name} = [`)
      lines.push(`  // TODO: populate from config`)
      lines.push(']')
    }
  }

  // Event handlers
  for (const ev of node.events) {
    const handlerName = `handle${ev.name.charAt(0).toUpperCase() + ev.name.slice(1)}`
    lines.push('')
    lines.push(`const ${handlerName} = useCallback(() => {`)
    if (ev.confirm) {
      lines.push(`  // TODO: add confirm dialog before calling handler`)
    }
    const onName = `on${ev.name.charAt(0).toUpperCase() + ev.name.slice(1)}`
    lines.push(`  ${onName}?.(${ev.payload ? `'${ev.payload}'` : ''})`)
    lines.push(`}, [${ev.payload ? '' : ''}])`)
  }

  return lines.join('\n')
}

/**
 * 生成子组件 import 语句。
 */
function generateChildImports(node, allNodes) {
  const imports = []
  for (const childName of node.children) {
    imports.push(`import { ${childName} } from './${childName}'`)
  }
  return imports
}

/**
 * 生成 CSS Module 内容。
 */
function generateCSSModule(node) {
  if (!node.css) return ''
  return node.css.trim()
}

/**
 * 工具函数。
 */
function mapTypeToTS(type) {
  const MAP = {
    string: 'string', number: 'number', boolean: 'boolean',
    date: 'Date', email: 'string', url: 'string',
    array: 'any[]', object: 'Record<string, any>',
  }
  return MAP[type] || 'string'
}

function mapDefaultValue(value, type) {
  if (type === 'number') {
    const num = parseFloat(value)
    return isNaN(num) ? `'${value}'` : `${num}`
  }
  if (type === 'boolean') return value === 'true' ? 'true' : 'false'
  return `'${value}'`
}

function mapTypeDefault(type) {
  const MAP = { string: "''", number: '0', boolean: 'false', date: 'new Date()' }
  return MAP[type] || "''"
}

function indent(str, depth = 1) {
  if (!str) return ''
  const pad = '  '.repeat(depth)
  return str.split('\n').map(l => l ? `${pad}${l}` : l).join('\n')
}
