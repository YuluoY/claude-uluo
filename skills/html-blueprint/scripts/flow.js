#!/usr/bin/env node

/**
 * flow.js — html-blueprint 流程状态控制。
 *
 * 门控驱动渐进式流程推进，替代纯自然语言流程描述。通过状态文件追踪进度，
 * 门控自动校验前置条件，确保系统引导流程被稳固执行。
 *
 * 用法：
 *   node scripts/flow.js <design-dir> init --scenario <single-page|multi-page>
 *   node scripts/flow.js <design-dir> next          [--pretty]
 *   node scripts/flow.js <design-dir> complete <phaseId> [--note <备注>]
 *   node scripts/flow.js <design-dir> status        [--pretty]
 *   node scripts/flow.js <design-dir> gates <phaseId>
 *   node scripts/flow.js <design-dir> rollback <phaseId>
 *   node scripts/flow.js <design-dir> skip <phaseId> --reason <理由>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = '.blueprint-state.json'

// ── Workflow Config ──

const SINGLE_PAGE_PHASES = [
  {
    id: 'phase0',
    title: 'Phase 0: 需求理解 + 加载远程知识',
    description: '理解用户需求，识别页面类型和页面清单，加载 ui-ux-pro-max 和 design-taste-frontend',
    gates: [
      { id: 'remote-skills', type: 'script', desc: '远程 skill 已加载', check: 'load-verify' },
    ],
    requiredReads: [
      'references/requirement-extraction-guide.md',
      'references/remote-skills.md',
    ],
    outputs: ['页面清单（口头确认即可）'],
  },
  {
    id: 'phase1-tokens',
    title: 'Phase 1: 生成完整 tokens.css',
    description: '基于 ui-ux-pro-max 生成完整设计 token 面板（8 维度）',
    gates: [
      { id: 'tokens-exists', type: 'file-exists', path: 'tokens.css', desc: 'tokens.css 存在' },
      { id: 'tokens-valid', type: 'script', desc: 'tokens.css 通过核心 token 校验', command: 'node scripts/checks/design-tokens.js' },
    ],
    requiredReads: [
      'references/tokens-checklist.md',
      'references/theme-consistency.md',
      'references/design-dimensions.md',
    ],
    outputs: ['design/tokens.css'],
  },
  {
    id: 'phase1-components',
    title: 'Phase 1: 生成原子组件库',
    description: '生成全部原子组件并注册到 component-registry.json',
    gates: [
      { id: 'registry-exists', type: 'file-exists', path: 'component-registry.json', desc: 'component-registry.json 存在' },
      { id: 'atomics-registered', type: 'script', desc: '所有原子组件已注册', command: 'node scripts/checks/component-registry.js' },
    ],
    requiredReads: [
      'references/atomic-components-checklist.md',
      'references/component-registry.md',
      'references/protocol-spec.md',
    ],
    outputs: [
      'design/components/*.html（全部原子组件）',
      'design/component-registry.json（含全部原子组件，status: confirmed）',
    ],
  },
  {
    id: 'phase2-layout',
    title: 'Phase 2: 骨架布局',
    description: '生成页面骨架布局',
    gates: [
      { id: 'layout-exists', type: 'dir-has-files', path: 'layout', desc: 'design/layout/ 包含 HTML 文件' },
    ],
    requiredReads: [
      'references/design-dimensions.md',
    ],
    outputs: ['design/layout/*.html'],
  },
  {
    id: 'phase2-pages',
    title: 'Phase 2: 逐页生成 + 业务组件抽取',
    description: '逐页生成设计稿，从 registry 查表复用组件，新建组件注册',
    gates: [
      { id: 'pages-linked', type: 'script', desc: '页面 @layout 引用正确', command: 'node scripts/checks/design-structure.js' },
      { id: 'registry-coverage', type: 'script', desc: '所有 data-component 在 registry 中', command: 'node scripts/checks/component-registry.js' },
    ],
    requiredReads: [
      'references/component-registry.md',
      'references/code-generation-guide.md',
      'references/css-conventions.md',
    ],
    outputs: [
      'design/pages/*.html',
      'design/blocks/*.html',
      'design/components/*.html（新增业务组件）',
    ],
  },
  {
    id: 'phase3',
    title: 'Phase 3: 总入口 + 校验',
    description: '生成 index.html 总入口，运行全部门禁',
    gates: [
      { id: 'index-exists', type: 'file-exists', path: 'index.html', desc: 'index.html 存在' },
      { id: 'all-gates-pass', type: 'script', desc: 'validate.js 全部门禁通过', command: 'node scripts/validate.js' },
    ],
    requiredReads: [
      'references/constraint-tiers.md',
    ],
    outputs: [
      'design/index.html',
      'design/tokens/*.html',
    ],
  },
]

const MULTI_PAGE_PHASES = SINGLE_PAGE_PHASES
// Multi-page 与 single-page 的区别在于验证的严格程度（跨页一致性检查等）

const SCENARIOS = {
  'single-page': {
    phases: SINGLE_PAGE_PHASES,
    description: '单页面设计稿（可跳过 registry 跨页一致性检查）',
  },
  'multi-page': {
    phases: MULTI_PAGE_PHASES,
    description: '多页面设计稿（必须全部门禁 + 跨页一致性）',
  },
}

// ── State Management ──

function loadState(designDir) {
  const statePath = join(designDir, STATE_FILE)
  if (!existsSync(statePath)) return null
  try {
    return JSON.parse(readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

function saveState(designDir, state) {
  if (!existsSync(designDir)) mkdirSync(designDir, { recursive: true })
  writeFileSync(join(designDir, STATE_FILE), JSON.stringify(state, null, 2))
}

function initState(designDir, scenario) {
  const sc = SCENARIOS[scenario]
  if (!sc) {
    console.error(`Unknown scenario: ${scenario}. Valid: ${Object.keys(SCENARIOS).join(', ')}`)
    process.exit(1)
  }
  const state = {
    scenario,
    startedAt: new Date().toISOString(),
    currentPhase: 0,
    phases: sc.phases.map((p, i) => ({
      ...p,
      status: i === 0 ? 'active' : 'pending',
      completedAt: null,
      notes: [],
    })),
  }
  saveState(designDir, state)
  return state
}

// ── Gate Execution ──

function verifyGate(gate, designDir) {
  if (gate.type === 'file-exists') {
    const filePath = join(designDir, gate.path)
    const exists = existsSync(filePath)
    return { pass: exists, reason: exists ? '存在' : `文件不存在: ${gate.path}` }
  }
  if (gate.type === 'dir-has-files') {
    const dirPath = join(designDir, gate.path)
    if (!existsSync(dirPath)) return { pass: false, reason: `目录不存在: ${gate.path}` }
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true })
      const hasFiles = entries.some(e => e.isFile() && e.name.endsWith('.html'))
      return { pass: hasFiles, reason: hasFiles ? '包含 HTML 文件' : `目录 ${gate.path} 中没有 HTML 文件` }
    } catch {
      return { pass: false, reason: `无法读取目录: ${gate.path}` }
    }
  }
  if (gate.type === 'script') {
    if (gate.check === 'load-verify') {
      // Check that remote skills are loaded
      const loadScript = join(__dirname, '_shared', 'load.js')
      if (!existsSync(loadScript)) return { pass: false, reason: 'load.js 不存在' }
      const result = spawnSync('node', [loadScript, '--list'], { encoding: 'utf-8', timeout: 10000 })
      const output = result.stdout || ''
      const bothInstalled = output.includes('ui-ux-pro-max') && output.includes('design-taste-frontend')
      return { pass: bothInstalled, reason: bothInstalled ? '两个远程 skill 已安装' : '远程 skill 未完全加载，请运行: node scripts/_shared/load.js --all' }
    }
    if (gate.command) {
      const cmdParts = gate.command.split(/\s+/)
      const result = spawnSync('node', [...cmdParts.slice(1), designDir], {
        cwd: join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, NO_COLOR: '1' },
      })
      return { pass: result.status === 0, reason: result.status === 0 ? '校验通过' : (result.stdout?.split('\n').pop() || '校验失败') }
    }
    return { pass: false, reason: `未知的 script gate: ${gate.id}` }
  }
  return { pass: false, reason: `未知的 gate 类型: ${gate.type}` }
}

// ── Commands ──

function cmdInit(designDir, args) {
  const sIdx = args.indexOf('--scenario')
  const scenario = sIdx >= 0 ? args[sIdx + 1] : 'multi-page'

  if (existsSync(join(designDir, STATE_FILE))) {
    console.log('流程已初始化，使用 "status" 查看进度，或 "rollback" 回退重新开始')
    printStatus(loadState(designDir))
    return
  }

  const state = initState(designDir, scenario)
  console.log(`✓ 初始化完成 · 场景: ${scenario} · ${state.phases.length} 个阶段`)
  printPhaseGuidance(state, 0)
}

function cmdNext(designDir, args) {
  const state = loadState(designDir)
  if (!state) {
    console.error('未初始化，请先运行: node scripts/flow.js <design-dir> init --scenario <name>')
    process.exit(1)
  }
  const currentIdx = state.currentPhase
  if (currentIdx >= state.phases.length) {
    console.log('✓ 所有阶段已完成！')
    return
  }
  printPhaseGuidance(state, currentIdx)
}

function cmdComplete(designDir, args) {
  const phaseId = args[0]
  const noteIdx = args.indexOf('--note')
  const note = noteIdx >= 0 ? args[noteIdx + 1] : ''

  const state = loadState(designDir)
  if (!state) {
    console.error('未初始化，请先运行: node scripts/flow.js <design-dir> init --scenario <name>')
    process.exit(1)
  }

  const currentPhase = state.phases[state.currentPhase]
  if (!currentPhase || currentPhase.id !== phaseId) {
    console.error(`当前活跃阶段为: ${currentPhase?.id || '(无)'}，不能完成 ${phaseId}`)
    console.error('请按顺序完成。使用 "status" 查看当前进度。')
    process.exit(1)
  }

  console.log(`\n门禁检查: ${currentPhase.title}`)
  let allPass = true
  const failures = []

  for (const gate of currentPhase.gates) {
    const result = verifyGate(gate, designDir)
    const icon = result.pass ? '✓' : '✗'
    console.log(`  ${icon} ${gate.desc}: ${result.reason}`)
    if (!result.pass) {
      allPass = false
      failures.push({ gate: gate.desc, reason: result.reason })
    }
  }

  if (!allPass) {
    console.log(`\n✗ 门禁未通过，${failures.length} 项失败。修复后重新 complete。`)
    process.exit(1)
  }

  currentPhase.status = 'completed'
  currentPhase.completedAt = new Date().toISOString()
  if (note) currentPhase.notes.push(note)

  state.currentPhase++
  if (state.currentPhase < state.phases.length) {
    state.phases[state.currentPhase].status = 'active'
  }

  saveState(designDir, state)

  console.log(`\n✓ ${currentPhase.title} 完成`)

  if (state.currentPhase < state.phases.length) {
    console.log(`\n下一阶段: ${state.phases[state.currentPhase].title}`)
    printPhaseGuidance(state, state.currentPhase)
  } else {
    console.log('\n🏁 全部阶段完成！')
  }
}

function cmdStatus(designDir, args) {
  const state = loadState(designDir)
  if (!state) {
    console.log('未初始化。使用 "init" 开始。')
    return
  }
  printStatus(state)
}

function cmdGates(designDir, args) {
  const state = loadState(designDir)
  if (!state) {
    console.error('未初始化')
    process.exit(1)
  }

  const phaseId = args[0] || state.phases[state.currentPhase]?.id
  const phase = state.phases.find(p => p.id === phaseId)
  if (!phase) {
    console.error(`未找到阶段: ${phaseId}`)
    process.exit(1)
  }

  console.log(`\n门禁: ${phase.title}`)
  for (const gate of phase.gates) {
    const result = verifyGate(gate, designDir)
    console.log(`  [${result.pass ? 'PASS' : 'FAIL'}] ${gate.desc}`)
  }
}

function cmdRollback(designDir, args) {
  const phaseId = args[0]
  const state = loadState(designDir)
  if (!state) {
    console.error('未初始化')
    process.exit(1)
  }

  const idx = state.phases.findIndex(p => p.id === phaseId)
  if (idx < 0) {
    console.error(`未找到阶段: ${phaseId}`)
    process.exit(1)
  }

  for (let i = idx; i < state.phases.length; i++) {
    state.phases[i].status = i === idx ? 'active' : 'pending'
    state.phases[i].completedAt = null
  }
  state.currentPhase = idx
  saveState(designDir, state)
  console.log(`✓ 回退到: ${state.phases[idx].title}`)
  printPhaseGuidance(state, idx)
}

function cmdSkip(designDir, args) {
  const phaseId = args[0]
  const reasonIdx = args.indexOf('--reason')
  const reason = reasonIdx >= 0 ? args[reasonIdx + 1] : '手动跳过'

  const state = loadState(designDir)
  if (!state) {
    console.error('未初始化')
    process.exit(1)
  }

  const currentPhase = state.phases[state.currentPhase]
  if (!currentPhase || currentPhase.id !== phaseId) {
    console.error(`当前活跃阶段为: ${currentPhase?.id || '(无)'}，不能跳过 ${phaseId}`)
    process.exit(1)
  }

  currentPhase.status = 'skipped'
  currentPhase.notes.push(`SKIPPED: ${reason}`)
  currentPhase.completedAt = new Date().toISOString()

  state.currentPhase++
  if (state.currentPhase < state.phases.length) {
    state.phases[state.currentPhase].status = 'active'
  }

  saveState(designDir, state)
  console.log(`✓ 跳过: ${currentPhase.title} · 理由: ${reason}`)
}

// ── Output Helpers ──

function printStatus(state) {
  console.log(`\n场景: ${state.scenario} · 开始于: ${state.startedAt}`)
  console.log('─'.repeat(50))
  for (const phase of state.phases) {
    const icon = phase.status === 'completed' ? '✓' : phase.status === 'active' ? '▶' : phase.status === 'skipped' ? '⏭' : '○'
    const completed = phase.completedAt ? ` · ${phase.completedAt}` : ''
    console.log(`  ${icon} ${phase.title} [${phase.status}]${completed}`)
  }
  console.log('─'.repeat(50))
}

function printPhaseGuidance(state, idx) {
  const phase = state.phases[idx]
  console.log(`\n── ${phase.title} ──`)
  console.log(phase.description)
  console.log('\n门禁:')
  for (const gate of phase.gates) {
    console.log(`  ☐ ${gate.desc}`)
  }
  console.log('\n必须读取:')
  for (const ref of phase.requiredReads) {
    console.log(`  • ${ref}`)
  }
  console.log('\n预期产出:')
  for (const out of phase.outputs) {
    console.log(`  → ${out}`)
  }
  if (phase.skipAllowed) {
    console.log('\n⚠ 此阶段可跳过，但跳过可能影响最终质量')
  }
  console.log('')
}

// ── Entry ──

function main() {
  const args = process.argv.slice(2).filter(Boolean)
  if (args.length < 2) {
    console.log('Usage: node scripts/flow.js <design-dir> <command> [options]')
    console.log('\nCommands:')
    console.log('  init          --scenario <single-page|multi-page>  初始化流程')
    console.log('  next          [--pretty]                           获取当前阶段指引')
    console.log('  complete <id> [--note <备注>]                      完成阶段（自动门禁校验）')
    console.log('  status        [--pretty]                           查看进度')
    console.log('  gates <id>                                         列出阶段门禁')
    console.log('  rollback <id>                                      回退到阶段')
    console.log('  skip <id>     --reason <理由>                      跳过阶段')
    process.exit(0)
  }

  const designDir = args[0]
  const command = args[1]
  const rest = args.slice(2)

  switch (command) {
    case 'init': return cmdInit(designDir, rest)
    case 'next': return cmdNext(designDir, rest)
    case 'complete': return cmdComplete(designDir, rest)
    case 'status': return cmdStatus(designDir, rest)
    case 'gates': return cmdGates(designDir, rest)
    case 'rollback': return cmdRollback(designDir, rest)
    case 'skip': return cmdSkip(designDir, rest)
    default:
      console.error(`Unknown command: ${command}`)
      process.exit(1)
  }
}

main()
