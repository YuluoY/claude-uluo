#!/usr/bin/env node

/**
 * validate-spec.js — Design Spec 校验器
 *
 * 校验 Design Spec 文件的格式合法性，规则见 references/design-spec.md。
 *
 * 当前版本仅支持 JSON 格式输入，YAML 支持待后续版本。
 *
 * 用法：
 *   node scripts/validate-spec.js <spec-file>
 *
 * 输出：JSON 格式报告，包含 errors[] 和 warnings[]
 * 退出码：0（通过）、1（有 HARD 错误）
 */

import { readFileSync } from 'fs'
import { extname, resolve } from 'path'
import { fileURLToPath } from 'url'

const BASIC_TYPES = new Set([
  'string', 'number', 'boolean', 'date', 'email', 'url', 'array', 'object',
])

const VALID_CONVERT_MODES = new Set([
  'component', 'layout', 'static', 'decorative', 'manual',
])

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/
const CAMEL_CASE = /^[a-z][A-Za-z0-9]*$/

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isBlank(v) {
  return v === undefined || v === null || v === ''
}

/**
 * 校验 Design Spec 对象，返回 { errors, warnings }。
 * @param {object} spec
 * @returns {{ errors: Array, warnings: Array }}
 */
export function validateSpec(spec) {
  const errors = []
  const warnings = []

  const addError = (rule, message, path) => {
    errors.push({ level: 'HARD', rule, message, path })
  }
  const addWarning = (rule, message, path) => {
    warnings.push({ level: 'SHOULD', rule, message, path })
  }

  if (!isObject(spec)) {
    addError('spec-type', 'Spec 必须是对象', '')
    return { errors, warnings }
  }

  // HARD 1: version 必填且为 "1.0"
  if (isBlank(spec.version)) {
    addError('version-required', 'version 字段必填', 'version')
  } else if (spec.version !== '1.0') {
    addError('version-value', `version 必须为 "1.0"，当前为 ${JSON.stringify(spec.version)}`, 'version')
  }

  // HARD 2: page.name 必填，PascalCase
  const page = spec.page
  const pageName = isObject(page) ? page.name : undefined
  if (!isObject(page)) {
    addError('page-required', 'page 字段必填且为对象', 'page')
  } else if (isBlank(pageName) || typeof pageName !== 'string') {
    addError('page-name-required', 'page.name 必填', 'page.name')
  } else if (!PASCAL_CASE.test(pageName)) {
    addError('page-name-pascal', `page.name "${pageName}" 不是 PascalCase（首字母大写）`, 'page.name')
  }

  // components
  const components = spec.components
  if (!Array.isArray(components)) {
    addError('components-required', 'components 字段必填且为数组', 'components')
  } else {
    const seenNames = new Set()

    components.forEach((comp, index) => {
      const basePath = `components[${index}]`

      if (!isObject(comp)) {
        addError('component-type', '组件必须是对象', basePath)
        return
      }

      const name = comp.name
      const mode = comp.convertMode

      // HARD 4: name 必填，PascalCase
      if (isBlank(name) || typeof name !== 'string') {
        addError('component-name-required', '组件 name 必填', `${basePath}.name`)
      } else if (!PASCAL_CASE.test(name)) {
        addError('component-name-pascal', `组件 name "${name}" 不是 PascalCase（首字母大写）`, `${basePath}.name`)
      }

      // HARD 11: 组件名不得重复
      if (typeof name === 'string' && name) {
        if (seenNames.has(name)) {
          addError('component-name-duplicate', `组件名 "${name}" 重复`, `${basePath}.name`)
        } else {
          seenNames.add(name)
        }

        // HARD 3: page.name 不得与组件名重复
        if (typeof pageName === 'string' && pageName && name === pageName) {
          addError('page-name-conflict', `组件名 "${name}" 与 page.name 重复`, `${basePath}.name`)
        }
      }

      // HARD 4: convertMode 必填
      if (isBlank(mode)) {
        addError('convert-mode-required', `组件 "${name || basePath}" 缺少 convertMode`, `${basePath}.convertMode`)
      } else if (typeof mode !== 'string' || !VALID_CONVERT_MODES.has(mode)) {
        // HARD 5: convertMode 必须是合法值
        addError('convert-mode-invalid', `convertMode "${mode}" 无效，有效值: component, layout, static, decorative, manual`, `${basePath}.convertMode`)
      }

      // HARD 6/7/8: props 校验
      if (comp.props !== undefined) {
        if (!Array.isArray(comp.props)) {
          addError('props-type', 'props 必须是数组', `${basePath}.props`)
        } else {
          comp.props.forEach((prop, pIndex) => {
            const propPath = `${basePath}.props[${pIndex}]`
            if (!isObject(prop)) {
              addError('prop-type', 'prop 必须是对象', propPath)
              return
            }

            const propName = prop.name

            // HARD 6: name 必填，camelCase
            if (isBlank(propName) || typeof propName !== 'string') {
              addError('prop-name-required', 'prop name 必填', `${propPath}.name`)
            } else if (!CAMEL_CASE.test(propName)) {
              addError('prop-name-camel', `prop name "${propName}" 不是 camelCase（首字母小写）`, `${propPath}.name`)
            }

            // HARD 7: type 必填
            if (isBlank(prop.type)) {
              addError('prop-type-required', `prop "${propName || propPath}" 缺少 type`, `${propPath}.type`)
            } else if (typeof prop.type === 'string' && !BASIC_TYPES.has(prop.type)) {
              // HARD 8: 自定义类型必须有 typeRef
              if (isBlank(prop.typeRef)) {
                addError('prop-type-ref-required', `自定义类型 "${prop.type}" 必须提供 typeRef`, `${propPath}.typeRef`)
              }
            }

            // SHOULD 3: props 应提供 example
            if (prop.example === undefined) {
              addWarning('prop-example-missing', `prop "${propName || propPath}" 建议提供 example 值`, `${propPath}.example`)
            }
          })
        }
      }

      // HARD 9/10: events 校验
      if (comp.events !== undefined) {
        if (!Array.isArray(comp.events)) {
          addError('events-type', 'events 必须是数组', `${basePath}.events`)
        } else {
          comp.events.forEach((evt, eIndex) => {
            const evtPath = `${basePath}.events[${eIndex}]`
            if (!isObject(evt)) {
              addError('event-type', 'event 必须是对象', evtPath)
              return
            }

            const evtName = evt.name

            // HARD 9: name 必填，camelCase
            if (isBlank(evtName) || typeof evtName !== 'string') {
              addError('event-name-required', 'event name 必填', `${evtPath}.name`)
            } else if (!CAMEL_CASE.test(evtName)) {
              addError('event-name-camel', `event name "${evtName}" 不是 camelCase（首字母小写）`, `${evtPath}.name`)
            }

            // HARD 10: trigger 必填
            if (isBlank(evt.trigger)) {
              addError('event-trigger-required', `event "${evtName || evtPath}" 缺少 trigger`, `${evtPath}.trigger`)
            }
          })
        }
      }

      // HARD 12: decorative 模式组件的 visual.decorative[].ariaHidden 必须为 true
      if (mode === 'decorative') {
        const visual = comp.visual
        if (isObject(visual) && Array.isArray(visual.decorative)) {
          visual.decorative.forEach((dec, dIndex) => {
            const ariaPath = `${basePath}.visual.decorative[${dIndex}].ariaHidden`
            if (!isObject(dec) || dec.ariaHidden !== true) {
              addError('decorative-aria-hidden', `decorative 组件的 visual.decorative[${dIndex}].ariaHidden 必须为 true`, ariaPath)
            }
          })
        }
      }

      // SHOULD 1: component 模式应至少有一个 prop 或 event
      if (mode === 'component') {
        const hasProp = Array.isArray(comp.props) && comp.props.length > 0
        const hasEvent = Array.isArray(comp.events) && comp.events.length > 0
        if (!hasProp && !hasEvent) {
          addWarning('component-no-prop-event', `component 模式组件 "${name || basePath}" 应至少定义一个 prop 或 event`, basePath)
        }
      }

      // SHOULD 2: dataSource 存在时应定义 states.loading
      if (comp.dataSource !== undefined) {
        const states = comp.states
        const hasLoading = Array.isArray(states) && states.some(s => isObject(s) && s.name === 'loading')
        if (!hasLoading) {
          addWarning('data-source-no-loading', `组件 "${name || basePath}" 定义了 dataSource 但缺少 states.loading`, `${basePath}.states`)
        }
      }

      // SHOULD 4: visual 应定义 layout
      if (comp.visual !== undefined) {
        if (isObject(comp.visual) && isBlank(comp.visual.layout)) {
          addWarning('visual-no-layout', `组件 "${name || basePath}" 的 visual 建议定义 layout`, `${basePath}.visual.layout`)
        }
      }
    })
  }

  return { errors, warnings }
}

