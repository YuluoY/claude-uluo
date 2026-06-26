#!/usr/bin/env node

/**
 * spec-fidelity.js — Spec ↔ HTML ↔ 代码 一致性校验（框架无关）。
 *
 * Design Spec 是单一真相源，HTML 和代码都从 Spec 生成。本脚本校验三者一致性：
 *   - Spec ↔ HTML:  HTML 中的 data-component/data-prop/data-event 与 Spec 一致
 *   - Spec ↔ 代码:  代码中是否存在 Spec 定义的 prop/event 名称（语义搜索，不依赖框架语法）
 *   - HTML ↔ 代码:  代码中的 CSS 类与 HTML 中的 CSS 类一致
 *
 * 框架无关策略：不解析 Vue/React/Angular/Svelte 的特定语法，只搜索标识符存在性。
 *
 * 用法：
 *   node scripts/checks/spec-fidelity.js <spec.json> <html-file-or-dir> [code-dir]
 *
 * 输出：JSON 报告
 * 退出码：0（通过）、1（有 HARD 错误）
 */

import { readFileSync, statSync, existsSync } from 'fs'
import { resolve, basename } from 'path'
import { fileURLToPath } from 'url'
import { parseHTML } from '../_shared/html-parser.js'
import { collectFiles } from '../_shared/collect-files.js'

// ─── 主校验入口 ──────────────────────────────────────────

/**
 * 校验 Spec ↔ HTML ↔ 代码 一致性。
 * @param {object} spec - Design Spec 对象
 * @param {string|string[]} htmlInput - HTML 内容（字符串或字符串数组）
 * @param {Array<{path: string, content: string}>} [codeFiles=[]] - 代码文件列表（可选）
 * @returns {object} 校验报告
 */
export function checkSpecFidelity(spec, htmlInput, codeFiles = []) {
  const htmlContents = Array.isArray(htmlInput) ? htmlInput : [htmlInput]

  const specVsHtml = checkSpecVsHtml(spec, htmlContents)
  const specVsCode = codeFiles.length > 0
    ? checkSpecVsCode(spec, codeFiles)
    : { errors: [], warnings: [] }
  const htmlVsCode = codeFiles.length > 0
    ? checkHtmlVsCode(htmlContents, codeFiles)
    : { errors: [], warnings: [] }

  const totalErrors =
    specVsHtml.errors.length + specVsCode.errors.length + htmlVsCode.errors.length
  const totalWarnings =
    specVsHtml.warnings.length + specVsCode.warnings.length + htmlVsCode.warnings.length

  return {
    specVsHtml,
    specVsCode,
    htmlVsCode,
    summary: {
      totalErrors,
      totalWarnings,
      passed: totalErrors === 0,
    },
  }
}

// ─── Spec ↔ HTML 校验 ────────────────────────────────────

