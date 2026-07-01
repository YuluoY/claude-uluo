#!/usr/bin/env node
/**
 * Tool / Instruction 插件 manifest 校验（resources 为唯一真相源）
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..', '..')
const TOOLS_DIR = join(repoRoot, 'apps/desktop/resources/plugins/tools')
const SKILLS_DIR = join(repoRoot, 'apps/desktop/resources/plugins/skills')
const STYLES_DIR = join(repoRoot, 'apps/desktop/resources/plugins/styles')
const BUILTIN_REFS = join(repoRoot, 'apps/desktop/resources/plugins/builtin-view-refs.json')

function validateInstructionDir(dir, expectedKind) {
  const errors = []
  for (const pluginId of listSubdirs(dir)) {
    const skillPath = join(dir, pluginId, 'SKILL.md')
    if (!existsSync(skillPath)) {
      errors.push(`缺少 SKILL.md: ${skillPath}`)
      continue
    }
    const raw = readFileSync(skillPath, 'utf8')
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!match) {
      errors.push(`${skillPath}: 缺少 YAML frontmatter`)
      continue
    }
    const idLine = match[1].split('\n').find((l) => l.startsWith('id:'))
    const kindLine = match[1].split('\n').find((l) => l.startsWith('kind:'))
    if (!idLine) errors.push(`${skillPath}: 缺少 id`)
    if (kindLine && !kindLine.includes(expectedKind)) {
      errors.push(`${skillPath}: kind 应为 ${expectedKind}`)
    }
  }
  return errors
}

function listSubdirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory())
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function main() {
  const errors = []
  const allowedBuiltin = new Set(readJson(BUILTIN_REFS))

  errors.push(...validateInstructionDir(SKILLS_DIR, 'skill'))
  errors.push(...validateInstructionDir(STYLES_DIR, 'style'))

  for (const pluginId of listSubdirs(TOOLS_DIR)) {
    const manifestPath = join(TOOLS_DIR, pluginId, 'plotvine-tool.json')
    if (!existsSync(manifestPath)) {
      errors.push(`缺少 manifest: ${manifestPath}`)
      continue
    }
    let manifest
    try {
      manifest = readJson(manifestPath)
    } catch (e) {
      errors.push(`JSON 解析失败: ${manifestPath} — ${e.message}`)
      continue
    }
    if (manifest.kind !== 'tool') errors.push(`${manifestPath}: kind 必须为 tool`)
    if (!manifest.id) errors.push(`${manifestPath}: 缺少 id`)
    for (const view of manifest.contributes?.views ?? []) {
      if (view.component?.startsWith('builtin:') && !allowedBuiltin.has(view.component)) {
        errors.push(`${manifestPath}: 未注册的 builtin 组件 ${view.component}`)
      }
      if (!view.labelKey) errors.push(`${manifestPath}: view ${view.id} 缺少 labelKey`)
    }
  }

  if (errors.length > 0) {
    console.error('[validate:plugins] 失败:\n' + errors.map((e) => `  - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('[validate:plugins] 通过')
}

main()
