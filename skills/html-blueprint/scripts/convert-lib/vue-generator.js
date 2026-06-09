/**
 * vue-generator.js — 从 ComponentNode IR 生成 Vue 3 SFC 代码字符串。
 *
 * 用法：
 *   import { generateVueSFC } from './convert-lib/vue-generator.js'
 *   const sfc = generateVueSFC(componentNode)
 */

/**
 * 从 ComponentNode 生成完整的 .vue SFC 字符串。
 * 注意：生成的是开发骨架，非生产就绪代码。
 * 开发者需要补充：API 调用、业务逻辑、错误处理、完整校验、路由等。
 */
export function generateVueSFC(node, allNodes = []) {
  const template = generateTemplate(node)
  const script = generateScript(node, allNodes)
  const style = generateStyle(node)

  return [
    `<!--`,
    `  由 html-blueprint 自动生成 — 开发骨架，非生产就绪代码。`,
    `  TODO: 补充 API 调用、业务逻辑、错误处理、完整校验、路由等。`,
    `-->`,
    `<template>`,
    indent(template),
    `</template>`,
    ``,
    `<script setup lang="ts">`,
    indent(script),
    `</script>`,
    style ? `` : '',
    style ? `<style scoped>` : '',
    style ? indent(style) : '',
    style ? `</style>` : '',
  ].filter(Boolean).join('\n')
}

/**
 * 生成 <template> 内容。
 */
function generateTemplate(node) {
  let html = node.template

  // 1. 替换 data-prop → {{ propName }} 或 :prop="propName"
  html = replaceDataProps(html, node)

  // 2. 替换 data-event → @event="handler"
  html = replaceDataEvents(html, node)

  // 3. 替换 data-slot → <slot name="...">
  html = replaceDataSlots(html, node)

  // 4. 替换 data-list → v-for
  html = replaceDataLists(html, node)

  // 5. 替换表单 → v-model
  html = replaceFormBindings(html, node)

  // 6. 替换子组件引用
  html = replaceChildComponents(html, node)

  // 7. 清理剩余的 data-* 属性（保留 aria-*）
  html = cleanDataAttrs(html, node)

  // 8. 处理 data-convert="manual" → 添加注释
  if (node.convertMode === 'manual') {
    html = `<!-- TODO: manual conversion required — ${node.issues.join('; ') || '需要人工处理'} -->\n${html}`
  }

  return html
}

/**
 * 替换 data-prop 文本为 Vue 模板表达式。
 */
function replaceDataProps(html, node) {
  // 匹配 <tag ... data-prop="xxx" ...>TEXT</tag>
  return html.replace(
    /(<(\w+)[^>]*\sdata-prop="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, openTag, tagName, propName, content, closeTag) => {
      // 静态文本保持不变
      if (openTag.includes('data-static="true"')) return match
      // 替换内容为 {{ propName }}
      return `${openTag}{{ ${propName} }}${closeTag}`
    }
  )
}

/**
 * 替换 data-event → @event="action"
 */
function replaceDataEvents(html, node) {
  return html.replace(
    /\sdata-event="([^"]+)"(\s+data-action="([^"]+)")?(\s+data-confirm="([^"]+)")?(\s+data-payload="([^"]+)")?/g,
    (_, event, _a, action, _c, confirm, _p, payload) => {
      const ev = event || 'click'
      const handler = action || 'handleEvent'
      const prefix = confirm === 'true' ? '@click.stop.prevent' : `@${ev}`
      const args = payload ? `('${payload}')` : ''
      return ` ${prefix}="${handler}${args}"`
    }
  )
}

/**
 * 替换 data-slot → <slot name="xxx">
 */
function replaceDataSlots(html, node) {
  return html.replace(
    /<(\w+)([^>]*\s)data-slot="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g,
    (_, tag, pre, slotName, post, content) => {
      const nameAttr = slotName === 'default' ? '' : ` name="${slotName}"`
      return `<slot${nameAttr}>${content.trim()}</slot>`
    }
  )
}

