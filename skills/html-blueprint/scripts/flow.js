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

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = '.blueprint-state.json'

// ── Workflow Config ──

const SINGLE_PAGE_PHASES = [
  {
    id: 'phase0',
    title: 'Phase 0: 加载并使用远程设计知识',
    description: '加载 ui-ux-pro-max + design-taste-frontend + styleseed-design-review，获取设计系统参数，执行品味审查',
    boundary: {
      only: '加载 3 个远程 skill、搜索设计参数、审查品牌方向',
      not: '不生成任何文件（除 taste-review.md）',
      actions: [
        '1. node scripts/_shared/load.js --all',
        '2. 有品牌倾向（Vercel/Linear/Apple 等）？→ 读取 .agents/skills/styleseed-design-review/SKILL.md 的 74 条设计规则',
        '3. python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<产品> <行业> <风格>" --design-system -p "<项目>" -f markdown',
        '4. python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<产品>" --domain color',
        '5. python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<产品>" --domain typography',
        '6. python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<关键词>" --domain ux',
        '7. 读取 .agents/skills/design-taste-frontend/SKILL.md，逐条审查配色/层次/动效',
        '8. 审查结论写入 design/taste-review.md',
      ],
    },
    gates: [
      { id: 'remote-skills', type: 'script', desc: '3 个远程 skill 已安装', check: 'load-verify' },
    ],
    requiredReads: [
      'references/remote-skills.md',
    ],
    outputs: ['design/taste-review.md（品味审查结论）'],
  },
  {
    id: 'phase1-tokens',
    title: 'Phase 1a: tokens（完整面板 + 展示页）',
    description: '生成 tokens/tokens.css（13 维）和 tokens/tokens.html（6 个 @token-section）',
    boundary: {
      only: '生成 tokens/ 目录下的 tokens.css + tokens.html',
      not: '不生成组件、不生成页面、不生成布局',
    },
    gates: [
      { id: 'tokens-css-exists', type: 'file-exists', path: 'tokens/tokens.css', desc: 'tokens/tokens.css 存在' },
      { id: 'tokens-valid', type: 'script', desc: '13 维 HARD token 全部存在', command: 'node scripts/checks/design-tokens.js' },
      { id: 'tokens-showcase', type: 'script', desc: 'tokens/tokens.html 6 个 @token-section 标记', check: 'tokens-showcase' },
    ],
    requiredReads: [
      'references/tokens-checklist.md',
    ],
    outputs: ['design/tokens/tokens.css', 'design/tokens/tokens.html'],
  },
  {
    id: 'phase1-components',
    title: 'Phase 1b: 6 个类别组件 HTML + registry',
    description: '生成 6 个类别文件（general.html / data-entry.html / data-display.html / feedback.html / navigation.html / layout.html），每类含该类全部组件展示（Anatomy/Variants/States/Sizes），全部注册到 component-registry.json',
    boundary: {
      only: '生成 6 个类别 HTML + 更新 component-registry.json',
      not: '不修改 tokens/ 下的文件、不生成页面、不生成布局',
    },
    gates: [
      { id: 'atomics-6-files', type: 'script', desc: '6 个类别文件全部存在', check: 'atomics-6-files' },
      { id: 'registry-valid', type: 'script', desc: 'registry 覆盖所有 data-component', command: 'node scripts/checks/component-registry.js' },
    ],
    requiredReads: [
      'references/atomic-components-checklist.md',
      'references/component-registry.md',
    ],
    outputs: [
      'design/components/general.html',
      'design/components/data-entry.html',
      'design/components/data-display.html',
      'design/components/feedback.html',
      'design/components/navigation.html',
      'design/components/layout.html',
      'design/component-registry.json',
    ],
  },
  {
    id: 'phase2-layout',
    title: 'Phase 2a: 骨架布局（固定骨架）',
    description: '生成固定的骨架布局到 layout/（导航+侧边栏+容器+页脚，<!-- @slot content -->），所有页面共用同一个骨架',
    boundary: {
      only: '生成 design/layout/ 固定骨架 + design/blocks/ 页面区块。sidebar 导航链接必须使用真实路径（如 href="../pages/dashboard.html"），禁止 href="#"',
      not: '不修改 tokens/、components/ 下的文件、不生成路由页面、不修改骨架的导航结构',
      actions: [
        '1. 生成 layout/nav-structure.json — 导航结构的唯一声明文件，列出所有 sections/items 和 href',
        '2. 生成 layout/main-layout.html — 包含完整的 app-shell 骨架：.app-shell > .sidebar + .main-area > .header + .page-content，sidebar 与 nav-structure.json 一致',
        '3. 生成 layout/layout.css — 共享骨架 CSS（sidebar、header、content-area、stat-card、content-card、charts-row、page-header、.btn 等）',
        '4. 所有 sidebar__link 的 href 必须是真实页面路径（如 href="../pages/dashboard.html"），禁止使用 href="#"',
        '5. 导航中出现的页面必须在 pages/ 下有对应 HTML 文件，不存在的页面不允许出现在导航中',
      ],
    },
    gates: [
      { id: 'layout-exists', type: 'dir-has-files', path: 'layout', desc: 'design/layout/ 包含 HTML 文件' },
      { id: 'blocks-exists', type: 'dir-has-files', path: 'blocks', desc: 'design/blocks/ 包含 HTML 文件（如适用）' },
    ],
    requiredReads: ['references/design-dimensions.md'],
    outputs: ['design/layout/*.html', 'design/blocks/*.html'],
  },
  {
    id: 'phase2-pages',
    title: 'Phase 2b: 路由页面（引用骨架）',
    description: '逐页生成路由页面到 design/pages/，每页通过 <!-- @layout ../layout/main-layout.html --> 引用同一骨架，从 registry 查表复用组件',
    boundary: {
      only: '生成 design/pages/ 路由页面 + 更新 registry.businessComponents。每个页面必须嵌入完整 app-shell 结构（.app-shell/.sidebar/.main-area），sidebar 链接使用同级路径（如 href="dashboard.html"）',
      not: '不修改 tokens/、components/ 下的文件、layout/ 骨架（不修改导航栏、侧边栏等全局元素）。页面中的 CSS 禁止重复 layout.css 已有的共享样式（.stat-card、.content-card、.btn 等）。禁止自行增删 sidebar 导航项',
      actions: [
        '1. 读取 design/layout/main-layout.html 了解骨架结构，然后为每个页面嵌入 app-shell（sidebar + header 直接复制进来）',
        '2. 读取 design/layout/nav-structure.json，精确复制其导航结构到每个页面，禁止自行增删 nav item',
        '3. sidebar__link 的 href 使用同级目录路径（如 href="dashboard.html"），当前页面标记 sidebar__link--active',
        '4. 页面 CSS 只写本页唯一的 BEM 样式（如 dashboard__* / settings-* / filter-bar 等），不从 layout.css 已有的 .btn、.stat-card、.content-card 等复制',
        '5. 从 component-registry.json 查表复用已有组件，避免重复定义',
        '6. 所有 sidebar href 目标文件必须存在，不存在的页面不要出现在导航中',
      ],
    },
    requiredReads: [
      'references/component-registry.md',
      'references/css-conventions.md',
      'references/navigation-protocol.md',
    ],
    gates: [
      { id: 'pages-linked', type: 'script', desc: '@layout + tokens.css 引用正确', command: 'node scripts/checks/design-structure.js' },
      { id: 'registry-coverage', type: 'script', desc: 'data-component 在 registry + 跨页一致', command: 'node scripts/checks/component-registry.js' },
    ],
    requiredReads: [
      'references/component-registry.md',
      'references/css-conventions.md',
    ],
    outputs: ['design/pages/*.html'],
  },
  {
    id: 'phase3',
    title: 'Phase 3: index.html + 全量门禁',
    description: '生成 index.html 总入口，运行 12 项全量门禁，HARD=0 方可交付',
    boundary: {
      only: '生成 index.html + 运行全部门禁',
      not: '不修改任何 Phase 0-2 的产出（除非门禁 fail 回退修复）',
    },
    gates: [
      { id: 'index-exists', type: 'file-exists', path: 'index.html', desc: 'index.html 存在' },
      { id: 'all-gates-pass', type: 'script', desc: 'validate.js 12 项 HARD=0', command: 'node scripts/validate.js' },
    ],
    requiredReads: ['references/constraint-tiers.md'],
    outputs: ['design/index.html（设计系统站点完成）'],
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
      const allInstalled = output.includes('ui-ux-pro-max') && output.includes('design-taste-frontend') && output.includes('styleseed-design-review')
      return { pass: allInstalled, reason: allInstalled ? '3 个远程 skill 已安装' : '远程 skill 未完全加载，请运行: node scripts/_shared/load.js --all' }
    }
    if (gate.check === 'tokens-showcase') {
      const tokensFile = join(designDir, 'tokens', 'tokens.html')
      if (!existsSync(tokensFile)) return { pass: false, reason: 'design/tokens/tokens.html 不存在' }
      const content = readFileSync(tokensFile, 'utf-8')
      const required = ['colors', 'typography', 'spacing', 'radius', 'shadow', 'motion']
      const missing = required.filter(s => !content.includes(`@token-section: ${s}`))
      if (missing.length === 0) {
        return { pass: true, reason: '6 个 @token-section 标记全部存在' }
      }
      return { pass: false, reason: `缺 ${missing.length}/6 个 @token-section: ${missing.join(', ')}` }
    }
    if (gate.check === 'atomics-6-files') {
      const compDir = join(designDir, 'components')
      const required = ['general.html', 'data-entry.html', 'data-display.html', 'feedback.html', 'navigation.html', 'layout.html']
      const missing = required.filter(f => !existsSync(join(compDir, f)))
      if (missing.length === 0) {
        return { pass: true, reason: '6 个类别组件文件全部存在' }
      }
      return { pass: false, reason: `缺 ${missing.length}/6 个类别文件: components/${missing.join(', components/')}` }
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
  if (phase.boundary) {
    console.log('\n⚡ 此 Phase 只做:')
    console.log(`  ${phase.boundary.only}`)
    console.log('🚫 此 Phase 禁止:')
    console.log(`  ${phase.boundary.not}`)
    if (phase.boundary.actions) {
      console.log('\n必须执行的动作:')
      for (const action of phase.boundary.actions) {
        console.log(`  ${action}`)
      }
    }
  }
  console.log('\n门禁 (complete 时自动校验):')
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
