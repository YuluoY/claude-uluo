#!/usr/bin/env node
// ─────────────────────────────────────────────────────────
// uluo-spec-driven 文档规范校验工具
//
// 校验管线:
//   Step 1: 目录结构（文件/目录是否存在）
//   Step 2: 文档类型专项校验（spec / plan / tasks / research-report /
//            verification-report / retrospective 各有专门规则）
//   Step 3: Markdown 格式（代码块语言、纯MD、ISO日期）
//   Step 4: 交叉引用（内部链接是否有效）
//   Step 5: CHANGELOG 专项校验
//
// 用法:
//   node validate.js <specs/feature-dir>
//   node validate.js <specs/feature-dir> --strict
//   node validate.js --ci <project-root>   // 递归扫描 specs/，自动跳过设计文档
// ─────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, collectMdFiles, findFeatureDirs, hasHeading,
} = require('./lib/utils');

// Check modules for each document type
const checks = {
  'spec':                  require('./checks/spec'),
  'plan':                  require('./checks/plan'),
  'tasks':                 require('./checks/tasks'),
  'research-report':       require('./checks/research-report'),
  'verification-report':   require('./checks/verification-report'),
  'retrospective':         require('./checks/retrospective'),
  'changelog':             require('./checks/changelog'),
};

// ── Parse args ────────────────────────────────────────────

let strict = false;
let ciMode = false;
let target = null;

for (const arg of process.argv.slice(2)) {
  if (arg === '--strict')        strict = true;
  else if (arg === '--ci')       ciMode = true;
  else if (!target)              target = arg;
}

if (!target) {
  console.log('用法: node validate.js <specs/feature-dir> [--strict]');
  console.log('      node validate.js --ci <project-root>');
  process.exit(1);
}

const projectRoot = process.env.PROJECT_ROOT || process.cwd();

// ── CI mode ────────────────────────────────────────────────

if (ciMode) {
  const specsDir = path.join(target, 'specs');
  console.log(`CI 模式：递归扫描 ${specsDir}`);

  if (!fs.existsSync(specsDir) || !fs.statSync(specsDir).isDirectory()) {
    console.log('未找到 specs/ 目录，跳过校验。');
    process.exit(0);
  }

  // 递归定位所有含 spec.md 的特性目录（自动跳过设计文档目录与单文件）
  const featureDirs = findFeatureDirs(specsDir);

  if (featureDirs.length === 0) {
    console.log('未找到特性目录（含 spec.md 的目录），跳过校验。');
    process.exit(0);
  }

  let overallPass = 0, overallFail = 0;
  for (const dir of featureDirs) {
    const relPath = path.relative(specsDir, dir);
    console.log(`\n─────────────────────────────────────────`);
    console.log(`\x1b[1m校验 specs/${relPath}/\x1b[0m`);
    console.log(`─────────────────────────────────────────`);
    runChecks(dir, strict) ? overallPass++ : overallFail++;
  }

  console.log(`\n\x1b[1m全局汇总:\x1b[0m \x1b[32m${overallPass} 通过\x1b[0m \x1b[31m${overallFail} 失败\x1b[0m`);
  process.exit(overallFail > 0 ? 1 : 0);
}

// ── Single feature ─────────────────────────────────────────

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`错误: 目录不存在: ${target}`);
  process.exit(1);
}

const featureDir = path.resolve(target);
const featureName = path.basename(featureDir);

console.log(`\n\x1b[1m校验特性: \x1b[36m${featureName}\x1b[0m`);
console.log('─────────────────────────────────────────');

const ok = runChecks(featureDir, strict);
process.exit(ok ? 0 : 1);

// ═══════════════════════════════════════════════════════════
// Pipeline
// ═══════════════════════════════════════════════════════════

