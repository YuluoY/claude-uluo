// sync-consistency.js — 跨文档同步一致性校验
//
// 校验 spec → plan → tasks → checklist 的对齐关系：
//   1. spec 影响范围（文档维度）的每一项，在 plan 中都有对应 delta
//   2. plan 中每个 delta，在 tasks 中都有对应任务
//   3. tasks 中每个任务，在 checklist 中都有对应 review 检查点
//   4. checklist 所有检查点应为 [x]（通过）
const fs = require('fs');
const path = require('path');
const {
  extractDeltaItems,
  extractImpactItems,
  extractTasks,
  extractChecklistItems,
} = require('../_shared/utils');

function readFile(dir, name) {
  const p = path.join(dir, name);
  try { return fs.readFileSync(p, 'utf-8'); }
  catch { return null; }
}

function check(changeDir) {
  const findings = [];
  const dirName = path.basename(changeDir);

  // 读取四份文档
  const specContent = readFile(changeDir, 'spec.md');
  const planContent = readFile(changeDir, 'plan.md');
  const tasksContent = readFile(changeDir, 'tasks.md');
  const checklistContent = readFile(changeDir, 'checklist.md');

  // 缺失文件直接返回——结构校验由主编排器负责
  if (!specContent) {
    findings.push({ type: 'fail', msg: `${dirName}/: 缺少 spec.md，无法进行同步一致性校验` });
    return findings;
  }
  if (!planContent) {
    findings.push({ type: 'fail', msg: `${dirName}/: 缺少 plan.md，无法进行同步一致性校验` });
    return findings;
  }
  if (!tasksContent) {
    findings.push({ type: 'fail', msg: `${dirName}/: 缺少 tasks.md，无法进行同步一致性校验` });
    return findings;
  }
  if (!checklistContent) {
    findings.push({ type: 'fail', msg: `${dirName}/: 缺少 checklist.md，无法进行同步一致性校验` });
    return findings;
  }

  // 提取结构化数据
  const impactItems = extractImpactItems(specContent);
  const deltaItems = extractDeltaItems(planContent);
  const taskItems = extractTasks(tasksContent);
  const checklistItems = extractChecklistItems(checklistContent);

  // ── 1. spec → plan 对齐 ──────────────────────────────────
  // 文档影响项应在 plan 中有对应 delta
  const docImpacts = impactItems.filter(i => i.dimension === '文档');
  if (docImpacts.length === 0) {
    findings.push({ type: 'warn', msg: `${dirName}/: spec.md 影响范围无文档影响项——无法校验 spec→plan 对齐` });
  } else if (deltaItems.length === 0) {
    findings.push({ type: 'fail', msg: `${dirName}/: spec.md 有 ${docImpacts.length} 个文档影响项，但 plan.md 无 delta —— 回退到 spec 层级` });
  } else {
    let unmatched = 0;
    for (const imp of docImpacts) {
      // 匹配策略：delta location 与 impact target 精确匹配或路径段匹配
      // impact target 格式如 "spec.md > ## 功能需求 > FR-1"
      // delta location 格式如 "spec.md > ## 功能需求 > FR-1"
      const target = imp.target.replace(/\s+/g, '');
      const matched = deltaItems.some(d => {
        const loc = d.location.replace(/\s+/g, '');
        // 精确匹配
        if (loc === target) return true;
        // 路径段匹配：按 ">" 分段，每段必须精确匹配（避免 "FR-1" 误匹配 "FR-10"）
        const targetParts = target.split('>');
        const locParts = loc.split('>');
        if (targetParts.length === 0 || locParts.length === 0) return false;
        // 较短的路径作为前缀匹配（spec 影响项可能是 plan delta 的父级）
        const shorter = targetParts.length <= locParts.length ? targetParts : locParts;
        const longer = targetParts.length <= locParts.length ? locParts : targetParts;
        return shorter.every((part, i) => part === longer[i]);
      });
      if (!matched) {
        findings.push({
          type: 'fail',
          msg: `${dirName}/: spec 影响项 "${imp.target}" 在 plan.md 中无对应 delta —— 回退到 spec 层级`,
        });
        unmatched++;
      }
    }
    if (unmatched === 0) {
      findings.push({ type: 'pass', msg: `${dirName}/: spec → plan 对齐（${docImpacts.length} 个文档影响项均有 delta）` });
    }
  }

  // ── 2. plan → tasks 对齐 ──────────────────────────────────
  // 每个 delta 应在 tasks 中有对应任务
  if (deltaItems.length === 0) {
    findings.push({ type: 'warn', msg: `${dirName}/: plan.md 无 delta——无法校验 plan→tasks 对齐` });
  } else if (taskItems.length === 0) {
    findings.push({ type: 'fail', msg: `${dirName}/: plan.md 有 ${deltaItems.length} 个 delta，但 tasks.md 无任务 —— 回退到 plan 层级` });
  } else {
    let unmatched = 0;
    for (const delta of deltaItems) {
      // 匹配策略：delta 引用的文档名应在某个任务的目标文件中出现
      // 例如 delta location "spec.md > ## 功能需求 > FR-1" → 任务目标文件含 "spec.md"
      const docName = delta.location.split('>')[0].trim();
      const matched = taskItems.some(t => {
        if (!t.targetFile) return false;
        // 目标文件路径中包含文档名
        return t.targetFile.includes(docName) || t.targetFile.endsWith(docName);
      });
      if (!matched) {
        // 对于修改 spec.md/plan.md 等文档的 delta，检查任务描述是否提及
        const descMatched = taskItems.some(t => {
          if (!t.description) return false;
          return t.description.includes(docName.replace('.md', ''));
        });
        if (!descMatched) {
          findings.push({
            type: 'fail',
            msg: `${dirName}/: plan delta "${delta.type}: ${delta.location}" 在 tasks.md 中无对应任务 —— 回退到 plan 层级`,
          });
          unmatched++;
        }
      }
    }
    if (unmatched === 0) {
      findings.push({ type: 'pass', msg: `${dirName}/: plan → tasks 对齐（${deltaItems.length} 个 delta 均有任务）` });
    }
  }

  // ── 3. tasks → checklist 对齐 ─────────────────────────────
  // 每个任务应在 checklist 中有对应 review 检查点
  if (taskItems.length === 0) {
    findings.push({ type: 'warn', msg: `${dirName}/: tasks.md 无任务——无法校验 tasks→checklist 对齐` });
  } else if (checklistItems.length === 0) {
    findings.push({ type: 'fail', msg: `${dirName}/: tasks.md 有 ${taskItems.length} 个任务，但 checklist.md 无检查点 —— 回退到 tasks 层级` });
  } else {
    let unmatched = 0;
    for (const task of taskItems) {
      // 匹配策略：checklist 检查点文本中包含任务编号（如 T1）
      const matched = checklistItems.some(c => c.text.includes(task.id));
      if (!matched) {
        // 也检查 checklist 是否有"每个任务"这类通用检查点
        const hasGeneric = checklistItems.some(c => /每个任务|所有任务|任务.*目标文件|任务.*动词/.test(c.text));
        if (!hasGeneric) {
          findings.push({
            type: 'fail',
            msg: `${dirName}/: 任务 ${task.id} 在 checklist.md 中无对应 review 检查点 —— 回退到 tasks 层级`,
          });
          unmatched++;
        }
      }
    }
    if (unmatched === 0) {
      findings.push({ type: 'pass', msg: `${dirName}/: tasks → checklist 对齐（${taskItems.length} 个任务均有检查点）` });
    }
  }

  // ── 4. checklist review 状态 ──────────────────────────────
  if (checklistItems.length > 0) {
    const passed = checklistItems.filter(i => i.status === 'pass').length;
    const failed = checklistItems.filter(i => i.status === 'fail').length;
    const pending = checklistItems.filter(i => i.status === 'pending').length;

    if (failed > 0) {
      findings.push({
        type: 'fail',
        msg: `${dirName}/: checklist 有 ${failed} 个不通过项 —— 回退到对应层级（spec/plan/tasks/执行）`,
      });
    } else if (pending > 0) {
      findings.push({
        type: 'warn',
        msg: `${dirName}/: checklist 有 ${pending} 个待 review 项（[${passed}/${checklistItems.length}] 已通过）`,
      });
    } else {
      findings.push({
        type: 'pass',
        msg: `${dirName}/: checklist 全部通过（${checklistItems.length} 个检查点均为 [x]）`,
      });
    }
  }

  // ── 5. 代码对齐：tasks 目标文件存在性 ─────────────────────
  // 检查 tasks.md 中每个任务的目标文件是否实际存在于项目根目录
  // projectRoot 从环境变量 PROJECT_ROOT 或 process.cwd() 获取
  if (taskItems.length === 0) {
    findings.push({ type: 'warn', msg: `${dirName}/: tasks.md 无任务——无法校验代码对齐` });
  } else {
    const tasksWithTarget = taskItems.filter(t => t.targetFile);
    if (tasksWithTarget.length === 0) {
      findings.push({ type: 'warn', msg: `${dirName}/: tasks.md 无任务目标文件——无法校验代码对齐` });
    } else {
      const projectRoot = process.env.PROJECT_ROOT || process.cwd();
      let missing = 0;
      for (const task of tasksWithTarget) {
        const absPath = path.resolve(projectRoot, task.targetFile);
        if (!fs.existsSync(absPath)) {
          findings.push({
            type: 'fail',
            msg: `${dirName}/: 代码对齐: 目标文件不存在: ${task.targetFile} — 回退到执行层级`,
          });
          missing++;
        }
      }
      if (missing === 0) {
        findings.push({
          type: 'pass',
          msg: `${dirName}/: 代码对齐（${tasksWithTarget.length} 个目标文件均存在）`,
        });
      }
    }
  }

  return findings;
}

module.exports = { check };
