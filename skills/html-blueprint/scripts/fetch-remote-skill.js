#!/usr/bin/env node

/**
 * fetch-remote-skill.js — 远程 Skill 动态加载器。
 *
 * 从 GitHub Raw 按需拉取外部设计类 skill 的核心文件，缓存到本地项目。
 * 无需用户手动安装 skill，html-blueprint 运行时按需加载。
 *
 * 配置：references/remote-skills.md
 *
 * 用法：
 *   node scripts/fetch-remote-skill.js <skill-name>
 *   node scripts/fetch-remote-skill.js <skill-name> --force
 *   node scripts/fetch-remote-skill.js --all
 *   node scripts/fetch-remote-skill.js --list
 *
 * 输出：缓存文件路径，加载失败时输出错误信息
 * 退出码：0（成功）、1（失败）
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const SKILL_ROOT = resolve(__dirname, '..')

// 远程 skill 配置表
const REMOTE_SKILLS = {
  'ui-ux-pro-max': {
    repo: 'nextlevelbuilder/ui-ux-pro-max-skill',
    branch: 'main',
    files: [
      { remote: '.claude/skills/ui-ux-pro-max/SKILL.md', local: 'SKILL.md' },
    ],
    description: '设计系统生成：67 种风格、161 配色、57 字体、99 UX 规则',
  },
  'design-taste-frontend': {
    repo: 'leonxlnx/taste-skill',
    branch: 'main',
    files: [
      { remote: 'skills/taste-skill/SKILL.md', local: 'SKILL.md' },
    ],
    description: '品味纠偏：AI TELLS 禁令、三旋钮配置、创意武器库',
  },
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 天

function getCacheDir(projectRoot) {
  return join(projectRoot, '.cache', 'html-blueprint', 'remote-skills')
}

function getCachePath(projectRoot, skillName, localFile) {
  return join(getCacheDir(projectRoot), skillName, localFile)
}

function isCacheValid(cachePath) {
  if (!existsSync(cachePath)) return false
  try {
    const stat = statSync(cachePath)
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS
  } catch {
    return false
  }
}

async function fetchRawFile(repo, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`)
  }
  return await response.text()
}

async function fetchSkill(skillName, force = false, projectRoot = process.cwd()) {
  const config = REMOTE_SKILLS[skillName]
  if (!config) {
    throw new Error(`未知的远程 skill: ${skillName}\n可用: ${Object.keys(REMOTE_SKILLS).join(', ')}`)
  }

  const cacheDir = join(getCacheDir(projectRoot), skillName)
  mkdirSync(cacheDir, { recursive: true })

  const results = []

  for (const file of config.files) {
    const cachePath = getCachePath(projectRoot, skillName, file.local)

    if (!force && isCacheValid(cachePath)) {
      results.push({ file: file.local, cached: true, path: cachePath })
      continue
    }

    try {
      const content = await fetchRawFile(config.repo, config.branch, file.remote)
      writeFileSync(cachePath, content, 'utf8')
      results.push({ file: file.local, cached: false, path: cachePath })
    } catch (err) {
      if (existsSync(cachePath)) {
        results.push({ file: file.local, cached: true, stale: true, path: cachePath, error: err.message })
      } else {
        throw new Error(`拉取 ${skillName}/${file.remote} 失败: ${err.message}`)
      }
    }
  }

  return {
    name: skillName,
    description: config.description,
    cacheDir,
    files: results,
  }
}

function listSkills() {
  console.log('可用的远程 Skill：\n')
  for (const [name, config] of Object.entries(REMOTE_SKILLS)) {
    console.log(`  ${name}`)
    console.log(`    ${config.description}`)
    console.log(`    仓库: ${config.repo}`)
    console.log(`    文件: ${config.files.map(f => f.remote).join(', ')}`)
    console.log()
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--list') || args.includes('-l')) {
    listSkills()
    return
  }

  const force = args.includes('--force') || args.includes('-f')
  const all = args.includes('--all') || args.includes('-a')
  const skillNames = args.filter(a => !a.startsWith('-'))

  if (skillNames.length === 0 && !all) {
    console.error('用法：node scripts/fetch-remote-skill.js <skill-name> [--force] [--all] [--list]')
    console.error('\n可用 skill：')
    for (const name of Object.keys(REMOTE_SKILLS)) {
      console.error(`  ${name} — ${REMOTE_SKILLS[name].description}`)
    }
    process.exit(1)
  }

  const targets = all ? Object.keys(REMOTE_SKILLS) : skillNames
  const projectRoot = process.cwd()

  console.log(`项目根目录: ${projectRoot}\n`)

  for (const name of targets) {
    try {
      const result = await fetchSkill(name, force, projectRoot)
      console.log(`✅ ${result.name} — ${result.description}`)
      for (const file of result.files) {
        const status = file.cached
          ? (file.stale ? '📦 缓存(过期)' : '📦 缓存命中')
          : '⬇️  已拉取'
        console.log(`   ${status}  ${file.file}`)
        if (file.error) {
          console.log(`      ⚠️  ${file.error}`)
        }
      }
      console.log(`   缓存目录: ${result.cacheDir}`)
      console.log()
    } catch (err) {
      console.error(`❌ ${name}: ${err.message}`)
      process.exit(1)
    }
  }

  console.log('完成。')
}

main().catch(err => {
  console.error('错误:', err.message)
  process.exit(1)
})
