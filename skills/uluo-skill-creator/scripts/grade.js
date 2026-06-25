#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const { readFile, fileExists, listDir, parseFrontmatter, countLines } = require('./_shared/utils');
const structureCheck = require('./checks/structure');

const CANONICAL_DIRS = ['references', 'scripts', 'agents', 'evals', 'examples', 'assets'];

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

/**
 * 检测 skill 复杂度——基于 scripts/ 目录是否存在区分完整流程 skill 与简单/中等 skill
 * 完整流程 skill（有 scripts/）：适用严格评分标准（Phase/mermaid/loop/闸门/scripts/__tests__）
 * 简单/中等 skill（无 scripts/）：适用宽松评分标准（流程描述/禁止事项/可选加分项）
 * @param {string} skillPath skill 根目录
 * @returns {boolean} true=完整流程 skill, false=简单/中等 skill
 */
function isFullSkill(skillPath) {
  const scriptsDir = path.join(skillPath, 'scripts');
  return fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory();
}

/**
 * 递归收集目录下所有文件（跳过 __tests__ 和 node_modules）
 * @param {string} dir 起始目录
 * @returns {string[]} 文件绝对路径数组
 */
function walkFiles(dir) {
  const acc = [];
  const entries = listDir(dir);
  for (const entry of entries) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      acc.push(...walkFiles(full));
    } else if (stat.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * 根据总分计算等级
 * @param {number} score 总分
 * @returns {{ grade: string, exitCode: number }}
 */
function calcGrade(score) {
  if (score >= 90) return { grade: 'A', exitCode: 0 };
  if (score >= 70) return { grade: 'B', exitCode: 0 };
  if (score >= 50) return { grade: 'C', exitCode: 1 };
  return { grade: 'D', exitCode: 1 };
}

/**
 * 生成进度条（20 格）
 * @param {number} score 得分
 * @param {number} max 满分
 * @returns {string}
 */
function progressBar(score, max) {
  const filled = Math.round((score / max) * 20);
  return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + ']';
}

// ─────────────────────────────────────────────────────────
// 维度 1：结构合规（20 分）
// ─────────────────────────────────────────────────────────

function gradeStructure(skillPath) {
  const deductions = [];
  let score = 20;

  // 复用 structure.js 校验结果
  const result = structureCheck.check(skillPath);

  // 子项 1: SKILL.md 存在（8 分）
  const skillmdError = result.errors.find((e) => e.file === 'SKILL.md');
  if (skillmdError) {
    score -= 8;
    deductions.push({ item: 'SKILL.md 存在', deduction: -8, reason: skillmdError.message });
  }

  // 子项 2: 目录命名规范（6 分）—— 小写 + 连字符
  let namingOk = true;
  for (const entry of listDir(skillPath)) {
    const fullPath = path.join(skillPath, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    if (entry.startsWith('.') || entry === '__tests__') continue;
    if (!/^[a-z][a-z0-9-]*$/.test(entry)) {
      namingOk = false;
      break;
    }
  }
  if (!namingOk) {
    score -= 6;
    deductions.push({
      item: '目录命名规范',
      deduction: -6,
      reason: '存在不符合小写+连字符命名规范的目录',
    });
  }

  // 子项 3: 无非规范目录（6 分）
  const nonCanonical = result.warnings.filter((w) => w.rule === 'non-canonical-dir');
  if (nonCanonical.length > 0) {
    score -= 6;
    deductions.push({
      item: '无非规范目录',
      deduction: -6,
      reason: nonCanonical.map((w) => w.message).join('; '),
    });
  }

  return { score: Math.max(0, score), max: 20, deductions };
}

// ─────────────────────────────────────────────────────────
// 维度 2：流程编排（20 分）
// ─────────────────────────────────────────────────────────

function gradeWorkflow(skillPath, fullSkill) {
  const deductions = [];
  let score = 20;

  const content = readFile(path.join(skillPath, 'SKILL.md')) || '';

  if (fullSkill) {
    // 完整流程 skill：严格标准（Phase/mermaid/loop/闸门各 5 分）

    // 子项 1: Phase 模型或流程编排（5 分）
    if (!/Phase|流程/.test(content)) {
      score -= 5;
      deductions.push({
        item: 'Phase 模型',
        deduction: -5,
        reason: 'SKILL.md 未包含 Phase 模型或流程编排描述',
      });
    }

    // 子项 2: mermaid flowchart（5 分）
    if (!/```mermaid/.test(content)) {
      score -= 5;
      deductions.push({
        item: 'mermaid flowchart',
        deduction: -5,
        reason: 'SKILL.md 未使用 mermaid flowchart 表达流程',
      });
    }

    // 子项 3: 内部 loop 机制（5 分）
    if (!/loop|回退|闭环|retry|重试/.test(content)) {
      score -= 5;
      deductions.push({
        item: '内部 loop 机制',
        deduction: -5,
        reason: 'SKILL.md 未描述回退/loop 闭环机制',
      });
    }

    // 子项 4: 质量闸门（5 分）
    if (!/校验|闸门|gate|质量门/.test(content)) {
      score -= 5;
      deductions.push({
        item: '质量闸门',
        deduction: -5,
        reason: 'SKILL.md 未明确质量闸门/校验点',
      });
    }
  } else {
    // 简单/中等 skill：宽松标准（流程描述 10 分 + mermaid/loop 可选加分各 5 分）

    // 子项 1: 流程描述或使用说明（10 分）——SKILL.md 含"怎么做"/"使用"/"流程"
    if (!/怎么做|使用|流程|步骤/.test(content)) {
      score -= 10;
      deductions.push({
        item: '流程描述',
        deduction: -10,
        reason: 'SKILL.md 未包含流程描述或使用说明（怎么做/使用/流程/步骤）',
      });
    }

    // 子项 2: mermaid flowchart（5 分）——可选加分项，有则加分，无不扣分
    // 无需扣分逻辑

    // 子项 3: 内部 loop 机制（5 分）——可选加分项，有则加分，无不扣分
    // 无需扣分逻辑

    // 子项 4: 质量闸门（5 分）——可选加分项，有则加分，无不扣分
    // 无需扣分逻辑
  }

  return { score: Math.max(0, score), max: 20, deductions };
}

// ─────────────────────────────────────────────────────────
// 维度 3：约束分工（20 分）
// ─────────────────────────────────────────────────────────

function gradeConstraint(skillPath, fullSkill) {
  const deductions = [];
  let score = 20;

  const content = readFile(path.join(skillPath, 'SKILL.md')) || '';

  if (fullSkill) {
    // 完整流程 skill：严格标准（软硬约束/scripts/脚本可执行各 5 分 + md 精简 5 分）

    // 子项 1: 软硬约束分类明确（5 分）
    if (!/软约束|硬约束/.test(content)) {
      score -= 5;
      deductions.push({
        item: '软硬约束分类',
        deduction: -5,
        reason: 'SKILL.md 未明确区分软约束与硬约束',
      });
    }

    // 子项 2: 脚本承载硬约束（5 分）—— scripts/ 存在且有脚本
    const scriptsDir = path.join(skillPath, 'scripts');
    const hasScripts = fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory();
    const scriptFiles = hasScripts ? walkFiles(scriptsDir).filter((f) => f.endsWith('.js') || f.endsWith('.py')) : [];
    if (!hasScripts || scriptFiles.length === 0) {
      score -= 5;
      deductions.push({
        item: '脚本承载硬约束',
        deduction: -5,
        reason: 'scripts/ 目录不存在或无 .js/.py 脚本',
      });
    }

    // 子项 3: md 只写 AI 判断部分（5 分）—— SKILL.md 行数
    const lineCount = countLines(content);
    if (lineCount >= 800) {
      score -= 5;
      deductions.push({
        item: 'md 精简',
        deduction: -5,
        reason: `SKILL.md ${lineCount} 行，≥800 行（需拆分到 references/）`,
      });
    } else if (lineCount >= 500) {
      score -= 2;
      deductions.push({
        item: 'md 精简',
        deduction: -2,
        reason: `SKILL.md ${lineCount} 行，500-799 行（建议拆分）`,
      });
    }

    // 子项 4: 脚本可独立执行（5 分）—— node --check
    if (hasScripts) {
      const jsFiles = walkFiles(scriptsDir).filter((f) => f.endsWith('.js'));
      let allOk = jsFiles.length > 0;
      for (const file of jsFiles) {
        try {
          execSync(`node --check "${file}"`, { stdio: 'pipe' });
        } catch {
          allOk = false;
          break;
        }
      }
      if (!allOk) {
        score -= 5;
        deductions.push({
          item: '脚本可独立执行',
          deduction: -5,
          reason: 'scripts/ 下 .js 文件未通过 node --check 或无 .js 文件',
        });
      }
    } else {
      score -= 5;
      deductions.push({
        item: '脚本可独立执行',
        deduction: -5,
        reason: 'scripts/ 目录不存在',
      });
    }
  } else {
    // 简单/中等 skill：宽松标准（禁止事项 10 分 + md 精简 10 分 + 软硬约束可选 5 分）

    // 子项 1: 禁止事项或约束条件（10 分）——SKILL.md 含"禁止"/"不要"/"不应"
    if (!/禁止|不要|不应|不能/.test(content)) {
      score -= 10;
      deductions.push({
        item: '禁止事项',
        deduction: -10,
        reason: 'SKILL.md 未包含禁止事项或约束条件（禁止/不要/不应/不能）',
      });
    }

    // 子项 2: md 精简（10 分）——SKILL.md 行数
    const lineCount = countLines(content);
    if (lineCount >= 800) {
      score -= 10;
      deductions.push({
        item: 'md 精简',
        deduction: -10,
        reason: `SKILL.md ${lineCount} 行，≥800 行（需拆分到 references/）`,
      });
    } else if (lineCount >= 500) {
      score -= 5;
      deductions.push({
        item: 'md 精简',
        deduction: -5,
        reason: `SKILL.md ${lineCount} 行，500-799 行（建议拆分）`,
      });
    }

    // 子项 3: 软硬约束分类（5 分）——可选加分项，有则加分，无不扣分
    // 无需扣分逻辑
  }

  return { score: Math.max(0, score), max: 20, deductions };
}

// ─────────────────────────────────────────────────────────
// 维度 4：文档质量（20 分）
// ─────────────────────────────────────────────────────────

function gradeDocumentation(skillPath) {
  const deductions = [];
  let score = 20;

  const skillmdPath = path.join(skillPath, 'SKILL.md');
  const content = readFile(skillmdPath) || '';

  // 子项 1: frontmatter 规范（5 分）—— name 非空 + version 符合 semver + description 含触发条件
  const fm = parseFrontmatter(content);
  if (!fm || !fm.name || fm.name.trim() === '') {
    score -= 5;
    deductions.push({
      item: 'frontmatter 规范',
      deduction: -5,
      reason: 'frontmatter 缺失或 name 字段为空',
    });
  } else if (!fm.version || !/^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/.test(fm.version.trim())) {
    score -= 5;
    deductions.push({
      item: 'frontmatter 规范',
      deduction: -5,
      reason: `version 缺失或不符合 semver 格式（当前: "${fm.version || '空'}"）`,
    });
  } else if (!fm.description || !/Use when|Use this skill/i.test(fm.description)) {
    score -= 5;
    deductions.push({
      item: 'frontmatter 规范',
      deduction: -5,
      reason: 'description 缺少 "Use when" 或 "Use this skill" 触发条件',
    });
  }

  // 子项 2: SKILL.md 行数（5 分）—— 放宽后的行数评分
  const lineCount = countLines(content);
  if (lineCount >= 800) {
    score -= 5;
    deductions.push({
      item: 'SKILL.md 行数',
      deduction: -5,
      reason: `SKILL.md ${lineCount} 行，≥800 行`,
    });
  } else if (lineCount >= 500) {
    score -= 3;
    deductions.push({
      item: 'SKILL.md 行数',
      deduction: -3,
      reason: `SKILL.md ${lineCount} 行，500-799 行`,
    });
  } else if (lineCount >= 300) {
    score -= 1;
    deductions.push({
      item: 'SKILL.md 行数',
      deduction: -1,
      reason: `SKILL.md ${lineCount} 行，300-500 行`,
    });
  }

  // 子项 3: references 引用明确（5 分）—— SKILL.md 含 references/ 引用
  if (!/references\//.test(content)) {
    score -= 5;
    deductions.push({
      item: 'references 引用',
      deduction: -5,
      reason: 'SKILL.md 未包含 references/ 引用链接',
    });
  }

  // 子项 4: 内容结构化（5 分）—— 检查表格/列表/mermaid 的使用
  const hasTable = /\|.*\|.*\n\|.*[-:|].*\n/.test(content); // 表格
  const hasList = /^[-*]\s/m.test(content); // 列表
  const hasMermaid = /```mermaid/.test(content); // mermaid

  const structuredCount = [hasTable, hasList, hasMermaid].filter(Boolean).length;
  if (structuredCount < 2) {
    let deduction;
    let reason;
    if (structuredCount === 1) {
      deduction = -2;
      reason = `SKILL.md 仅使用 1 种结构化格式（表格/列表/mermaid），建议至少 2 种`;
    } else {
      deduction = -5;
      reason = 'SKILL.md 以纯文本段落为主，未使用表格/列表/mermaid 结构化格式';
    }
    score += deduction;
    deductions.push({
      item: '内容结构化',
      deduction,
      reason,
    });
  }

  return { score: Math.max(0, score), max: 20, deductions };
}

// ─────────────────────────────────────────────────────────
// 维度 5：测试覆盖（20 分）
// ─────────────────────────────────────────────────────────

function gradeTesting(skillPath, fullSkill) {
  const deductions = [];
  let score = 20;

  const evalsPath = path.join(skillPath, 'evals', 'evals.json');

  // 子项 1: evals.json 存在且合法（5 分）
  if (!fileExists(evalsPath)) {
    score -= 5;
    deductions.push({ item: 'evals.json 存在', deduction: -5, reason: 'evals/evals.json 文件不存在' });
    // 缺失则该维度其余子项也无法检查，直接返回
    score -= 15; // 子项 2/3/4 各 5 分
    deductions.push({ item: '测试用例数量', deduction: -5, reason: 'evals.json 不存在，无法检查' });
    deductions.push({ item: 'assertions 完整', deduction: -5, reason: 'evals.json 不存在，无法检查' });
    deductions.push({ item: '测试通过', deduction: -5, reason: 'evals.json 不存在，无法检查' });
    return { score: Math.max(0, score), max: 20, deductions };
  }

  const raw = readFile(evalsPath);
  let evalsData = null;
  try {
    evalsData = JSON.parse(raw);
  } catch (e) {
    score -= 5;
    deductions.push({ item: 'evals.json 存在', deduction: -5, reason: `evals.json JSON 解析失败: ${e.message}` });
    score -= 15;
    deductions.push({ item: '测试用例数量', deduction: -5, reason: 'evals.json 无效，无法检查' });
    deductions.push({ item: 'assertions 完整', deduction: -5, reason: 'evals.json 无效，无法检查' });
    deductions.push({ item: '测试通过', deduction: -5, reason: 'evals.json 无效，无法检查' });
    return { score: Math.max(0, score), max: 20, deductions };
  }

  // evals.json 存在且合法 → 子项 1 通过
  const evals = Array.isArray(evalsData.evals) ? evalsData.evals : [];

  // 子项 2: 2+ 个测试用例（5 分）
  if (evals.length === 0) {
    score -= 5;
    deductions.push({ item: '测试用例数量', deduction: -5, reason: 'evals 数组为空' });
  } else if (evals.length === 1) {
    score -= 3;
    deductions.push({ item: '测试用例数量', deduction: -3, reason: '仅 1 个测试用例（建议 ≥ 2）' });
  }

  // 子项 3: assertions 完整（5 分）—— 每个用例含非空 assertions
  const evalsWithoutAssertions = evals.filter(
    (e) => !Array.isArray(e.assertions) || e.assertions.length === 0
  );
  if (evals.length === 0 || evalsWithoutAssertions.length > 0) {
    score -= 5;
    deductions.push({
      item: 'assertions 完整',
      deduction: -5,
      reason: evals.length === 0
        ? '无测试用例，无法检查 assertions'
        : `${evalsWithoutAssertions.length} 个用例缺少 assertions`,
    });
  }

  // 子项 4: 测试通过（5 分）
  if (fullSkill) {
    // 完整流程 skill：要求 __tests__/ 存在且有测试文件
    const testDirs = [
      path.join(skillPath, '__tests__'),
      path.join(skillPath, 'scripts', '__tests__'),
    ];
    let testFiles = [];
    for (const dir of testDirs) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        testFiles = walkFiles(dir).filter(
          (f) => f.endsWith('.test.js') || f.endsWith('.test.py') || f.endsWith('.spec.js')
        );
        if (testFiles.length > 0) break;
      }
    }
    if (testFiles.length === 0) {
      score -= 5;
      deductions.push({
        item: '测试通过',
        deduction: -5,
        reason: '__tests__/ 目录不存在或无测试文件',
      });
    }
  }
  // 简单/中等 skill：__tests__/ 为可选加分项，有则加分，无不扣分

  return { score: Math.max(0, score), max: 20, deductions };
}

// ─────────────────────────────────────────────────────────
// 建议生成
// ─────────────────────────────────────────────────────────

function generateSuggestions(dimensions) {
  const suggestions = [];

  for (const [dimName, dim] of Object.entries(dimensions)) {
    for (const d of dim.deductions) {
      switch (d.item) {
        case 'mermaid flowchart':
          suggestions.push('添加 mermaid flowchart 可视化流程');
          break;
        case 'Phase 模型':
          suggestions.push('在 SKILL.md 中补充 Phase 分阶段流程编排');
          break;
        case '内部 loop 机制':
          suggestions.push('补充校验不通过时的回退/loop 闭环描述');
          break;
        case '质量闸门':
          suggestions.push('明确质量闸门/校验点（本地硬约束 + 远程审计）');
          break;
        case '软硬约束分类':
          suggestions.push('在 SKILL.md 中明确区分软约束（md）与硬约束（scripts）');
          break;
        case 'SKILL.md 行数':
        case 'md 精简':
          suggestions.push('拆分 SKILL.md 超长章节到 references/');
          break;
        case 'references 引用':
          suggestions.push('在 SKILL.md 中标注 references/ 文件的引用时机');
          break;
        case 'assertions 完整':
          suggestions.push('为 evals 用例补充可验证的 assertions');
          break;
        case '测试用例数量':
          suggestions.push('补充测试用例至 ≥ 2 个');
          break;
        case '测试通过':
          suggestions.push('在 __tests__/ 下补充测试文件');
          break;
        case 'frontmatter 规范':
          suggestions.push('完善 SKILL.md frontmatter（name + version 符合 semver + description 含 Use when 触发条件）');
          break;
        case '内容结构化':
          suggestions.push('增加结构化格式使用：表格、列表、mermaid 至少 2 种');
          break;
        case '脚本承载硬约束':
          suggestions.push('将确定性校验逻辑落到 scripts/ 目录');
          break;
        case '脚本可独立执行':
          suggestions.push('修复 scripts/ 下脚本的语法错误，确保 node --check 通过');
          break;
        case 'evals.json 存在':
          suggestions.push('创建 evals/evals.json 测试用例文件');
          break;
        case '无非规范目录':
          suggestions.push('移除非规范目录或重命名为规范名称');
          break;
        case '目录命名规范':
          suggestions.push('将目录名改为小写+连字符格式');
          break;
        case 'SKILL.md 存在':
          suggestions.push('创建 SKILL.md 文件');
          break;
        default:
          break;
      }
    }
  }

  // 去重
  return [...new Set(suggestions)];
}

// ─────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────

// ── 参数解析 ──────────────────────────────────────────────
let jsonMode = false;
let target = null;

for (const arg of process.argv.slice(2)) {
  if (arg === '--json') jsonMode = true;
  else if (!target) target = arg;
}

if (!target) {
  console.log('用法: node scripts/grade.js <skill-path> [--json]');
  console.log('');
  console.log('参数:');
  console.log('  <skill-path>  skill 目录路径（如 skills/uluo-skill-creator）');
  console.log('  --json         以 JSON 格式输出（便于 AI 解析）');
  console.log('');
  console.log('退出码: A(90+)/B(70-89) → 0; C(50-69)/D(<50) → 1');
  process.exit(1);
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`错误: 目录不存在: ${target}`);
  process.exit(1);
}

const skillPath = path.resolve(target);
const skillName = path.basename(skillPath);

// ── 执行 5 维度评分 ──────────────────────────────────────
const fullSkill = isFullSkill(skillPath);
const dimensions = {
  structure: gradeStructure(skillPath),
  workflow: gradeWorkflow(skillPath, fullSkill),
  constraint: gradeConstraint(skillPath, fullSkill),
  documentation: gradeDocumentation(skillPath),
  testing: gradeTesting(skillPath, fullSkill),
};

const totalScore = Object.values(dimensions).reduce((sum, d) => sum + d.score, 0);
const { grade, exitCode } = calcGrade(totalScore);
const suggestions = generateSuggestions(dimensions);

// ── 输出结果 ──────────────────────────────────────────────
if (jsonMode) {
  const output = {
    skill_name: skillName,
    complexity: fullSkill ? 'full' : 'simple',
    total_score: totalScore,
    grade,
    dimensions: {
      structure: { score: dimensions.structure.score, max: 20, deductions: dimensions.structure.deductions },
      workflow: { score: dimensions.workflow.score, max: 20, deductions: dimensions.workflow.deductions },
      constraint: { score: dimensions.constraint.score, max: 20, deductions: dimensions.constraint.deductions },
      documentation: { score: dimensions.documentation.score, max: 20, deductions: dimensions.documentation.deductions },
      testing: { score: dimensions.testing.score, max: 20, deductions: dimensions.testing.deductions },
    },
    suggestions,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`\n${BOLD}Skill Quality Grade Report${NC}`);
  console.log('==========================');
  console.log(`Skill: ${CYAN}${skillName}${NC}`);
  console.log(`Complexity: ${fullSkill ? 'full (有 scripts/)' : 'simple (无 scripts/)'}`);
  console.log(`Total Score: ${BOLD}${totalScore}/100${NC}`);
  const gradeColor = grade === 'A' || grade === 'B' ? GREEN : grade === 'C' ? YELLOW : RED;
  console.log(`Grade: ${gradeColor}${BOLD}${grade}${NC}`);

  console.log('\nDimensions:');
  const dimLabels = [
    ['Structure', 'structure'],
    ['Workflow', 'workflow'],
    ['Constraint', 'constraint'],
    ['Documentation', 'documentation'],
    ['Testing', 'testing'],
  ];
  for (const [label, key] of dimLabels) {
    const d = dimensions[key];
    const bar = progressBar(d.score, d.max);
    const scoreStr = String(d.score).padStart(2) + '/20';
    console.log(`  ${label.padEnd(13)} ${scoreStr}  ${bar}`);
  }

  // 扣分明细
  const allDeductions = [];
  const dimNameMap = { structure: 'Structure', workflow: 'Workflow', constraint: 'Constraint', documentation: 'Documentation', testing: 'Testing' };
  for (const [key, d] of Object.entries(dimensions)) {
    for (const ded of d.deductions) {
      allDeductions.push({ dim: dimNameMap[key], ...ded });
    }
  }

  if (allDeductions.length > 0) {
    console.log('\nDeductions:');
    for (const d of allDeductions) {
      console.log(`  - [${d.dim}] ${d.reason} (${d.deduction})`);
    }
  } else {
    console.log(`\n${GREEN}无扣分项${NC}`);
  }

  if (suggestions.length > 0) {
    console.log('\nSuggestions:');
    for (const s of suggestions) {
      console.log(`  - ${s}`);
    }
  }

  console.log('');
}

process.exit(exitCode);