function runChecks(featureDir, strict) {
  reset();
  let variant;

  // ── Step 1: 目录结构 ──────────────────────────────────────
  section('Step 1/5: 目录结构 — 文件/目录存在性');
  variant = checkStructure(featureDir);
  if (!variant) {
    // Can't proceed without knowing the variant
    summary();
    return false;
  }

  // ── Step 2: 文档类型专项校验 ──────────────────────────────
  section('Step 2/5: 按文档类型专项校验 — 每种文档的特有约束');
  checkDocumentTypes(featureDir, variant);

  // ── Step 3: Markdown 格式 ──────────────────────────────────
  section('Step 3/5: Markdown 格式 — 代码块语言/纯MD/ISO日期');
  checkMarkdownFormat(featureDir);

  // ── Step 4: 交叉引用 ────────────────────────────────────────
  section('Step 4/5: 交叉引用 — 内部链接有效性');
  checkLinks(featureDir);

  // ── Step 5: CHANGELOG 专项校验 ───────────────────────────────
  section('Step 5/5: CHANGELOG 专项 — Keep a Changelog 规范');
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    emitFindings(checks.changelog.check(changelogPath));
  } else {
    warn('项目根未找到 CHANGELOG.md');
  }

  return summary();
}

// ═══════════════════════════════════════════════════════════
// Step 1: 目录结构
// ═══════════════════════════════════════════════════════════

function checkStructure(dir) {
  let variant = null;

  if (dirExists(dir, 'plans') && dirExists(dir, 'tasks')) {
    variant = 'standard';
    console.log('  方案: 标准（plans/ + tasks/ 目录）');
  } else if (dirExists(dir, 'plans')) {
    variant = 'tech-review';
    console.log('  方案: 技术评审（plans/ 目录，无 tasks/）');
  } else if (fileExists(dir, 'spec.md') && fileExists(dir, 'tasks.md')) {
    variant = 'bug-fix';
    console.log('  方案: Bug修复（spec.md + tasks.md，无 plan）');
  } else if (fileExists(dir, 'plan.md')) {
    variant = 'simplified';
    console.log('  方案: 简化（plan.md 单文件）');
  } else {
    fail('无法识别方案类型——既没有 plans/ 目录也没有 plan.md 文件');
    return null;
  }

  // spec.md
  fileExists(dir, 'spec.md') ? pass('spec.md') : fail('缺少 spec.md');

  if (variant === 'standard') {
    fileExists(dir, 'plans/README.md') ? pass('plans/README.md') : fail('缺少 plans/README.md');

    const tasksDir = path.join(dir, 'tasks');
    let phaseCount = 0;
    if (fs.existsSync(tasksDir)) {
      phaseCount = fs.readdirSync(tasksDir).filter(f => /^phase\d/.test(f)).length;
    }
    phaseCount >= 2 ? pass(`tasks/ 含 ${phaseCount} 个 phase 文件`)
      : fail(`tasks/ phase 文件不足（${phaseCount}/2）——标准方案要求 ≥2 个`);

  } else if (variant === 'tech-review') {
    fileExists(dir, 'plans/README.md') ? pass('plans/README.md') : fail('缺少 plans/README.md');
    // Tech review doesn't need tasks/

  } else if (variant === 'bug-fix') {
    // Bug fix: spec.md + tasks.md only, no plan needed
    fileExists(dir, 'tasks.md') ? pass('tasks.md') : fail('缺少 tasks.md');

  } else {
    fileExists(dir, 'plan.md') ? pass('plan.md') : fail('缺少 plan.md');
    fileExists(dir, 'tasks.md') ? pass('tasks.md') : fail('缺少 tasks.md');
  }

  // Optional files
  fileExists(dir, 'research-report.md') ? pass('research-report.md') : warn('未找到 research-report.md');
  fileExists(dir, 'verification-report.md') ? pass('verification-report.md') : warn('未找到 verification-report.md');
  fileExists(dir, 'retrospective.md') ? pass('retrospective.md') : warn('未找到 retrospective.md');

  return variant;
}

// ═══════════════════════════════════════════════════════════
// Step 2: 文档类型专项校验（使用 checks/ 模块）
// ═══════════════════════════════════════════════════════════

