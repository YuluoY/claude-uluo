/**
 * code-writer.js — 格式化代码并写入文件系统。
 *
 * 用法：
 *   import { writeComponent, writeReport, formatCode } from './convert-lib/code-writer.js'
 *   await writeComponent('StatCard', sfcString, '/tmp/out', 'vue')
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

/**
 * 写入组件文件（可选 prettier 格式化）。
 * @param {string} componentName — PascalCase 组件名
 * @param {string} code — 源代码字符串
 * @param {string} outDir — 输出目录
 * @param {'vue'|'tsx'|'css'} type — 文件类型
 * @param {boolean} [usePrettier=true] — 是否用 prettier 格式化
 * @returns {Promise<string>} 写入的文件路径
 */
export async function writeComponent(componentName, code, outDir, type, usePrettier = true) {
  const extensions = { vue: '.vue', tsx: '.tsx', css: '.module.css' }
  const ext = extensions[type] || '.txt'
  const filePath = join(outDir, `${componentName}${ext}`)

  mkdirSync(dirname(filePath), { recursive: true })

  let formatted = code
  if (usePrettier) {
    try {
      formatted = await formatCode(code, type)
    } catch (_) {
      // Prettier 格式化失败时使用原始代码
    }
  }

  writeFileSync(filePath, formatted, 'utf-8')
  return filePath
}

/**
 * 用 Prettier 格式化代码。
 * @param {string} code
 * @param {'vue'|'tsx'|'css'} type
 * @returns {Promise<string>}
 */
export async function formatCode(code, type) {
  try {
    const prettier = await import('prettier')
    const parserMap = {
      vue: 'vue',
      tsx: 'typescript',
      css: 'css',
    }
    return await prettier.format(code, {
      parser: parserMap[type] || 'typescript',
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
    })
  } catch (_) {
    return code
  }
}

/**
 * 写入转换置信度报告。
 * @param {string} outDir
 * @param {Object} report — 报告对象
 * @returns {string} 文件路径
 */
export function writeReport(outDir, report) {
  const filePath = join(outDir, 'conversion-report.json')
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')
  return filePath
}
