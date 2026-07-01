#!/usr/bin/env node

/**
 * design-structure.js — 校验 design/ 目录结构的规范性。
 *
 * 规则：
 *   1. 若 design/pages/ 包含 HTML 文件：
 *      - design/tokens.css 必须存在（HARD）
 *      - design/layout/ 必须包含至少一个 HTML 文件（HARD - 骨架先行）
 *      - pages/ 中每个 HTML 必须包含 <!-- @layout 注释声明（HARD）
 *      - @layout 引用的文件必须存在（相对于 page 文件解析 ../layout/<name>.html）（HARD）
 *   2. design/ 下所有 HTML 文件（layout/, blocks/, components/, pages/）必须包含
 *      引用 tokens.css 的 <link rel="stylesheet">（HARD）
 *   3. 若 design/pages/ 包含 HTML 文件：
 *      - design/component-registry.json 必须存在（HARD）
 *      - design/index.html 建议存在（WARN）
 *      - design/tokens.html 包含 6 个 @token-section 标记（HARD）
 *
 * 用法：
 *   node scripts/checks/design-structure.js <dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无 HARD 发现）、1（有 HARD 发现）
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join, resolve, dirname, extname } from 'path'

let hardFindings = 0
let warnFindings = 0
let scannedDirs = 0

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

function getAllHtmlFilesRecursively(dirPath) {
  if (!existsSync(dirPath)) return []
  const files = []
  walk(dirPath, files)
  return files
}

function walk(dir, result) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) }
  catch (_) { return }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, result)
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.html') {
      result.push(fullPath)
    }
  }
}

function extractLayoutComment(htmlContent) {
  const match = htmlContent.match(/<!--\s*@layout\s+(\S+)\s*-->/)
  return match ? match[1].trim() : null
}

function hasTokensCssLink(htmlContent) {
  const linkRe = /<link\s+[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi
  let m
  while ((m = linkRe.exec(htmlContent)) !== null) {
    if (m[0].includes('tokens.css')) {
      return true
    }
  }
  return false
}

/**
 * Extract all href values from .sidebar__link elements in HTML content.
 * Returns an array of href values.
 */
function extractSidebarLinkHrefs(htmlContent) {
  const hrefs = []
  const linkRe = /class="[^"]*\bsidebar__link\b[^"]*"[^>]*href="([^"]+)"/gi
  let m
  while ((m = linkRe.exec(htmlContent)) !== null) {
    hrefs.push(m[1])
  }
  return hrefs
}

/**
 * Check if HTML content contains the app-shell structure classes.
 */
function hasAppShellStructure(htmlContent) {
  return htmlContent.includes('class="') &&
    /class="[^"]*\bapp-shell\b[^"]*"/.test(htmlContent) &&
    /class="[^"]*\bsidebar\b[^"]*"/.test(htmlContent) &&
    /class="[^"]*\bmain-area\b[^"]*"/.test(htmlContent)
}

/**
 * CSS selectors that are defined in layout.css and should not be redefined
 * in page-level <style> blocks.
 */
const LAYOUT_CSS_SELECTORS = [
  'stat-card', 'stat-grid', 'content-card', 'charts-row', 'page-header',
]

function hasDuplicateLayoutCss(htmlContent) {
  const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (!styleMatch) return []
  const found = []
  for (const styleBlock of styleMatch) {
    for (const selector of LAYOUT_CSS_SELECTORS) {
      // Check if the selector is used as a CSS class selector (with a dot prefix)
      const cssRuleRe = new RegExp(`\\.${selector}[\\s:{]`, 'i')
      if (cssRuleRe.test(styleBlock)) {
        found.push(selector)
      }
    }
  }
  return [...new Set(found)] // deduplicate
}

// ── Sidebar structure extraction and comparison ──

/**
 * Normalize a sidebar href to its canonical page name.
 * e.g. "dashboard.html" → "dashboard.html"
 *      "../pages/dashboard.html" → "dashboard.html"
 *      "#" → "#" (placeholder, flagged)
 */
