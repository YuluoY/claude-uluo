#!/usr/bin/env node

// load.js
// 使用 npx skills add 从 skills.sh 拉取外部设计类 skill，安装到项目本地。
// 用法: node scripts/load.js <skill-name> [--force] [--all] [--list]

import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const REMOTE_SKILLS = {
  'ui-ux-pro-max': {
    repo: 'nextlevelbuilder/ui-ux-pro-max-skill',
    skillName: 'ui-ux-pro-max',
    description: '设计系统生成：67 种风格、161 配色、57 字体、99 UX 规则',
  },
  'design-taste-frontend': {
    repo: 'leonxlnx/taste-skill',
    skillName: 'design-taste-frontend',
    description: '品味纠偏：AI TELLS 禁令、三旋钮配置、创意武器库',
  },
  'styleseed-design-review': {
    repo: 'bitjaru/styleseed',
    skillName: 'styleseed-design-review',
    description: '品牌风格引擎：Vercel/Linear/Notion/Stripe/Toss/Raycast/Arc 7 种品牌皮肤 + 74 条设计规则',
  },
}

function getSkillPath(projectRoot, skillName) {
  return join(projectRoot, '.agents', 'skills', skillName)
}

function isSkillInstalled(projectRoot, skillName) {
  return existsSync(join(getSkillPath(projectRoot, skillName), 'SKILL.md'))
}

function installSkill(config, projectRoot) {
  const cmd = 'npx skills add ' + config.repo + ' --skill ' + config.skillName + ' -y'
  execSync(cmd, { cwd: projectRoot, stdio: 'pipe', encoding: 'utf8' })
}

function removeSkill(skillName, projectRoot) {
  try {
    execSync('npx skills remove ' + skillName + ' -y', { cwd: projectRoot, stdio: 'pipe', encoding: 'utf8' })
  } catch (e) {
    // ignore
  }
}

function loadSkill(skillName, force, projectRoot) {
  const config = REMOTE_SKILLS[skillName]
  if (!config) {
    throw new Error('未知的远程 skill: ' + skillName)
  }
  const skillPath = getSkillPath(projectRoot, skillName)
  if (!force && isSkillInstalled(projectRoot, skillName)) {
    return { name: skillName, path: skillPath, skillMd: join(skillPath, 'SKILL.md'), newlyInstalled: false }
  }
  if (force) {
    removeSkill(skillName, projectRoot)
  }
  installSkill(config, projectRoot)
  if (!isSkillInstalled(projectRoot, skillName)) {
    throw new Error('安装后未找到 SKILL.md: ' + skillPath)
  }
  return { name: skillName, path: skillPath, skillMd: join(skillPath, 'SKILL.md'), newlyInstalled: true }
}

function main() {
  const args = process.argv.slice(2)
  if (args.includes('--list') || args.includes('-l')) {
    process.stdout.write('可用的远程设计 Skill：\n\n')
    for (const [name, config] of Object.entries(REMOTE_SKILLS)) {
      const installed = isSkillInstalled(process.cwd(), name)
      const status = installed ? '已安装' : '未安装'
      process.stdout.write('  [' + status + '] ' + name + '\n')
      process.stdout.write('      ' + config.description + '\n')
      process.stdout.write('      npx skills add ' + config.repo + ' --skill ' + config.skillName + '\n\n')
    }
    return
  }
  const force = args.includes('--force') || args.includes('-f')
  const all = args.includes('--all') || args.includes('-a')
  const skillNames = args.filter(function(a) { return !a.startsWith('-') })
  if (skillNames.length === 0 && !all) {
    process.stderr.write('用法: node scripts/load.js <skill-name> [--force] [--all] [--list]\n')
    process.exit(1)
  }
  const targets = all ? Object.keys(REMOTE_SKILLS) : skillNames
  const projectRoot = process.cwd()
  process.stdout.write('项目根目录: ' + projectRoot + '\n\n')
  for (const name of targets) {
    const config = REMOTE_SKILLS[name]
    if (!config) {
      process.stderr.write('未知 skill: ' + name + '\n')
      process.exit(1)
    }
    try {
      const result = loadSkill(name, force, projectRoot)
      const status = result.newlyInstalled ? '已通过 npx 安装' : '已安装，跳过'
      process.stdout.write('[OK] ' + name + ' — ' + status + '\n')
      process.stdout.write('     路径: ' + result.path + '\n')
      process.stdout.write('     SKILL.md: ' + result.skillMd + '\n\n')
    } catch (err) {
      process.stderr.write('[FAIL] ' + name + ': ' + err.message + '\n')
      process.exit(1)
    }
  }
  process.stdout.write('完成。\n')
}

main()