function checkDocumentTypes(dir, variant) {
  // spec.md
  if (fileExists(dir, 'spec.md')) {
    console.log(`\n  ── spec.md ──`);
    emitFindings(checks.spec.check(path.join(dir, 'spec.md')));
  }

  // plan (skip for bug-fix variant)
  let planPath;
  if (variant === 'bug-fix') {
    planPath = null; // Bug fix doesn't need plan
  } else if (variant === 'tech-review' || variant === 'standard') {
    planPath = path.join(dir, 'plans/README.md');
  } else {
    planPath = path.join(dir, 'plan.md');
  }
  if (planPath && fs.existsSync(planPath)) {
    console.log(`\n  ── plan ──`);
    emitFindings(checks.plan.check(planPath));
  }

  // tasks
  if ((variant === 'standard' || variant === 'tech-review') && dirExists(dir, 'tasks')) {
    const tasksDir = path.join(dir, 'tasks');
    const phaseFiles = fs.readdirSync(tasksDir)
      .filter(f => /^phase\d/.test(f))
      .sort();
    for (const pf of phaseFiles) {
      console.log(`\n  ── tasks/${pf} ──`);
      emitFindings(checks.tasks.check(path.join(tasksDir, pf)));
    }
  } else if (fileExists(dir, 'tasks.md')) {
    console.log(`\n  ── tasks.md ──`);
    emitFindings(checks.tasks.check(path.join(dir, 'tasks.md')));
  }

  // research-report (optional)
  if (fileExists(dir, 'research-report.md')) {
    console.log(`\n  ── research-report.md ──`);
    emitFindings(checks['research-report'].check(path.join(dir, 'research-report.md')));
  }

  // verification-report (optional)
  if (fileExists(dir, 'verification-report.md')) {
    console.log(`\n  ── verification-report.md ──`);
    emitFindings(checks['verification-report'].check(path.join(dir, 'verification-report.md')));
  }

  // retrospective (optional)
  if (fileExists(dir, 'retrospective.md')) {
    console.log(`\n  ── retrospective.md ──`);
    emitFindings(checks.retrospective.check(path.join(dir, 'retrospective.md')));
  }
}

// ═══════════════════════════════════════════════════════════
// Step 3: Markdown 格式
// ═══════════════════════════════════════════════════════════

function checkMarkdownFormat(dir) {
  const files = collectMdFiles(dir);

  for (const file of files) {
    const fname = path.relative(dir, file);
    let content;
    try { content = fs.readFileSync(file, 'utf-8'); }
    catch { continue; }

    const lines = content.split('\n');

    // 3a. Code blocks must have language on opening fence
    const bareFences = [];
    let inCodeBlock = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^```\s*$/.test(lines[i])) {
        // Bare ``` — is it closing a labeled block or opening a bare one?
        if (inCodeBlock) {
          inCodeBlock = false; // closing fence, OK
        } else {
          bareFences.push(i + 1); // opening fence without language
        }
      } else if (/^```\S+/.test(lines[i])) {
        inCodeBlock = !inCodeBlock; // toggle on labeled fence
      }
    }
    bareFences.length === 0
      ? pass(`${fname}: 代码块均有语言标注`)
      : bareFences.slice(0, 3).forEach(l => fail(`${fname}:${l}: 代码块缺少语言标注`));

    // 3b. No HTML
    /<(div|span|table|br|hr|img|font|style|script)\b/i.test(content)
      ? fail(`${fname}: 包含 HTML 标签——规范要求纯 Markdown`)
      : pass(`${fname}: 纯 Markdown，无 HTML`);

    // 3c. ISO 8601 dates
    const nonIso = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/\b(\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\b/g);
      if (m) {
        for (const d of m) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d.replace(/[/.]/g, '-'))) {
            nonIso.push({ line: i + 1, date: d });
          }
        }
      }
    }
    nonIso.length === 0
      ? pass(`${fname}: 日期均为 ISO 8601 格式`)
      : nonIso.slice(0, 3).forEach(d => warn(`${fname}:${d.line}: 日期非 ISO 8601 '${d.date}'`));
  }
}

// ═══════════════════════════════════════════════════════════
// Step 4: 交叉引用
// ═══════════════════════════════════════════════════════════

function checkLinks(dir) {
  const files = collectMdFiles(dir);

  for (const file of files) {
    const fname = path.relative(dir, file);
    const baseDir = path.dirname(file);
    let broken = 0;
    let content;
    try { content = fs.readFileSync(file, 'utf-8'); }
    catch { continue; }

    const linkRe = /\]\(([^)]+\.md)(?:[)#][^)]*)?\)/g;
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      let link = m[1];
      if (/^https?:\/\//.test(link)) continue;
      if (/[<>]/.test(link)) continue; // template placeholder

      const resolved = path.resolve(baseDir, link);
      if (!fs.existsSync(resolved)) {
        fail(`${fname}: 断链 → ${link}`);
        broken++;
      }
    }

    if (broken === 0) pass(`${fname}: 全部内部链接有效`);
  }
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
