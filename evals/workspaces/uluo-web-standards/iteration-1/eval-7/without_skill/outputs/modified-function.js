/**
 * 文件收集工具 —— 递归扫描目录，按扩展名过滤。
 *
 * BUG FIX: collectFiles 的 JSDoc 文档指示调用者传入数组
 * （如 ['.js', '.ts']），但内部 walk 函数调用 extensions.has()
 * 要求参数为 Set。若调用者按文档传入数组，会触发
 * TypeError: extensions.has is not a function。
 *
 * 修复方案：在函数入口处将 extensions 统一规范化为 Set，
 * 使文档描述的 API（数组）与实现（Set）同时兼容。
 *
 * 用法：
 *   import { collectFiles } from './lib/collect-files.js'
 *   const jsFiles = collectFiles(inputs, ['.js', '.ts'])
 *   const styleFiles = collectFiles(inputs, ['.scss', '.css', '.vue'])
 */

import { existsSync, readdirSync, statSync } from 'fs'
import { extname, join, resolve } from 'path'

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt'])

export function collectFiles(inputs, extensions)
{
  if (!inputs.length) return []

  const files = []
  const extSet = extensions instanceof Set ? extensions : new Set(extensions)

  for (const input of inputs)
  {
    const absolutePath = resolve(input)
    if (!existsSync(absolutePath)) continue
    walk(absolutePath, extSet, files)
  }

  return [...new Set(files)].sort()
}

function walk(targetPath, extensions, files)
{
  const stat = statSync(targetPath)

  if (stat.isFile())
  {
    if (extensions.has(extname(targetPath)))
      files.push(targetPath)
    return
  }

  if (!stat.isDirectory()) return

  const entries = readdirSync(targetPath)
  for (const entry of entries)
  {
    if (IGNORE_DIRS.has(entry)) continue
    walk(join(targetPath, entry), extensions, files)
  }
}