/**
 * 替换 data-list → v-for
 */
function replaceDataLists(html, node) {
  return html.replace(
    /(<(\w+)[^>]*\sdata-list="([^"]+)"\s+data-list-type="([^"]+)"[^>]*>)/g,
    (match, openTag, tagName, listName, listType) => {
      if (listType !== 'dynamic') return match

      // 在列表容器上添加 v-for 提示（实际的 v-for 在子组件上）
      // 找到列表项组件，替换为 v-for
      const updated = match.replace(
        new RegExp(`(<${tagName}[^>]*data-list="${listName}"[^>]*>)`, 'g'),
        `$1\n  <!-- iterate ${listName} -->`
      )
      return updated
    }
  )
}

/**
 * 替换列表内的子组件 → 添加 v-for
 */
function generateListVFor(listName, itemComponent) {
  return `<${itemComponent}\n  v-for="(item, index) in ${listName}"\n  :key="index"\n  v-bind="item"\n/>`
}

/**
 * 替换子组件标签引用。
 */
function replaceChildComponents(html, node) {
  let result = html

  for (const childName of node.children) {
    const kebabName = childName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')

    // 替换列表中的子组件：<li data-component="ProjectItem" ...>...</li>
    // → <ProjectItem v-for="item in projects" :key="item.id" v-bind="item" />
    // 找到包含 data-component="childName" 且祖先是 data-list 的元素
    const listContext = findListForChild(result, childName, node)
    if (listContext) {
      const childRegex = new RegExp(
        `<\\w+[^>]*\\sdata-component="${childName}"[^>]*>[\\s\\S]*?<\\/\\w+>`,
        'g'
      )
      result = result.replace(childRegex, () => {
        return generateListVFor(listContext.name, childName)
      })
    } else {
      // 非列表嵌套 → 替换为 <ChildName />
      const childRegex = new RegExp(
        `<\\w+[^>]*\\sdata-component="${childName}"[^>]*>[\\s\\S]*?<\\/\\w+>`,
        'g'
      )
      result = result.replace(childRegex, () => `<${childName} />`)
    }
  }

  return result
}

/**
 * 查找子组件所属的 data-list。
 */
function findListForChild(html, childName, node) {
  for (const list of node.lists) {
    if (list.itemComponent === childName) return list
    // 简单检查：在 html 中搜索 "data-list" + childName 相邻出现
  }
  return null
}

/**
 * 替换表单绑定：data-field → v-model。
 */
function replaceFormBindings(html, node) {
  if (!node.form) return html

  let result = html

  // 替换 input/select/textarea 的 data-field → v-model
  result = result.replace(
    /<(\w+)([^>]*)\sdata-field="([^"]+)"([^>]*)>/g,
    (_, tag, pre, fieldName, post) => {
      const modelExpr = `${node.form.model}.${fieldName}`
      // 移除 data-field, data-type, data-required 属性，添加 v-model
      let attrs = pre + post
      attrs = attrs.replace(/\sdata-field="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-type="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-required="[^"]*"/g, '')
      attrs = attrs.replace(/\sdata-static="[^"]*"/g, '')
      // 处理 self-closing /，避免生成 <input .../ required>
      attrs = attrs.replace(/\/$/, '').trim()
      if (node.form.fields.find(f => f.field === fieldName)?.required) {
        attrs += ' required'
      }
      return `<${tag}${attrs} v-model="${modelExpr}">`
    }
  )

  // 替换 form 上的 data-model, data-component
  result = result.replace(/\sdata-model="[^"]*"/g, '')
  result = result.replace(/\sdata-component="[^"]*"/g, '')
  result = result.replace(/\sdata-convert="[^"]*"/g, '')

  return result
}

/**
 * 清理 data-* 标注属性（保留 aria-* 和 data-testid 等）。
 */