function checkSpecVsHtml(spec, htmlContents) {
  const errors = []
  const warnings = []

  // 解析所有 HTML 文件，收集 data-* 属性
  const htmlComponents = [] // { name, convert, htmlIndex }
  const htmlProps = []      // { name, componentName, htmlIndex }
  const htmlActions = []    // { name, componentName, htmlIndex }

  for (let i = 0; i < htmlContents.length; i++) {
    const $ = parseHTML(htmlContents[i])

    $('[data-component]').each((_, el) => {
      htmlComponents.push({
        name: el.attr('data-component'),
        convert: el.attr('data-convert'),
        htmlIndex: i,
      })
    })

    $('[data-prop]').each((_, el) => {
      const compEl = el.closest('[data-component]')
      htmlProps.push({
        name: el.attr('data-prop'),
        componentName: compEl.attr('data-component'),
        htmlIndex: i,
      })
    })

    $('[data-action]').each((_, el) => {
      const compEl = el.closest('[data-component]')
      htmlActions.push({
        name: el.attr('data-action'),
        componentName: compEl.attr('data-component'),
        htmlIndex: i,
      })
    })
  }

  const specComponents = spec.components || []
  const htmlComponentNames = new Set(htmlComponents.map(c => c.name))
  const specComponentNames = new Set(specComponents.map(c => c.name))

  // Rule 1: Spec 中每个 component 必须在 HTML 中有对应的 data-component
  for (const comp of specComponents) {
    if (!htmlComponentNames.has(comp.name)) {
      errors.push({
        level: 'HARD',
        rule: 'spec-component-missing-in-html',
        message: `Spec 组件 "${comp.name}" 在 HTML 中未找到 data-component="${comp.name}"`,
        path: `components.${comp.name}`,
      })
    }
  }

  // Rule 2: HTML 中每个 data-component 必须在 Spec 中有定义
  for (const htmlComp of htmlComponents) {
    if (!specComponentNames.has(htmlComp.name)) {
      errors.push({
        level: 'HARD',
        rule: 'html-component-not-in-spec',
        message: `HTML 中的 data-component="${htmlComp.name}" 在 Spec 中未定义`,
        path: `html[${htmlComp.htmlIndex}]`,
      })
    }
  }

  // Rule 3: Spec 中每个 prop 必须在 HTML 中有对应的 data-prop（SHOULD 警告）
  for (const comp of specComponents) {
    if (!htmlComponentNames.has(comp.name)) continue
    for (const prop of comp.props || []) {
      const found = htmlProps.some(
        p => p.componentName === comp.name && p.name === prop.name
      )
      if (!found) {
        warnings.push({
          level: 'SHOULD',
          rule: 'spec-prop-missing-in-html',
          message: `Spec 组件 "${comp.name}" 的 prop "${prop.name}" 在 HTML 中未找到 data-prop="${prop.name}"`,
          path: `components.${comp.name}.props.${prop.name}`,
        })
      }
    }
  }

  // Rule 4: HTML 中每个 data-prop 必须在 Spec 中有定义
  for (const htmlProp of htmlProps) {
    const specComp = specComponents.find(c => c.name === htmlProp.componentName)
    if (!specComp) continue // 组件缺失已报错
    const specPropNames = (specComp.props || []).map(p => p.name)
    if (!specPropNames.includes(htmlProp.name)) {
      errors.push({
        level: 'HARD',
        rule: 'html-prop-not-in-spec',
        message: `HTML 中的 data-prop="${htmlProp.name}"（组件 "${htmlProp.componentName}"）在 Spec 中未定义`,
        path: `html[${htmlProp.htmlIndex}].${htmlProp.componentName}`,
      })
    }
  }

  // Rule 5: Spec 中每个 event 必须在 HTML 中有对应的 data-action（SHOULD 警告）
  for (const comp of specComponents) {
    if (!htmlComponentNames.has(comp.name)) continue
    for (const evt of comp.events || []) {
      const found = htmlActions.some(
        a => a.componentName === comp.name && a.name === evt.name
      )
      if (!found) {
        warnings.push({
          level: 'SHOULD',
          rule: 'spec-event-missing-in-html',
          message: `Spec 组件 "${comp.name}" 的事件 "${evt.name}" 在 HTML 中未找到 data-action="${evt.name}"`,
          path: `components.${comp.name}.events.${evt.name}`,
        })
      }
    }
  }

  // Rule 6: HTML 中每个 data-action 必须在 Spec 中有定义
  for (const htmlAction of htmlActions) {
    const specComp = specComponents.find(c => c.name === htmlAction.componentName)
    if (!specComp) continue
    const specEventNames = (specComp.events || []).map(e => e.name)
    if (!specEventNames.includes(htmlAction.name)) {
      errors.push({
        level: 'HARD',
        rule: 'html-action-not-in-spec',
        message: `HTML 中的 data-action="${htmlAction.name}"（组件 "${htmlAction.componentName}"）在 Spec 中未定义`,
        path: `html[${htmlAction.htmlIndex}].${htmlAction.componentName}`,
      })
    }
  }

  // Rule 7: Spec 的 convertMode 必须与 HTML 的 data-convert 一致
  for (const htmlComp of htmlComponents) {
    const specComp = specComponents.find(c => c.name === htmlComp.name)
    if (!specComp) continue
    if (htmlComp.convert !== specComp.convertMode) {
      errors.push({
        level: 'HARD',
        rule: 'convert-mode-mismatch',
        message: `组件 "${htmlComp.name}" 的 data-convert="${htmlComp.convert}" 与 Spec convertMode="${specComp.convertMode}" 不一致`,
        path: `html[${htmlComp.htmlIndex}].${htmlComp.name}`,
      })
    }
  }

  return { errors, warnings }
}

// ─── Spec ↔ 代码 校验（框架无关语义搜索） ────────────────

