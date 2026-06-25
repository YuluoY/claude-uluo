#!/usr/bin/env node
// ─────────────────────────────────────────────────────────
// uluo-change-flow 变更管理工作流校验工具
//
// 校验管线:
//   Step 1: 目录结构（spec.md / plan.md / tasks.md / checklist.md 是否存在）
//   Step 2: L1 spec 校验（变更背景/影响范围/决策结论/边界检查）
//   Step 3: L2 plan 校验（Delta 规格/字段完整性/边界检查）
//   Step 4: L3 tasks 校验（任务字段/动词开头/调研标注/边界检查）
//   Step 5: checklist 校验（四个分组/检查点格式/结论一致性）
//   Step 6: 同步一致性校验（spec→plan→tasks→checklist 对齐）
//   Step 7: change-record 校验（归档文档完整性，如存在）
//
// 用法:
//   node validate-change.js <specs/feature/changes/CHG-NNN>
//   node validate-change.js <specs/feature/changes/CHG-NNN> --strict
//
// 环境变量:
//   PROJECT_ROOT  项目根目录路径（用于 Step 6 代码对齐校验，检查 tasks.md 中
//                 目标文件是否存在）。未设置时默认使用 process.cwd()。
//                 示例: PROJECT_ROOT=/path/to/project node validate-change.js specs/...
// ─────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const {
  reset, pass, fail, warn, section, summary,
  fileExists,
} = require('./lib/utils');

// Check modules
const checks = {
  'spec':         require('./checks/change-spec'),
  'plan':         require('./checks/change-plan'),
  'tasks':        require('./checks/change-tasks'),
  'checklist':    require('./checks/change-checklist'),
  'sync':         require('./checks/sync-consistency'),
  'record':       require('./checks/change-record'),
};

// ── Parse args ────────────────────────────────────────────

let strict = false;
let target = null;

for (const arg of process.argv.slice(2)) {
  if (arg === '--strict')   strict = true;
  else if (!target)         target = arg;
}

if (!target) {
  console.log('用法: node validate-change.js <specs/feature/changes/CHG-NNN> [--strict]');
  process.exit(1);
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`错误: 目录不存在: ${target}`);
  process.exit(1);
}

const changeDir = path.resolve(target);
const changeName = path.basename(changeDir);

console.log(`\n\x1b[1m校验变更: \x1b[36m${changeName}\x1b[0m`);
console.log('─────────────────────────────────────────');

const ok = runChecks(changeDir, strict);
process.exit(ok ? 0 : 1);

// ═══════════════════════════════════════════════════════════
// Pipeline
// ═══════════════════════════════════════════════════════════

function runChecks(changeDir, strict) {
  reset();

  // ── Step 1: 目录结构 ──────────────────────────────────────
  section('Step 1/7: 目录结构 — 四份文档存在性');
  const structOk = checkStructure(changeDir);
  if (!structOk) {
    // 缺少关键文件，后续校验无法进行
    summary();
    return false;
  }

  // ── Step 2: L1 spec 校验 ──────────────────────────────────
  section('Step 2/7: L1 spec 校验 — 变更背景/影响范围/决策结论');
  console.log(`\n  ── spec.md ──`);
  emitFindings(checks.spec.check(path.join(changeDir, 'spec.md')));

  // ── Step 3: L2 plan 校验 ──────────────────────────────────
  section('Step 3/7: L2 plan 校验 — Delta 规格/字段完整性');
  console.log(`\n  ── plan.md ──`);
  emitFindings(checks.plan.check(path.join(changeDir, 'plan.md')));

  // ── Step 4: L3 tasks 校验 ─────────────────────────────────
  section('Step 4/7: L3 tasks 校验 — 任务字段/动词开头/调研标注');
  console.log(`\n  ── tasks.md ──`);
  emitFindings(checks.tasks.check(path.join(changeDir, 'tasks.md')));

  // ── Step 5: checklist 校验 ────────────────────────────────
  section('Step 5/7: checklist 校验 — 四个分组/检查点格式/结论一致性');
  console.log(`\n  ── checklist.md ──`);
  emitFindings(checks.checklist.check(path.join(changeDir, 'checklist.md')));

  // ── Step 6: 同步一致性校验 ────────────────────────────────
  section('Step 6/7: 同步一致性 — spec→plan→tasks→checklist 对齐');
  emitFindings(checks.sync.check(changeDir));

  // ── Step 7: change-record 校验（如存在）────────────────────
  const recordPath = path.join(changeDir, 'change-record.md');
  if (fs.existsSync(recordPath)) {
    section('Step 7/7: change-record 校验 — 归档文档完整性');
    console.log(`\n  ── change-record.md ──`);
    emitFindings(checks.record.check(recordPath));
  } else {
    section('Step 7/7: change-record 校验 — 跳过（未找到 change-record.md）');
    warn('未找到 change-record.md——变更归档时需创建此文档');
  }

  // ── strict 模式：警告视为失败 ──────────────────────────────
  if (strict) {
    console.log(`\n  ${'\x1b[1m'}[strict 模式] 警告将视为失败${'\x1b[0m'}`);
  }

  return summary();
}

// ═══════════════════════════════════════════════════════════
// Step 1: 目录结构
// ═══════════════════════════════════════════════════════════

function checkStructure(dir) {
  let allExist = true;

  // 必须存在的四份文档
  const required = ['spec.md', 'plan.md', 'tasks.md', 'checklist.md'];
  for (const f of required) {
    if (fileExists(dir, f)) {
      pass(`${f}`);
    } else {
      fail(`缺少 ${f}`);
      allExist = false;
    }
  }

  return allExist;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function emitFindings(findings) {
  for (const f of findings) {
    if (f.type === 'pass') pass(f.msg);
    else if (f.type === 'fail') fail(f.msg);
    else if (f.type === 'warn') warn(f.msg);
  }
}
