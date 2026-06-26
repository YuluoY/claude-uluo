#!/usr/bin/env node

/**
 * theme-consistency.js — 跨蓝图主题一致性校验。
 *
 * 规则：
 *   1. 设计稿 HTML 建议声明 <!-- @theme --> 注释（SHOULD）
 *   2. 项目中不应存在多个不同的 tokens.css（WARN）
 *   3. HTML <style> 中不应重复定义主题已有的 :root token（SHOULD）
 *   4. HTML 中 var() 引用的 token 应存在于主题 CSS 中（SHOULD）
 *   5. 多个 HTML 设计稿应引用同一个主题文件（WARN）
 *   6. 主题 CSS 应包含关键 token（颜色/间距/字号核心项）（WARN）
 *
 * 用法：
 *   node scripts/checks/theme-consistency.js <file-or-dir> [...more]
 *
 * 输出每行：文件:行号: 描述
 * 退出码：0（无发现）、1（有发现）
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname, relative, basename } from 'path'
import { collectFiles } from '../_shared/collect-files.js'

const EXTENSIONS = new Set(['.html', '.css'])

// 关键 token 名称（theme CSS 中建议包含的核心项）
const KEY_COLOR_TOKENS = [
  '--color-primary',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-bg-page',
  '--color-bg-surface',
]

const KEY_SPACING_TOKENS = [
  '--space-2', '--space-4', '--space-6',
]

const KEY_RADIUS_TOKENS = [
  '--radius-md', '--radius-lg',
]

const KEY_FONT_TOKENS = [
  '--font-size-sm', '--font-size-base', '--font-size-lg',
]

const ALL_KEY_TOKENS = [
  ...KEY_COLOR_TOKENS,
  ...KEY_SPACING_TOKENS,
  ...KEY_RADIUS_TOKENS,
  ...KEY_FONT_TOKENS,
]

let findings = 0
let themeCSSPath = null          // 项目主 theme CSS 的绝对路径
let themeTokens = new Map()      // token_name → value
let htmlFiles = []               // { path, themeRef, inlineTokens, varRefs }

/**
 * 从 CSS 文本中提取 :root 内定义的 CSS 自定义属性。
 * 返回 Map<tokenName, value>。
 */
function extractRootTokens(cssText) {
  const tokens = new Map()

  // 匹配 :root { ... } 块（支持嵌套 {} 的简单处理）
  const rootMatch = cssText.match(/:root\s*\{([^}]*)\}/s)
  if (!rootMatch) return tokens

  const rootBlock = rootMatch[1]
  // 匹配 --name: value; 模式
  const varRe = /(--[\w-]+)\s*:\s*([^;]+);/g
  let m
  while ((m = varRe.exec(rootBlock)) !== null) {
    tokens.set(m[1].trim(), m[2].trim())
  }

  return tokens
}

/**
 * 从 CSS/HTML 文本中提取所有 var() 引用的 token 名。
 * 返回 Set<tokenName>。
 */
function extractVarReferences(cssText) {
  const refs = new Set()
  // 匹配 var(--name) 或 var(--name, fallback)
  const varRe = /var\((--[\w-]+)(?:\s*,[^)]*)?\)/g
  let m
  while ((m = varRe.exec(cssText)) !== null) {
    refs.add(m[1].trim())
  }
  return refs
}

/**
 * 从 HTML 中提取 <!-- @theme --> 注释的主题路径。
 */
function extractThemeComment(html) {
  const match = html.match(/<!--\s*@theme\s+(\S+)\s*-->/)
  return match ? match[1].trim() : null
}

/**
 * 从 HTML 中提取所有 <style> 标签的文本内容（合并）。
 */
function extractStyleText(html) {
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  const parts = []
  let m
  while ((m = styleRe.exec(html)) !== null) {
    parts.push(m[1])
  }
  return parts.join('\n')
}

/**
 * 查找项目的 tokens.css 文件。
 * 扫描输入目录中的所有 .css 文件，找到名为 tokens.css 的文件。
 */
function findThemeCSS(inputs) {
  const cssFiles = collectFiles(inputs, EXTENSIONS).filter(f => f.endsWith('.css'))

  const themes = cssFiles.filter(f => basename(f) === 'tokens.css')
  return themes.map(f => resolve(f))
}

/**
 * 分析单个 HTML 文件。
 */
function analyzeHTMLFile(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return null }

  const themeRef = extractThemeComment(content)
  const styleText = extractStyleText(content)
  const inlineTokens = extractRootTokens(styleText)
  const varRefs = extractVarReferences(styleText)

  return { path: resolve(filePath), themeRef, inlineTokens, varRefs }
}

/**
 * 分析主题 CSS 文件，提取其 token 定义。
 */
function analyzeThemeCSS(filePath) {
  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return null }

  const tokens = extractRootTokens(content)

  // 也检查非 :root 的顶层 --* 定义
  const globalRe = /^(--[\w-]+)\s*:\s*([^;]+);/gm
  let m
  while ((m = globalRe.exec(content)) !== null) {
    if (!tokens.has(m[1].trim())) {
      tokens.set(m[1].trim(), m[2].trim())
    }
  }

  return { path: resolve(filePath), tokens }
}

/**
 * 校验：HTML 中是否缺少 @theme 声明。
 */