/**
 * 框架无关的 Spec ↔ 代码校验。
 *
 * 策略：不解析 Vue/React/Angular/Svelte 的特定语法，只搜索标识符存在性。
 * - component 名称：在代码文件名或内容中搜索
 * - prop 名称：在代码内容中搜索（作为标识符，用词边界匹配）
 * - event 名称：在代码内容中搜索（作为标识符，同时搜索 onEventName 形式）
 *
 * 这样支持任意框架：Vue (defineProps/defineEmits)、React (interface/props)、
 * Angular (@Input/@Output)、Svelte (export let/createEventDispatcher) 等。
 */
function checkSpecVsCode(spec, codeFiles) {
  const errors = []
  const warnings = []

  const specComponents = spec.components || []

  for (const comp of specComponents) {
    // 只有 component 和 manual 模式需要校验代码
    if (comp.convertMode !== 'component' && comp.convertMode !== 'manual') continue

    // Rule 1: Spec 中每个 component 必须有对应的代码文件
    const codeFile = findCodeFile(codeFiles, comp.name)
    if (!codeFile) {
      errors.push({
        level: 'HARD',
        rule: 'code-file-missing',
        message: `Spec 组件 "${comp.name}" 未找到代码文件（支持 .vue/.tsx/.jsx/.svelte/.ts/.js 等）`,
        path: `components.${comp.name}`,
      })
      continue
    }

    const content = codeFile.content

    // Rule 2: 代码中必须包含 Spec 中所有 required props（语义搜索）
    for (const prop of comp.props || []) {
      if (prop.required && !containsIdentifier(content, prop.name)) {
        errors.push({
          level: 'HARD',
          rule: 'code-missing-required-prop',
          message: `代码中未找到 required prop "${prop.name}"（组件 "${comp.name}"）`,
          path: `components.${comp.name}.props.${prop.name}`,
        })
      }
    }

    // Rule 3: 代码中应包含 Spec 中所有 props（SHOULD 警告）
    for (const prop of comp.props || []) {
      if (!prop.required && !containsIdentifier(content, prop.name)) {
        warnings.push({
          level: 'SHOULD',
          rule: 'code-missing-optional-prop',
          message: `代码中未找到 optional prop "${prop.name}"（组件 "${comp.name}"）`,
          path: `components.${comp.name}.props.${prop.name}`,
        })
      }
    }

    // Rule 4: 代码中必须包含 Spec 中所有 events（语义搜索）
    for (const evt of comp.events || []) {
      if (!containsEventIdentifier(content, evt.name)) {
        errors.push({
          level: 'HARD',
          rule: 'code-missing-event',
          message: `代码中未找到事件 "${evt.name}"（组件 "${comp.name}"）`,
          path: `components.${comp.name}.events.${evt.name}`,
        })
      }
    }
  }

  return { errors, warnings }
}

/**
 * 在代码文件列表中查找指定组件的代码文件。
 * 支持任意框架扩展名：.vue/.tsx/.jsx/.svelte/.ts/.js/.angular 等。
 */
function findCodeFile(codeFiles, componentName) {
  return codeFiles.find(f => {
    const base = basename(f.path)
    const ext = base.substring(base.lastIndexOf('.'))
    const nameWithoutExt = base.substring(0, base.length - ext.length)
    return nameWithoutExt === componentName
  })
}

/**
 * 检查代码内容中是否包含某个标识符（词边界匹配）。
 * 支持 camelCase 和 kebab-case 两种形式。
 */
function containsIdentifier(content, name) {
  // 转义正则特殊字符
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 词边界匹配，支持 camelCase 和 kebab-case
  const re = new RegExp(`\\b${escaped}\\b`)
  return re.test(content)
}

/**
 * 检查代码内容中是否包含某个事件标识符。
 * 事件名可能是 eventName 或 onEventName（React 回调约定）。
 */
function containsEventIdentifier(content, eventName) {
  // 直接匹配事件名
  if (containsIdentifier(content, eventName)) return true

  // 匹配 onEventName 形式（React 回调约定）
  const onForm = 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1)
  if (containsIdentifier(content, onForm)) return true

  return false
}

// ─── HTML ↔ 代码 校验 ────────────────────────────────────

