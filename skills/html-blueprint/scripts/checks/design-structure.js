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
 *   3. 若 design/ 存在但 tokens.css 不存在：无 pages 时为 WARN，有 pages 时为 HARD
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

  const tokensPath = join(designDir, 'tokens.css')
  const pagesDir = join(designDir, 'pages')
  const layoutDir = join(designDir, 'layout')
  const blocksDir = join(designDir, 'blocks')
  const componentsDir = join(designDir, 'components')

  const tokensExists = existsSync(tokensPath)
  const pageHtmlFiles = getHtmlFilesInDir(pagesDir)
  const hasPages = pageHtmlFiles.length > 0

  if (!tokensExists) {
    if (hasPages) {
      console.log(`${tokensPath}:0: design/tokens.css 文件不存在，但 design/pages/ 中存在 HTML 文件，必须先创建 tokens.css`)
      hardFindings++
    } else {
      console.log(`${tokensPath}:0: design/ 目录存在但未找到 tokens.css，建议创建 tokens.css 定义设计令牌`)
      warnFindings++
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
