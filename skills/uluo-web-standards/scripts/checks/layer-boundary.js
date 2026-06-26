#!/usr/bin/env node

/**
 * DDD 分层边界检查 —— domain 不能 import infrastructure/application，
 * application 不能 import infrastructure。
 *
 * 用法：
 *   node scripts/checks/layer-boundary.js <file> [...more]
 *   或 import：import { checkLayerBoundary } from './layer-boundary.js'
 */

import { readFileSync } from 'fs'
import { collectFiles } from '../_shared/collect-files.js'
import { createReport, addError, printReport } from '../_shared/report.js'

const CODE_EXTENSIONS = new Set(['.ts', '.tsx'])

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*[\\/]/, '')))
{
  const files = collectFiles(process.argv.slice(2).filter(Boolean), CODE_EXTENSIONS)
  if (!files.length) { console.log('No TS/TSX files to check'); process.exit(0) }

  const report = createReport()
  for (const f of files) checkLayerBoundary(f, readFileSync(f, 'utf-8'), report)
  printReport(report, files.length)
  process.exit(report.errors.length > 0 ? 1 : 0)
}

export function checkLayerBoundary(filePath, content, report)
{
  const normalized = filePath.replaceAll('\\', '/')

  if (normalized.includes('/domain/') && importsLayer(content, 'infrastructure'))
    addError(report, filePath, 1, 'Domain MUST NOT import from infrastructure layer')

  if (normalized.includes('/domain/') && importsLayer(content, 'application'))
    addError(report, filePath, 1, 'Domain MUST NOT import from application layer')

  if (normalized.includes('/application/') && importsLayer(content, 'infrastructure'))
    addError(report, filePath, 1, 'Application MUST inject infrastructure through domain interfaces')
}

function importsLayer(content, layerName)
{
  const pattern = new RegExp(`\\bfrom\\s+['\"][^'\"]*/${layerName}(/|['\"])`)
  return pattern.test(content)
}