function normalizeSidebarHref(href) {
  if (href === '#') return '#'
  // Strip parent dir prefixes like "../pages/"
  const m = href.match(/(?:.*\/)?([^/]+\.html)$/)
  return m ? m[1] : href
}

/**
 * Extract the canonical sidebar navigation structure from HTML content.
 * Returns: { sections: [{label, items: [{label, href, badge}]}], footer: [{label, href}], logo: {label, href} | null }
 */
function extractSidebarStructure(htmlContent) {
  const result = { sections: [], footer: [], logo: null }

  // Extract sidebar nav
  const sidebarMatch = htmlContent.match(/<nav\s+class="[^"]*\bsidebar__nav\b[^"]*"[\s\S]*?<\/nav>/i)
  if (!sidebarMatch) return result

  const navHtml = sidebarMatch[0]

  // Extract section labels
  const sectionLabels = []
  const sectionLabelRe = /<div\s+class="[^"]*\bsidebar__section-label\b[^"]*"[^>]*>([^<]+)<\/div>/gi
  let slMatch
  while ((slMatch = sectionLabelRe.exec(navHtml)) !== null) {
    sectionLabels.push(slMatch[1].trim())
  }

  // Split nav content by section labels to get items per section
  const navSections = []
  let remaining = navHtml
  for (let i = 0; i < sectionLabels.length; i++) {
    const label = sectionLabels[i]
    const labelIdx = remaining.indexOf(label)
    if (labelIdx < 0) continue

    // Content after this label until next label or end
    let sectionContent
    if (i < sectionLabels.length - 1) {
      const nextLabelIdx = remaining.indexOf(sectionLabels[i + 1], labelIdx + label.length)
      sectionContent = nextLabelIdx >= 0 ? remaining.substring(labelIdx, nextLabelIdx) : remaining.substring(labelIdx)
    } else {
      sectionContent = remaining.substring(labelIdx)
    }
    navSections.push({ label, content: sectionContent })
  }

  // If no section labels found, treat entire nav as one unnamed section
  if (navSections.length === 0) {
    navSections.push({ label: '', content: navHtml })
  }

  for (const section of navSections) {
    const items = []
    const itemRe = /sidebar__link[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?sidebar__link-text[^>]*>([^<]+)<[\s\S]*?(?:sidebar__badge[^>]*>([^<]+)<)?/gi
    let itemMatch
    while ((itemMatch = itemRe.exec(section.content)) !== null) {
      const href = itemMatch[1]
      const label = itemMatch[2].trim()
      const badge = itemMatch[3] ? itemMatch[3].trim() : null
      items.push({ label, href, badge })
    }
    // Fallback: less strict regex if above didn't match
    if (items.length === 0) {
      const fallbackRe = /sidebar__link[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?(?:<a[^>]*>)?\s*([^<>{}\n]+?)\s*(?:<\/a>)?/gi
      let fm
      while ((fm = fallbackRe.exec(section.content)) !== null) {
        const href = fm[1]
        const label = fm[2].trim()
        if (label && href !== '#' && label.length < 30 && !label.includes('<') && !label.startsWith('svg') && !label.startsWith('/')) {
          items.push({ label, href, badge: null })
        }
      }
    }
    result.sections.push({ label: section.label, items })
  }

  // Extract footer links
  const footerMatch = htmlContent.match(/sidebar__footer[^>]*>([\s\S]*?)<\/div>/i)
  if (footerMatch) {
    const footerHtml = footerMatch[1]
    const footerLinkRe = /sidebar__link[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?sidebar__link-text[^>]*>([^<]+)<\//gi
    let fMatch
    while ((fMatch = footerLinkRe.exec(footerHtml)) !== null) {
      result.footer.push({ label: fMatch[2].trim(), href: fMatch[1] })
    }
    if (result.footer.length === 0) {
      const simpleRe = /<a\s+[^>]*class="[^"]*sidebar__link[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*sidebar__link-text[^>]*>([^<]+)<\/span>/gi
      let sm
      while ((sm = simpleRe.exec(footerHtml)) !== null) {
        result.footer.push({ label: sm[2].trim(), href: sm[1] })
      }
    }
  }

  // Extract logo href
  const logoMatch = htmlContent.match(/sidebar__logo[^>]*href="([^"]+)"/i)
  if (logoMatch) {
    const logoHref = logoMatch[1]
    const logoLabelMatch = htmlContent.match(/sidebar__logo-text[^>]*>([^<]+)</i)
    const logoLabel = logoLabelMatch ? logoLabelMatch[1].trim() : ''
    result.logo = { label: logoLabel, href: logoHref }
  }

  return result
}

/**
 * Compare two sidebar structures and return differences.
 * Returns array of diff strings, empty if identical.
 */
function compareSidebarStructures(structA, structB, nameA, nameB) {
  const diffs = []

  // Compare sections
  const maxSections = Math.max(structA.sections.length, structB.sections.length)
  for (let i = 0; i < maxSections; i++) {
    const secA = structA.sections[i]
    const secB = structB.sections[i]

    if (!secA && secB) {
      diffs.push(`${nameA} 缺导航分组 "${secB.label}"（${nameB} 有）`)
      continue
    }
    if (secA && !secB) {
      diffs.push(`${nameB} 缺导航分组 "${secA.label}"（${nameA} 有）`)
      continue
    }
    if (secA.label !== secB.label) {
      diffs.push(`导航分组名不一致: "${nameA}"="${secA.label}" vs "${nameB}"="${secB.label}"`)
    }

    // Compare items within section
    const maxItems = Math.max(secA.items.length, secB.items.length)
    for (let j = 0; j < maxItems; j++) {
      const itemA = secA.items[j]
      const itemB = secB.items[j]

      if (!itemA && itemB) {
        diffs.push(`${nameA} 缺导航项 "${itemB.label}"（分组 "${secB.label}"，${nameB} 有）`)
        continue
      }
      if (itemA && !itemB) {
        diffs.push(`${nameB} 缺导航项 "${itemA.label}"（分组 "${secA.label}"，${nameA} 有）`)
        continue
      }

      const normHrefA = normalizeSidebarHref(itemA.href)
      const normHrefB = normalizeSidebarHref(itemB.href)

      if (itemA.label !== itemB.label) {
        diffs.push(`导航项 label 不一致（分组 "${secA.label}" 第 ${j + 1} 项）: "${nameA}"="${itemA.label}" vs "${nameB}"="${itemB.label}"`)
      }
      if (normHrefA !== normHrefB) {
        diffs.push(`导航项 "${itemA.label}" 链接目标不一致: "${nameA}"="${normHrefA}" vs "${nameB}"="${normHrefB}"`)
      }
    }
  }

  // Compare footer
  const maxFooter = Math.max(structA.footer.length, structB.footer.length)
  for (let i = 0; i < maxFooter; i++) {
    const fA = structA.footer[i]
    const fB = structB.footer[i]
    if (!fA && fB) {
      diffs.push(`${nameA} 缺 footer 链接 "${fB.label}"（${nameB} 有）`)
      continue
    }
    if (fA && !fB) {
      diffs.push(`${nameB} 缺 footer 链接 "${fA.label}"（${nameA} 有）`)
      continue
    }
    const normA = normalizeSidebarHref(fA.href)
    const normB = normalizeSidebarHref(fB.href)
    if (fA.label !== fB.label || normA !== normB) {
      diffs.push(`footer 链接不一致: "${nameA}"="${fA.label}→${normA}" vs "${nameB}"="${fB.label}→${normB}"`)
    }
  }

  // Compare logo href
  if (structA.logo && structB.logo) {
    const normA = normalizeSidebarHref(structA.logo.href)
    const normB = normalizeSidebarHref(structB.logo.href)
    if (normA !== normB) {
      diffs.push(`logo 链接目标不一致: "${nameA}"="${normA}" vs "${nameB}"="${normB}"`)
    }
  } else if (structA.logo && !structB.logo) {
    diffs.push(`${nameB} 缺少 logo 链接`)
  } else if (!structA.logo && structB.logo) {
    diffs.push(`${nameA} 缺少 logo 链接`)
  }

  return diffs
}

/**
 * Check if a sidebar href target file exists.
 */
function sidebarHrefFileExists(href, pagesDir, designDir) {
  if (href === '#' || href === '') return false

  // If it starts with "../pages/", resolve from designDir perspective
  if (href.startsWith('../pages/')) {
    const fileName = href.replace('../pages/', '')
    return existsSync(join(pagesDir, fileName))
  }

  // If it starts with "../", resolve from pagesDir perspective via designDir
  if (href.startsWith('../')) {
    const relativePath = href.replace('../', '')
    return existsSync(join(designDir, relativePath))
  }

  // If it's just a page name like "dashboard.html", check pages/
  if (href.endsWith('.html') && !href.includes('/')) {
    return existsSync(join(pagesDir, href))
  }

  // Otherwise check relative to designDir
  return existsSync(join(designDir, href))
}

function checkProjectRoot(rootDir) {
  const designDir = join(rootDir, 'design')

  if (!existsSync(designDir)) {
    return
  }

  let designStats
  try { designStats = statSync(designDir) }
  catch (_) { return }
  if (!designStats.isDirectory()) return

  scannedDirs++

  const tokensDir = join(designDir, 'tokens')
  const tokensPath = join(tokensDir, 'tokens.css')
  const tokensHtmlPath = join(tokensDir, 'tokens.html')
  const pagesDir = join(designDir, 'pages')
  const layoutDir = join(designDir, 'layout')
  const blocksDir = join(designDir, 'blocks')
  const componentsDir = join(designDir, 'components')

  const tokensExists = existsSync(tokensPath)
  const pageHtmlFiles = getHtmlFilesInDir(pagesDir)
  const hasPages = pageHtmlFiles.length > 0

  const registryPath = join(designDir, 'component-registry.json')
  const indexHtmlPath = join(designDir, 'index.html')

  const registryExists = existsSync(registryPath)
  const indexHtmlExists = existsSync(indexHtmlPath)

  if (!tokensExists) {
    if (hasPages) {
      console.log(`${tokensPath}:0: design/tokens/tokens.css 文件不存在，但 design/pages/ 中存在 HTML 文件，必须先创建 tokens.css`)
      hardFindings++
    } else {
      console.log(`${tokensPath}:0: design/ 目录存在但未找到 tokens/tokens.css，建议创建 tokens.css 定义设计令牌`)
      warnFindings++
    }
  }

  if (!registryExists && hasPages) {
    console.log(`${registryPath}:0: design/pages/ 中存在 HTML 文件但缺少 component-registry.json，请先创建组件注册表以确保跨页面一致性`)
    hardFindings++
  }

  if (!indexHtmlExists && hasPages) {
    console.log(`${indexHtmlPath}:0: 建议创建 design/index.html 作为设计系统总入口，参考 examples/index-template.html`)
    warnFindings++
  }

  // Check tokens/ directory + tokens.html with @token-section markers
  if (!existsSync(tokensDir)) {
    if (hasPages) {
      console.log(`${tokensDir}:0: 缺少 design/tokens/ 目录，请创建 tokens/tokens.css + tokens/tokens.html`)
      hardFindings++
    }
  } else {
    if (!existsSync(tokensPath) && hasPages) {
      console.log(`${tokensPath}:0: tokens/tokens.css 不存在`)
      hardFindings++
    }
    if (!existsSync(tokensHtmlPath) && hasPages) {
      console.log(`${tokensHtmlPath}:0: tokens/tokens.html 不存在，请生成包含 6 个 @token-section 标记的 Token 展示页`)
      hardFindings++
    } else if (existsSync(tokensHtmlPath)) {
      let tokensContent
      try { tokensContent = readFileSync(tokensHtmlPath, 'utf-8') }
      catch (_) { tokensContent = '' }
      const tokenSections = ['colors', 'typography', 'spacing', 'radius', 'shadow', 'motion']
      const missingTokens = tokenSections.filter(s => !tokensContent.includes(`@token-section: ${s}`))
      if (missingTokens.length > 0) {
        console.log(`${tokensHtmlPath}:0: tokens.html 缺 ${missingTokens.length}/6 个 @token-section 标记: ${missingTokens.join(', ')}`)
        hardFindings++
      }
    }
  }

  // Check 6 category component files in components/ subdir
  if (hasPages) {
    const compDir = join(designDir, 'components')
    const categoryFiles = ['general.html', 'data-entry.html', 'data-display.html', 'feedback.html', 'navigation.html', 'layout.html']
    const missingCats = categoryFiles.filter(f => !existsSync(join(compDir, f)))
    if (missingCats.length > 0) {
      console.log(`${compDir}:0: 缺 ${missingCats.length}/6 个类别组件文件: ${missingCats.join(', ')}`)
      hardFindings++
    }
  }

  if (hasPages) {
    const layoutHtmlFiles = getHtmlFilesInDir(layoutDir)
    if (layoutHtmlFiles.length === 0) {
      console.log(`${layoutDir}:0: design/pages/ 中存在 HTML 文件但 design/layout/ 中没有骨架 HTML 文件，必须先创建 layout 骨架`)
      hardFindings++
    }

    for (const pageFile of pageHtmlFiles) {
      let content
      try { content = readFileSync(pageFile, 'utf-8') }
      catch (_) { continue }

      const layoutName = extractLayoutComment(content)
      if (!layoutName) {
        console.log(`${pageFile}:0: 页面 HTML 缺少 <!-- @layout <name-or-path> --> 注释声明，必须指定使用的 layout 骨架`)
        hardFindings++
        continue
      }

      let layoutFilePath
      if (layoutName.includes('/') || layoutName.endsWith('.html')) {
        layoutFilePath = resolve(dirname(pageFile), layoutName)
      } else {
        layoutFilePath = resolve(dirname(pageFile), '..', 'layout', `${layoutName}.html`)
      }
      if (!existsSync(layoutFilePath)) {
        console.log(`${pageFile}:0: @layout 引用的骨架文件不存在: ${layoutFilePath}（引用值: ${layoutName}）`)
        hardFindings++
      }
    }
  }

  // ── App-shell + sidebar href + cross-page sidebar consistency validation ──
  if (hasPages) {
    // ── nav-structure.json existence check ──
    const navStructurePath = join(layoutDir, 'nav-structure.json')
    if (!existsSync(navStructurePath)) {
      console.log(`${navStructurePath}:0: design/pages/ 中存在 HTML 文件但缺少 layout/nav-structure.json，请创建导航结构声明文件`)
      hardFindings++
    }

    // ── Layout sidebar checks ──
    for (const layoutFile of getHtmlFilesInDir(layoutDir)) {
      let content
      try { content = readFileSync(layoutFile, 'utf-8') }
      catch (_) { continue }

      const hrefs = extractSidebarLinkHrefs(content)
      const hashHrefs = hrefs.filter(h => h === '#')
      if (hashHrefs.length > 0) {
        console.log(`${layoutFile}:0: layout 中的 sidebar 导航链接使用了 href="#"（${hashHrefs.length} 处），必须使用真实页面路径，如 href="../pages/dashboard.html"`)
        hardFindings++
      }
    }

    // ── Extract and cross-compare all page sidebar structures ──
    const pageStructures = []
    for (const pageFile of pageHtmlFiles) {
      let content
      try { content = readFileSync(pageFile, 'utf-8') }
      catch (_) { continue }

      if (!hasAppShellStructure(content)) {
        console.log(`${pageFile}:0: 页面缺少 app-shell 结构（.app-shell / .sidebar / .main-area），必须嵌入完整骨架布局`)
        hardFindings++
        continue
      }

      const pageHrefs = extractSidebarLinkHrefs(content)
      const pageHashHrefs = pageHrefs.filter(h => h === '#')
      if (pageHashHrefs.length > 0) {
        console.log(`${pageFile}:0: 页面 sidebar 导航链接使用了 href="#"（${pageHashHrefs.length} 处），必须使用真实页面路径，如 href="dashboard.html"`)
        hardFindings++
      }

      // WARN: Check for duplicate layout CSS in page <style> blocks
      const dupes = hasDuplicateLayoutCss(content)
      if (dupes.length > 0) {
        console.log(`${pageFile}:0: 页面 <style> 中包含了已在 layout.css 定义的选择器（${dupes.join(', ')}），建议删除以减少 CSS 重复`)
        warnFindings++
      }

      // Extract sidebar structure for cross-page comparison
      pageStructures.push({ file: pageFile, structure: extractSidebarStructure(content) })
    }

    // ── Cross-page sidebar consistency check ──
    if (pageStructures.length >= 2) {
      // Compare each page against the first page (canonical reference)
      const canonical = pageStructures[0]
      for (let i = 1; i < pageStructures.length; i++) {
        const other = pageStructures[i]
        const nameA = canonical.file.replace(/^.*\/pages\//, '').replace(/\.html$/, '')
        const nameB = other.file.replace(/^.*\/pages\//, '').replace(/\.html$/, '')
        const diffs = compareSidebarStructures(canonical.structure, other.structure, nameA, nameB)
        for (const diff of diffs) {
          console.log(`${other.file}:0: sidebar 结构与 ${canonical.file} 不一致: ${diff}`)
          hardFindings++
        }
      }
    }

    // ── Sidebar href target existence check ──
    for (const ps of pageStructures) {
      const allHrefs = new Set()
      for (const section of ps.structure.sections) {
        for (const item of section.items) {
          allHrefs.add(item.href)
        }
      }
      for (const f of ps.structure.footer) {
        allHrefs.add(f.href)
      }
      if (ps.structure.logo) {
        allHrefs.add(ps.structure.logo.href)
      }

      for (const href of allHrefs) {
        if (!sidebarHrefFileExists(href, pagesDir, designDir)) {
          console.log(`${ps.file}:0: sidebar 链接指向不存在的文件: "${href}"`)
          hardFindings++
        }
      }
    }
  }

  const designSubdirs = [layoutDir, blocksDir, componentsDir, pagesDir]
  for (const subdir of designSubdirs) {
    const htmlFiles = getAllHtmlFilesRecursively(subdir)
    for (const htmlFile of htmlFiles) {
      let content
      try { content = readFileSync(htmlFile, 'utf-8') }
      catch (_) { continue }

      if (!hasTokensCssLink(content)) {
        console.log(`${htmlFile}:0: design/ 下的 HTML 文件必须通过 <link rel="stylesheet"> 引用 tokens.css`)
        hardFindings++
      }
    }
  }
}

function getProjectRoot(inputPath) {
  let stats
  try { stats = statSync(inputPath) }
  catch (_) { return null }

  if (stats.isDirectory()) {
    return resolve(inputPath)
  } else if (stats.isFile()) {
    return resolve(dirname(inputPath))
  }
  return null
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/design-structure.js <dir> [...more]')
    process.exit(0)
  }

  for (const input of inputs) {
    const root = getProjectRoot(input)
    if (root) {
      checkProjectRoot(root)
    }
  }

  console.log(`\ndesign-structure: ${scannedDirs} project(s) scanned, ${hardFindings} HARD finding(s), ${warnFindings} warning(s)`)
  process.exit(hardFindings > 0 ? 1 : 0)
}

main()