function cleanDataAttrs(html, node) {
  const ATTRS_TO_REMOVE = [
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
  for (const attr of ATTRS_TO_REMOVE) {
    result = result.replace(new RegExp(`\\s${attr}="[^"]*"`, 'g'), '')
  }
  return result
}

/**
 * 生成 <script setup lang="ts"> 内容。
 */
function generateScript(node, allNodes) {
  const lines = []

  // Imports
  const imports = ['import { ref, reactive, computed } from \'vue\'']
  for (const childName of node.children) {
    imports.push(`import ${childName} from './${childName}.vue'`)
  }
  lines.push(...imports)
  if (imports.length > 0) lines.push('')

  // Props
  if (node.props.length > 0) {
    lines.push('interface Props {')
    for (const prop of node.props) {
      const tsType = mapTypeToTS(prop.type)
      const optional = prop.defaultValue ? '?' : ''
      lines.push(`  ${prop.name}${optional}: ${tsType}`)
    }
    lines.push('}')
    lines.push('')
    lines.push('const props = withDefaults(defineProps<Props>(), {')
    for (const prop of node.props) {
      if (prop.defaultValue) {
        const defaultValue = mapDefaultValue(prop.defaultValue, prop.type)
        lines.push(`  ${prop.name}: ${defaultValue},`)
      }
    }
    lines.push('})')
    lines.push('')
  }

  // Emits
  if (node.events.length > 0) {
    lines.push('const emit = defineEmits<{')
    for (const ev of node.events) {
      const payload = ev.payload ? `[payload: ${typeof ev.payload === 'string' ? 'string' : 'any'}]` : '[]'
      lines.push(`  (e: '${ev.name}'${ev.payload ? `, value: string` : ''}): void`)
    }
    lines.push('}>()')
    lines.push('')

    // Event handler functions
    for (const ev of node.events) {
      const handlerName = `handle${ev.name.charAt(0).toUpperCase() + ev.name.slice(1)}`
      lines.push(`function ${handlerName}() {`)
      if (ev.confirm) {
        lines.push(`  // TODO: add confirm dialog`)
      }
      lines.push(`  emit('${ev.name}'${ev.payload ? `, '${ev.payload}'` : ''})`)
      lines.push(`}`)
      lines.push('')
    }
  }

  // Form reactive state
  if (node.form) {
    lines.push(`const ${node.form.model} = reactive({`)
    for (const field of node.form.fields) {
      const defaultVal = mapTypeDefault(field.type)
      lines.push(`  ${field.field}: ${defaultVal},`)
    }
    lines.push('})')
    lines.push('')
  }

  // List data placeholder
  for (const list of node.lists) {
    if (list.type === 'dynamic') {
      lines.push(`const ${list.name} = ref<any[]>([])`)
      lines.push('')
    } else if (list.type === 'config') {
      lines.push(`const ${list.name} = ref([`)
      lines.push(`  // TODO: populate config from ${list.name} data`)
      lines.push('])')
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}

/**
 * 生成 <style scoped> 内容。
 */
function generateStyle(node) {
  if (!node.css) return ''
  return node.css.trim()
}

/**
 * 类型映射。
 */
function mapTypeToTS(type) {
  const MAP = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'Date',
    email: 'string',
    url: 'string',
    array: 'any[]',
    object: 'Record<string, any>',
  }
  return MAP[type] || 'string'
}

function mapDefaultValue(value, type) {
  if (type === 'number') {
    const num = parseFloat(value)
    return isNaN(num) ? `'${value}'` : `${num}`
  }
  if (type === 'boolean') {
    return value === 'true' ? 'true' : 'false'
  }
  return `'${value}'`
}

function mapTypeDefault(type) {
  const MAP = { string: "''", number: '0', boolean: 'false', date: 'new Date()' }
  return MAP[type] || "''"
}

function indent(str) {
  if (!str) return ''
  return str.split('\n').map(l => l ? `  ${l}` : l).join('\n')
}
