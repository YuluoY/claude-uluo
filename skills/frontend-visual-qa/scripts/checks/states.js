#!/usr/bin/env node

/**
 * states.js — 检测从 API 获取数据的组件是否缺少关键 UI 状态。
 *
 * 检测逻辑：
 *   1. 扫描文件是否有数据获取模式（useQuery/useFetch/axios/fetch/useSWR）
 *   2. 如果有数据获取，检查是否出现 loading/error/empty 状态处理关键字
 *   3. 对缺失的状态给出 warning
 *
 * 这不是 AST 解析器，而是模式匹配。会有 false positive（如工具函数名叫 fetchData
 * 但不在组件中），也会漏掉（如数据获取在父组件中）。定位是"快速发现问题"而非"100% 精确"。
 *
 * 用法：
 *   node scripts/checks/states.js <file-or-dir> [...more]
 */

import { readFileSync } from 'fs'
import { extname } from 'path'
import { collectFiles } from '../lib/collect-files.js'

const EXTENSIONS = new Set(['.vue', '.jsx', '.tsx', '.svelte'])

const FETCH_PATTERNS = [
  /\buseQuery\b/, /\buseFetch\b/, /\buseSWR\b/, /\buseAsync\b/,
  /\baxios\b/, /\b\.get\(/, /\b\.post\(/,
  /\bfetch\s*\(/, /\bapi\//, /\bApi\b/,
  /\bgetServerSideProps\b/, /\bgetStaticProps\b/,
  /\bloader\s*\(/, /\baction\s*\(/,
  /\bdefineLoader\b/,
]

const LOADING_KEYWORDS = /\b(isLoading|loading|isPending|isFetching|spinner|skeleton|Loader)\b/i
const ERROR_KEYWORDS = /\b(isError|error|hasError|ErrorBoundary|isRejected)\b/i
const EMPTY_KEYWORDS = /\b(isEmpty|empty|no\s*data|no\s*results|no\s*items|hasNo|空)\b/i

const NON_COMPONENT_PATTERNS = [
  /\/api\//, /\/lib\//, /\/utils\//, /\/services\//, /\/hooks\//,
  /\.d\.ts$/, /\.test\./, /\.spec\./,
]

let findings = 0

function checkFile(filePath) {
  if (NON_COMPONENT_PATTERNS.some(p => p.test(filePath))) return

  let content
  try { content = readFileSync(filePath, 'utf-8') }
  catch (_) { return }

  const hasFetch = FETCH_PATTERNS.some(p => p.test(content))
  if (!hasFetch) return

  const hasLoading = LOADING_KEYWORDS.test(content)
  const hasError = ERROR_KEYWORDS.test(content)
  const hasEmpty = EMPTY_KEYWORDS.test(content)

  const ext = extname(filePath).toLowerCase()
  const componentName = filePath.split('/').pop().replace(ext, '')

  const missing = []
  if (!hasLoading) missing.push('loading')
  if (!hasError) missing.push('error')
  if (!hasEmpty) missing.push('empty')

  if (missing.length === 0) return

  const missingStr = missing.join('/')
  console.log(`${filePath}: ${componentName}: 检测到数据获取但缺少 ${missingStr} 状态处理 — 参考 uluo-web-standards 四态模型`)
  findings++
}

function main() {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (inputs.length === 0) {
    console.log('Usage: node scripts/checks/states.js <file-or-dir> [...more]')
    process.exit(0)
  }

  const files = collectFiles(inputs, EXTENSIONS).filter(f => !NON_COMPONENT_PATTERNS.some(p => p.test(f)))

  if (files.length === 0) {
    console.log('No component files found (.vue/.jsx/.tsx/.svelte, excluding api/lib/utils/hooks)')
    process.exit(0)
  }

  for (const file of files) {
    checkFile(file)
  }

  console.log(`\nMissing-states check: ${files.length} components scanned, ${findings} finding(s)`)
  process.exit(findings > 0 ? 1 : 0)
}

main()
