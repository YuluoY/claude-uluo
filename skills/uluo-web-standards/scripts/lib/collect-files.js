/**
 * 文件收集工具 —— 递归扫描目录，按扩展名过滤。
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
