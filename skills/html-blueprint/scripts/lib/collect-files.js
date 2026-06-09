/**
 * collect-files.js — 共享工具：递归收集目录中匹配扩展名的文件。
 *
 * 用法（import）：
 *   import { collectFiles } from './lib/collect-files.js'
 *   const files = collectFiles(['src/', 'a.html'], new Set(['.html', '.css']))
 */

import { statSync, readdirSync } from 'fs'
import { join, extname } from 'path'

export function collectFiles(inputs, extensions) {
  const result = []

  for (const input of inputs) {
    let stats
    try { stats = statSync(input) }
    catch (_) { continue }

    if (stats.isFile()) {
      if (extensions.has(extname(input).toLowerCase())) {
        result.push(input)
      }
    } else if (stats.isDirectory()) {
      walk(input, extensions, result)
    }
  }

  return [...new Set(result)].sort()
}

function walk(dir, extensions, result) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) }
  catch (_) { return }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name === '__pycache__') {
      continue
    }

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath, extensions, result)
    } else if (entry.isFile()) {
      if (extensions.has(extname(entry.name).toLowerCase())) {
        result.push(fullPath)
      }
    }
  }
}