function checkHtmlVsCode(htmlContents, codeFiles) {
  const errors = []
  const warnings = []

  const htmlClasses = extractHtmlClasses(htmlContents)
  const codeClasses = extractCodeCssClasses(codeFiles)

  // Rule 1: HTML 中的 CSS 类名必须在代码 CSS 中存在
  for (const cls of htmlClasses) {
    if (!codeClasses.has(cls)) {
      errors.push({
        level: 'HARD',
        rule: 'html-class-missing-in-code',
        message: `HTML CSS 类 "${cls}" 在代码 CSS 中未找到`,
        path: 'html',
      })
    }
  }

  // Rule 2: 代码 CSS 中的类名（非工具类）必须在 HTML 中使用
  for (const cls of codeClasses) {
    if (!htmlClasses.has(cls)) {
      warnings.push({
        level: 'SHOULD',
        rule: 'code-class-not-used-in-html',
        message: `代码 CSS 类 "${cls}" 在 HTML 中未使用`,
        path: 'code',
      })
    }
  }

  return { errors, warnings }
}

/**
 * 从 HTML 内容中提取所有 class="..." 中的类名。
 */
function extractHtmlClasses(htmlContents) {
  const classes = new Set()
  for (const html of htmlContents) {
    const classRe = /class="([^"]+)"/g
    let m
    while ((m = classRe.exec(html)) !== null) {
      m[1].split(/\s+/).forEach(c => {
        if (c && !c.startsWith('data-')) classes.add(c)
      })
    }
  }
  return classes
}

/**
 * 从代码文件中提取所有 CSS 类名。
 * 支持 .css/.module.css/.scss 文件和 .vue 文件的 <style> 段。
 */
function extractCodeCssClasses(codeFiles) {
  const classes = new Set()
  const classRe = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g

  for (const file of codeFiles) {
    const cssContent = extractCssFromCodeFile(file)
    let m
    classRe.lastIndex = 0
    while ((m = classRe.exec(cssContent)) !== null) {
      classes.add(m[1])
    }
  }
  return classes
}

/**
 * 从代码文件中提取 CSS 内容。
 */
function extractCssFromCodeFile(file) {
  const path = file.path
  if (path.endsWith('.css') || path.endsWith('.scss')) {
    return file.content
  }
  if (path.endsWith('.vue')) {
    // 提取 <style> 段
    const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/g
    let m
    let css = ''
    while ((m = styleRe.exec(file.content)) !== null) {
      css += m[1] + '\n'
    }
    return css
  }
  return ''
}

// ─── CLI 入口 ────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2).filter(Boolean)
  if (args.length < 2) {
    console.log('Usage: node scripts/checks/spec-fidelity.js <spec.json> <html-file-or-dir> [code-dir]')
    console.log('')
    console.log('校验 Spec ↔ HTML ↔ 代码 一致性（框架无关）。')
    console.log('  spec.json    Design Spec 文件')
    console.log('  html-file    HTML 文件或目录')
    console.log('  code-dir     代码目录（可选，提供后校验 Spec↔代码 和 HTML↔代码）')
    console.log('输出：JSON 格式报告')
    console.log('退出码：0（通过）、1（有 HARD 错误）')
    process.exit(0)
  }

  const [specPath, htmlPath, codeDir] = args

  // 读取 Spec
  let spec
  try {
    spec = JSON.parse(readFileSync(resolve(specPath), 'utf-8'))
  } catch (e) {
    console.log(JSON.stringify({
      specVsHtml: { errors: [], warnings: [] },
      specVsCode: { errors: [], warnings: [] },
      htmlVsCode: { errors: [], warnings: [] },
      summary: { totalErrors: 1, totalWarnings: 0, passed: false },
    }, null, 2))
    process.exit(1)
  }

  // 读取 HTML 文件
  const htmlContents = []
  const htmlStat = statSync(resolve(htmlPath))
  if (htmlStat.isFile()) {
    htmlContents.push(readFileSync(resolve(htmlPath), 'utf-8'))
  } else if (htmlStat.isDirectory()) {
    const htmlFiles = collectFiles([resolve(htmlPath)], new Set(['.html', '.htm']))
    for (const f of htmlFiles) {
      htmlContents.push(readFileSync(f, 'utf-8'))
    }
  }

  // 读取代码文件（可选）
  const codeFiles = []
  if (codeDir && existsSync(resolve(codeDir))) {
    const codeExts = new Set([
      '.vue', '.tsx', '.jsx', '.ts', '.js', '.svelte',
      '.css', '.scss', '.module.css',
    ])
    const codeFileList = collectFiles([resolve(codeDir)], codeExts)
    for (const f of codeFileList) {
      codeFiles.push({ path: f, content: readFileSync(f, 'utf-8') })
    }
  }

  const report = checkSpecFidelity(spec, htmlContents, codeFiles)
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.summary.passed ? 0 : 1)
}

const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main()
}
