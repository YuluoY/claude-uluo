#!/usr/bin/env node

/**
 * component-registry.js — 组件注册表完整性校验。
 *
 * 规则：
 *   1. 若 design/pages/ 包含 HTML 文件，design/component-registry.json 必须存在（HARD）
 *   2. registry JSON 必须合法且 version = "1.0"（HARD）
 *   3. 每个 entry 必须含 name/type/htmlFile/status 必填字段（HARD）
 *   4. name PascalCase，type atomic|business，status pending|confirmed（HARD）
 *   5. 每个 entry 的 htmlFile 必须存在于 design/ 下（HARD）
 *   6. design/pages/ 和 design/components/ 中所有 data-component 申明必须在 registry 中有对应 entry（HARD）
 *   7. 同名组件出现在多个页面时，其 data-prop/data-event 签名必须一致（HARD）
 *   8. 有 pages 但无 registry 为 WARN
 *   9. pending 状态的组件被多个页面引用但未 confirmed 为 WARN
 *
 * 用法：
 *   node scripts/checks/component-registry.js <dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无 HARD 发现）、1（有 HARD 发现）
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join, resolve, dirname, extname } from 'path'
import { parseHTML } from '../_shared/html-parser.js'

let hardFindings = 0
let warnFindings = 0

const VALID_TYPES = new Set(['atomic', 'business'])
const VALID_STATUSES = new Set(['pending', 'confirmed'])
const PASCAL_CASE_RE = /^[A-Z][A-Za-z0-9]*$/
const HTML_EXTENSIONS = new Set(['.html'])

// ── helpers ──

function getHtmlFilesInDir(dirPath) {
  if (!existsSync(dirPath)) return []
  const files = []
  let entries
  try { entries = readdirSync(dirPath, { withFileTypes: true }) }
  catch (_) { return [] }
  for (const entry of entries) {
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') {
      files.push(join(dirPath, entry.name))
    }
  }
  return files
}

function getAllHtmlFiles(dirPath) {
  if (!existsSync(dirPath)) return []
  const result = []
  walk(dirPath, result)
  return result
}

function walk(dir, result) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) }
  catch (_) { return }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, result)
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') result.push(full)
  }
}

function isDesignDir(dirPath) {
  try { return statSync(dirPath).isDirectory() && dirPath.endsWith('design') }
  catch (_) { return false }
}

function isInDesignDir(filePath) {
  return filePath.includes('/design/') || filePath.includes('\\design\\')
}

// ── registry parsing ──

function loadRegistry(designDir) {
  const path = join(designDir, 'component-registry.json')
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const data = JSON.parse(raw)
    return { path, data }
  } catch (e) {
    console.log(`${path}:0: component-registry.json 解析失败: ${e.message}`)
    hardFindings++
    return null
  }
}

function validateRegistryFormat(registry) {
  if (!registry) return

  const { path, data } = registry

  if (data.version !== '1.0') {
    console.log(`${path}:0: version 必须为 "1.0"，当前为 "${data.version}"`)
    hardFindings++
  }

  for (const bucket of ['atomicComponents', 'businessComponents']) {
    const comps = data[bucket]
    if (!comps || typeof comps !== 'object' || Array.isArray(comps)) {
      console.log(`${path}:0: ${bucket} 必须为 object（key-value map），当前为 ${Array.isArray(comps) ? 'array' : typeof comps}`)
      hardFindings++
      continue
    }

    for (const [key, comp] of Object.entries(comps)) {
      if (key !== comp.name) {
        console.log(`${path}:0: ${bucket}.${key} 的 key 与 name 字段不一致: key="${key}", name="${comp.name || ''}"`)
        hardFindings++
      }
      if (!comp.name || !PASCAL_CASE_RE.test(comp.name)) {
        console.log(`${path}:0: ${bucket}.${key} name 必须为 PascalCase: "${comp.name || ''}"`)
        hardFindings++
      }
      if (!comp.type || !VALID_TYPES.has(comp.type)) {
        console.log(`${path}:0: ${bucket}.${key} type 必须为 atomic 或 business: "${comp.type || ''}"`)
        hardFindings++
      }
      if (!comp.status || !VALID_STATUSES.has(comp.status)) {
        console.log(`${path}:0: ${bucket}.${key} status 必须为 pending 或 confirmed: "${comp.status || ''}"`)
        hardFindings++
      }
      if (!comp.htmlFile) {
        console.log(`${path}:0: ${bucket}.${key} 缺少 htmlFile 字段`)
        hardFindings++
      }
    }
  }
}

function checkHtmlFileExistence(registry, designDir) {
  if (!registry) return
  const { path, data } = registry

  for (const bucket of ['atomicComponents', 'businessComponents']) {
    const comps = data[bucket]
    if (!comps || typeof comps !== 'object' || Array.isArray(comps)) continue
    for (const [key, comp] of Object.entries(comps)) {
      if (!comp.htmlFile) continue
      const filePath = join(designDir, comp.htmlFile)
      if (!existsSync(filePath)) {
        console.log(`${path}:0: ${bucket}.${key} 的 htmlFile 不存在: ${comp.htmlFile}`)
        hardFindings++
      }
    }
  }
}

// ── HTML data-component extraction ──

function extractComponentDeclarations(designDir) {
  const result = {}
  const dirs = ['pages', 'components', 'blocks']
  for (const sub of dirs) {
    const subPath = join(designDir, sub)
    const htmlFiles = getAllHtmlFiles(subPath)
    for (const htmlFile of htmlFiles) {
      let content
      try { content = readFileSync(htmlFile, 'utf-8') }
      catch (_) { continue }
      const $ = parseHTML(content)
      const components = []
      $('[data-component]').each(el => {
        const name = el.attr('data-component')
        if (!name) return
        const props = []
        const events = []
        el.find('[data-prop]').each(child => {
          const propName = child.attr('data-prop')
          const propType = child.attr('data-type') || 'string'
          if (propName) props.push({ name: propName, type: propType })
        })
        el.find('[data-event]').each(child => {
          const evtName = child.attr('data-action') || child.attr('data-event')
          const trigger = child.attr('data-event')
          if (evtName) events.push({ name: evtName, trigger: trigger || 'click' })
        })
        const deco = el.find('[data-decorative]')
        const decoratives = []
        deco.each(d => {
          const dn = d.attr('data-decorative')
          if (dn) decoratives.push(dn)
        })
        components.push({ name, props, events, decoratives })
      })
      if (components.length > 0) {
        result[htmlFile] = components
      }
    }
  }
  return result
}

// ── registry coverage check ──

function checkRegistryCoverage(registry, htmlDeclarations) {
  if (!registry) return
  const { path, data } = registry

  const allRegistryComponents = new Set()
  for (const bucket of ['atomicComponents', 'businessComponents']) {
    const comps = data[bucket]
    if (!comps || typeof comps !== 'object') continue
    Object.keys(comps).forEach(k => allRegistryComponents.add(k))
  }

  for (const [htmlFile, components] of Object.entries(htmlDeclarations)) {
    for (const comp of components) {
      if (!allRegistryComponents.has(comp.name)) {
        const relPath = htmlFile.replace(/^.*\/design\//, 'design/')
        console.log(`${relPath}:0: data-component="${comp.name}" 未在 component-registry.json 中注册`)
        hardFindings++
      }
    }
  }
}

// ── cross-page consistency ──

function checkCrossPageConsistency(htmlDeclarations, designDir) {
  const compPagesMap = {}

  for (const [htmlFile, components] of Object.entries(htmlDeclarations)) {
    if (!htmlFile.includes('/pages/')) continue
    const pageName = htmlFile.split('/').pop()
    for (const comp of components) {
      if (!compPagesMap[comp.name]) compPagesMap[comp.name] = []
      compPagesMap[comp.name].push({ page: pageName, props: comp.props, events: comp.events })
    }
  }

  for (const [compName, usages] of Object.entries(compPagesMap)) {
    if (usages.length < 2) continue

    const baseline = usages[0]
    for (let i = 1; i < usages.length; i++) {
      const current = usages[i]

      const basePropNames = baseline.props.map(p => p.name).sort().join(',')
      const currPropNames = current.props.map(p => p.name).sort().join(',')
      if (basePropNames !== currPropNames) {
        console.log(`design/component-registry.json:0: 组件 "${compName}" 在页面 "${baseline.page}" 和 "${current.page}" 中的 props 签名不一致`)
        console.log(`  ${baseline.page}: [${basePropNames || '(无)'}]`)
        console.log(`  ${current.page}: [${currPropNames || '(无)'}]`)
        hardFindings++
      } else {
        for (const bp of baseline.props) {
          const cp = current.props.find(p => p.name === bp.name)
          if (cp && bp.type !== cp.type) {
            console.log(`design/component-registry.json:0: 组件 "${compName}" prop "${bp.name}" 在页面 "${baseline.page}" 和 "${current.page}" 中类型不一致: ${bp.type} vs ${cp.type}`)
            hardFindings++
          }
        }
      }

      const baseEvtNames = baseline.events.map(e => `${e.name}:${e.trigger}`).sort().join(',')
      const currEvtNames = current.events.map(e => `${e.name}:${e.trigger}`).sort().join(',')
      if (baseEvtNames !== currEvtNames) {
        console.log(`design/component-registry.json:0: 组件 "${compName}" 在页面 "${baseline.page}" 和 "${current.page}" 中的 events 签名不一致`)
        console.log(`  ${baseline.page}: [${baseEvtNames || '(无)'}]`)
        console.log(`  ${current.page}: [${currEvtNames || '(无)'}]`)
        hardFindings++
      }
    }
  }
}

// ── pending warnings ──

function checkPendingWarnings(registry) {
  if (!registry) return
  const { path, data } = registry

  for (const bucket of ['atomicComponents', 'businessComponents']) {
    const comps = data[bucket]
    if (!comps || typeof comps !== 'object') continue
    for (const [key, comp] of Object.entries(comps)) {
      if (comp.status === 'pending' && Array.isArray(comp.usedInPages) && comp.usedInPages.length < 2) {
        console.log(`${path}:0: ${bucket}.${key} 状态为 pending，仅被 ${comp.usedInPages?.length || 0} 个页面引用，建议跨页面验证后标记为 confirmed`)
        warnFindings++
      }
    }
  }
}

// ── main ──

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/component-registry.js <dir> [...more]')
    process.exit(0)
  }

  let scannedProjects = 0

  for (const input of inputs) {
    let designDir = input
    if (!isDesignDir(designDir)) {
      const checkDir = join(input, 'design')
      if (existsSync(checkDir) && statSync(checkDir).isDirectory()) {
        designDir = checkDir
      }
    }

    if (!existsSync(designDir)) continue
    scannedProjects++

    const pagesDir = join(designDir, 'pages')
    const hasPages = getHtmlFilesInDir(pagesDir).length > 0

    const registry = loadRegistry(designDir)

    if (!registry) {
      if (hasPages) {
        console.log(`${join(designDir, 'component-registry.json')}:0: design/pages/ 中存在 HTML 文件但缺少 component-registry.json，请先创建组件注册表以确保跨页面一致性`)
        hardFindings++
      } else {
        console.log(`${join(designDir, 'component-registry.json')}:0: 未找到 component-registry.json（无 pages 时非必须）`)
      }
      continue
    }

    validateRegistryFormat(registry)
    checkHtmlFileExistence(registry, designDir)

    const htmlDeclarations = extractComponentDeclarations(designDir)
    checkRegistryCoverage(registry, htmlDeclarations)
    checkCrossPageConsistency(htmlDeclarations, designDir)
    checkPendingWarnings(registry)
  }

  console.log(`\ncomponent-registry: ${scannedProjects} project(s) scanned, ${hardFindings} HARD finding(s), ${warnFindings} warning(s)`)
  process.exit(hardFindings > 0 ? 1 : 0)
}

main()