function main() {
  const file = process.argv[2]
  if (!file) {
    console.log('Usage: node scripts/validate-spec.js <spec-file>')
    console.log('')
    console.log('校验 Design Spec 文件的格式合法性（规则见 references/design-spec.md）。')
    console.log('当前版本仅支持 JSON 格式输入，YAML 支持待后续版本。')
    console.log('')
    console.log('输出：JSON 格式报告，包含 errors[] 和 warnings[]')
    console.log('退出码：0（通过）、1（有 HARD 错误）')
    process.exit(0)
  }

  const ext = extname(file).toLowerCase()
  if (ext === '.yaml' || ext === '.yml') {
    console.log(JSON.stringify({
      errors: [{
        level: 'HARD',
        rule: 'yaml-not-supported',
        message: '当前版本仅支持 JSON 格式输入，YAML 支持待后续版本',
        path: '',
      }],
      warnings: [],
    }, null, 2))
    process.exit(1)
  }

  let content
  try {
    content = readFileSync(file, 'utf-8')
  } catch (e) {
    console.log(JSON.stringify({
      errors: [{ level: 'HARD', rule: 'file-read', message: `无法读取文件: ${e.message}`, path: file }],
      warnings: [],
    }, null, 2))
    process.exit(1)
  }

  let spec
  try {
    spec = JSON.parse(content)
  } catch (e) {
    console.log(JSON.stringify({
      errors: [{ level: 'HARD', rule: 'json-parse', message: `JSON 解析失败: ${e.message}`, path: file }],
      warnings: [],
    }, null, 2))
    process.exit(1)
  }

  const { errors, warnings } = validateSpec(spec)
  console.log(JSON.stringify({ errors, warnings }, null, 2))
  process.exit(errors.length > 0 ? 1 : 0)
}

const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main()
}