function checkMissingThemeDecl(htmlFile) {
  if (!htmlFile.themeRef) {
    console.log(`${htmlFile.path}:0: 缺少 <!-- @theme --> 声明，建议声明关联的主题 CSS 路径以实现项目级一致性`)
    findings++
  }
}

/**
 * 校验：HTML 中是否在 <style> 内重复定义主题已有的 :root token。
 */
function checkRedefinedTokens(htmlFile) {
  if (themeTokens.size === 0 || htmlFile.inlineTokens.size === 0) return

  for (const [token, value] of htmlFile.inlineTokens) {
    if (themeTokens.has(token)) {
      const themeValue = themeTokens.get(token)
      if (value !== themeValue) {
        console.log(`${htmlFile.path}:0: <style> 中重新定义 "${token}: ${value}"，与主题 CSS 中的 "${token}: ${themeValue}" 不一致，应删除并使用 var() 引用主题值`)
        findings++
      } else {
        console.log(`${htmlFile.path}:0: <style> 中重复定义 "${token}"，值与主题 CSS 相同，建议删除以保持单一来源`)
        findings++
      }
    }
  }
}

/**
 * 校验：HTML 中 var() 引用的 token 是否存在于主题 CSS 中。
 */
function checkMissingTokenRefs(htmlFile) {
  if (themeTokens.size === 0 || htmlFile.varRefs.size === 0) return

  for (const ref of htmlFile.varRefs) {
    if (!themeTokens.has(ref)) {
      console.log(`${htmlFile.path}:0: var() 引用了不存在的 token "${ref}"，该 token 未在主题 CSS（${themeCSSPath}）中定义`)
      findings++
    }
  }
}

/**
 * 校验：主题 CSS 是否缺少关键 token。
 */
function checkMissingKeyTokens() {
  if (themeTokens.size === 0) return

  const missing = ALL_KEY_TOKENS.filter(t => !themeTokens.has(t))
  if (missing.length > 0) {
    console.log(`${themeCSSPath}:0: 主题 CSS 缺少关键 token: ${missing.join(', ')}，建议补充以提升项目样式一致性`)
    findings++
  }
}

/**
 * 校验：多个 HTML 是否引用了不同的主题文件。
 */
function checkMixedThemeRefs() {
  const refMap = new Map() // themeRef → [htmlPaths]

  for (const htmlFile of htmlFiles) {
    if (!htmlFile.themeRef) continue
    const key = resolve(dirname(htmlFile.path), htmlFile.themeRef)
    if (!refMap.has(key)) refMap.set(key, [])
    refMap.get(key).push(htmlFile.path)
  }

  if (refMap.size > 1) {
    const keys = [...refMap.keys()]
    console.log(`:0: 项目存在 ${refMap.size} 个不同的主题引用:`)
    for (const k of keys) {
      const files = refMap.get(k).map(f => relative(process.cwd(), f))
      console.log(`:0:   主题 "${k}" ← ${files.join(', ')}`)
    }
    console.log(`:0: 建议统一到同一个 tokens.css，如确实需要多主题请人工确认`)
    findings++
  }
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/theme-consistency.js <file-or-dir> [...more]')
    process.exit(0)
  }

  // ── 找到主题 CSS ──
  const themeFiles = findThemeCSS(inputs)

  if (themeFiles.length === 0) {
    // 没有 tokens.css 的项目提示
    console.log('theme-consistency: 未找到 tokens.css，跳过跨蓝图一致性校验')
    console.log('提示: 如果项目包含多个设计稿 HTML，建议创建 tokens.css 作为统一主题文件')
    process.exit(0)
  }

  if (themeFiles.length > 1) {
    console.log(`:0: 项目存在 ${themeFiles.length} 个 tokens.css:`)
    for (const f of themeFiles) {
      console.log(`:0:   ${relative(process.cwd(), f)}`)
    }
    console.log(':0: 建议合并为单一主题文件，如确实需要多主题请人工确认')
    findings++
  }

  // 使用第一个找到的作为主主题
  themeCSSPath = themeFiles[0]
  const themeData = analyzeThemeCSS(themeCSSPath)
  if (themeData) {
    themeTokens = themeData.tokens
    console.log(`theme-consistency: 使用主题 ${relative(process.cwd(), themeCSSPath)} (${themeTokens.size} tokens)`)
  }

  // ── 分析 HTML 文件 ──
  const allFiles = collectFiles(inputs, EXTENSIONS)
  for (const file of allFiles) {
    if (!file.endsWith('.html')) continue
    const data = analyzeHTMLFile(file)
    if (data) htmlFiles.push(data)
  }

  if (htmlFiles.length === 0) {
    console.log('theme-consistency: 未找到 HTML 设计稿文件')
    process.exit(0)
  }

  console.log(`theme-consistency: 扫描 ${htmlFiles.length} 个 HTML 设计稿\n`)

  // ── 逐项检查 ──
  for (const htmlFile of htmlFiles) {
    checkMissingThemeDecl(htmlFile)
    checkRedefinedTokens(htmlFile)
    checkMissingTokenRefs(htmlFile)
  }

  checkMixedThemeRefs()
  checkMissingKeyTokens()

  console.log(`\ntheme-consistency: ${htmlFiles.length + (themeFiles.length > 0 ? 1 : 0)} files scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
