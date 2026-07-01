#!/usr/bin/env node

/**
 * G8 注释格式检查
 *
 * G8-FMT-1  禁止单行块注释（须多行块注释，或单行说明用双斜杠）
 * G8-FMT-2  多行块注释内层星号须与 opening 星号列对齐
 * G8-I18N-1 stores/constants 禁止 label 硬编码 UI 文案
 *
 * 用法：
 *   node scripts/checks/comment-format.js <file-or-dir> [...more]
 *   或 import：import { checkCommentFormat } from './comment-format.js'
 */

import { readFileSync } from 'fs'
import { collectFiles } from '../_shared/collect-files.js'
import { createReport, addError, printReport } from '../_shared/report.js'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.vue'])

/**
 * @description 从 Vue SFC 提取 script 段
 */
function extractVueScript(source) {
  const blocks = []
  const re = /<script[^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(source)) !== null) {
    blocks.push(match[1])
  }
  return blocks.length ? blocks.join('\n') : source
}

/**
 * @description 去掉字符串字面量，避免注释规则误报
 */
function stripStringLiterals(source) {
  let out = ''
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      out += ' '
      i += 1
      while (i < source.length) {
        if (source[i] === '\\') {
          out += '  '
          i += 2
          continue
        }
        if (source[i] === quote) {
          out += ' '
          i += 1
          break
        }
        out += source[i] === '\n' ? '\n' : ' '
        i += 1
      }
      continue
    }
    out += ch
    i += 1
  }
  return out
}

/**
 * @description 判定是否为单行块注释
 */
function isSingleLineBlockComment(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('/**')) return false
  const closeIdx = trimmed.indexOf('*/')
  if (closeIdx === -1) return false
  const inner = trimmed.slice(3, closeIdx).trim()
  return inner.length > 0
}

/**
 * @description 扫描多行块注释星号列对齐
 */
function checkMultilineBlockAlignment(lines, filePath, report) {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const openIdx = line.indexOf('/**')
    if (openIdx === -1) continue

    const closeOnSameLine = line.indexOf('*/', openIdx + 3)
    if (closeOnSameLine !== -1) continue

    const starCol = line.indexOf('*', openIdx)
    if (starCol === -1) continue

    let j = i + 1
    while (j < lines.length) {
      const cur = lines[j]
      const closeIdx = cur.indexOf('*/')
      if (closeIdx !== -1) {
        const starOnClose = cur.lastIndexOf('*', closeIdx)
        if (starOnClose !== -1 && starOnClose !== starCol) {
          addError(
            report,
            filePath,
            j + 1,
            `[G8-FMT-2] 块注释 closing * 列 ${starOnClose + 1} 与 opening * 列 ${starCol + 1} 未对齐`
          )
        }
        break
      }

      if (cur.trimStart().startsWith('*')) {
        const starIdx = cur.indexOf('*')
        if (starIdx !== starCol) {
          addError(
            report,
            filePath,
            j + 1,
            `[G8-FMT-2] 块注释内层 * 列 ${starIdx + 1} 与 opening * 列 ${starCol + 1} 未对齐`
          )
        }
      }
      j += 1
    }
  }
}

/**
 * @description stores/constants 禁止 label 硬编码 UI 文案
 */
function checkStoreI18n(rawLines, filePath, report) {
  const normalized = filePath.replace(/\\/g, '/')
  const inStore = /(^|\/)stores\//.test(normalized)
  const isConstants = normalized.endsWith('/constants.ts') || normalized.endsWith('/constants.js')
  if (!inStore && !isConstants) return

  for (let i = 0; i < rawLines.length; i += 1) {
    const m = rawLines[i].match(/label\s*:\s*['"]([^'"]+)['"]/)
    if (!m) continue
    if (m[1].trim().length === 0) continue
    addError(
      report,
      filePath,
      i + 1,
      `[G8-I18N-1] stores/constants 禁止硬编码 label「${m[1]}」，仅存 id/key，展示走 i18n`
    )
  }
}

/**
 * @description 对单文件执行 G8 注释格式规则
 */
export function checkCommentFormat(filePath, content, report) {
  const source = filePath.endsWith('.vue') ? extractVueScript(content) : content
  const sanitized = stripStringLiterals(source)
  const rawLines = source.split('\n')
  const lines = sanitized.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    if (isSingleLineBlockComment(lines[i])) {
      addError(
        report,
        filePath,
        i + 1,
        '[G8-FMT-1] 禁止单行块注释；单行说明用 //，export/接口用多行块注释'
      )
    }
  }

  checkMultilineBlockAlignment(lines, filePath, report)
  checkStoreI18n(rawLines, filePath, report)
}

/**
 * @description CLI：扫描路径并输出报告
 */
export function runCommentFormatCli(inputs) {
  const files = collectFiles(inputs, CODE_EXTENSIONS)
  if (!files.length) {
    console.log('No JS/TS/Vue files to check for comment format')
    return 0
  }

  const report = createReport()
  for (const filePath of files) {
    checkCommentFormat(filePath, readFileSync(filePath, 'utf-8'), report)
  }

  printReport(report, files.length)
  return report.errors.length > 0 ? 1 : 0
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[\\/]/, ''))) {
  const inputs = process.argv.slice(2).filter(Boolean)
  if (!inputs.length) {
    console.log('Usage: node scripts/checks/comment-format.js <file-or-dir> [...more]')
    process.exit(0)
  }
  process.exit(runCommentFormatCli(inputs))
}
