/**
 * 外部命令执行器。
 *
 * 核心策略：确保 skill 自带 eslint/stylelint/tsc 插件依赖已安装，
 * 通过 NODE_PATH 让 eslint config 的 import 从 skill 的 node_modules 解析。
 * 这样无论用户项目有没有这些包，工具链都能正常工作。
 *
 * 用法：
 *   import { runBin, findConfig } from './lib/run-command.js'
 *   const result = runBin('eslint', ['--config', configPath, ...files])
 *   if (result.code !== 0) ...
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve, join } from 'path'

// skill 根目录
const SKILL_ROOT = resolve(import.meta.dirname || __dirname, '..', '..')

/** 确保 skill 自身的 npm 依赖已安装（首次运行自动 pnpm install）。 */
function ensureSkillDeps()
{
  const nodeModules = join(SKILL_ROOT, 'node_modules')
  const packageJson = join(SKILL_ROOT, 'package.json')

  if (!existsSync(packageJson))
    return // skill 没有声明依赖，跳过

  if (existsSync(nodeModules))
    return // 已安装

  console.log('[uluo-web-standards] 首次使用，安装 skill 依赖...')
  try
  {
    execSync('pnpm install', { cwd: SKILL_ROOT, stdio: 'inherit' })
    console.log('[uluo-web-standards] 依赖安装完成')
  }
  catch (e)
  {
    // pnpm 不可用时尝试 npm
    try
    {
      execSync('npm install', { cwd: SKILL_ROOT, stdio: 'inherit' })
      console.log('[uluo-web-standards] 依赖安装完成（npm）')
    }
    catch (e2)
    {
      console.warn('[uluo-web-standards] 依赖安装失败，eslint/stylelint/tsc 可能无法运行')
    }
  }
}

/**
 * 执行 node_modules/.bin 下的命令。
 * 自动将 skill 的 node_modules 加入 NODE_PATH，
 * 确保 eslint config 中的插件（typescript-eslint、eslint-plugin-vue 等）可以被解析。
 */
export function runBin(bin, args)
{
  ensureSkillDeps()

  const skillNodeModules = join(SKILL_ROOT, 'node_modules')
  const currentPath = process.env.NODE_PATH || ''

  // 将 skill 的 node_modules 追加到模块解析路径
  const env = {
    ...process.env,
    NODE_PATH: existsSync(skillNodeModules)
      ? `${skillNodeModules}${currentPath ? ':' + currentPath : ''}`
      : currentPath,
  }

  const runner = hasCommand('pnpm') ? 'pnpm exec' : 'npx'
  const cmd = `${runner} ${bin} ${args.join(' ')}`
  try
  {
    execSync(cmd, { stdio: 'inherit', env })
    return { code: 0 }
  }
  catch (e)
  {
    return { code: e.status || 1 }
  }
}

function hasCommand(cmd)
{
  try
  {
    execSync(`which ${cmd}`, { stdio: 'ignore' })
    return true
  }
  catch
  {
    return false
  }
}

/** 在项目根目录或 skill config/ 目录查找配置文件。 */
export function findConfig(filename)
{
  // 先查项目根目录
  const projectConfig = resolve(process.cwd(), filename)
  if (existsSync(projectConfig)) return projectConfig

  // 再查 skill config/ 目录
  const skillConfig = resolve(SKILL_ROOT, 'config', filename)
  if (existsSync(skillConfig)) return skillConfig

  return null
}
