// change-tasks.js — L3 变更 Tasks 专有校验
const fs = require('fs');
const path = require('path');
const { checkAuthor, extractTasks } = require('../_shared/utils');

function parseSections(content) {
  // 只按 ## （二级标题）切分，### 及以下视为内容
  const lines = content.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].trim(), content: '' };
    } else if (current) {
      current.content += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections;
}

function findSection(sections, headingPat) {
  return sections.filter(s => new RegExp(headingPat, 'i').test(s.heading));
}

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据校验 ──────────────────────────────────────────
  const authorErr = checkAuthor(content, fname);
  if (authorErr) findings.push({ type: 'fail', msg: authorErr });
  else findings.push({ type: 'pass', msg: `${fname}: 作者字段有效` });

  const sections = parseSections(content);

  // ── 1. 执行任务清单章节 ─────────────────────────────────────
  const taskSec = findSection(sections, '执行任务清单');
  if (taskSec.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 执行任务清单"章节` });
    return findings;
  }
  findings.push({ type: 'pass', msg: `${fname}: 包含"执行任务清单"章节` });

  // ── 2. 每个任务必须 ### T 编号开头 ────────────────────────
  const tasks = extractTasks(content);
  if (tasks.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 未找到任务条目——格式应为 "### T1: [动词] [目标]"` });
    return findings;
  }
  findings.push({ type: 'pass', msg: `${fname}: 含 ${tasks.length} 个任务（T1~T${tasks.length}）` });

  // ── 3. 每个任务必须包含 **目标文件** 字段 ──────────────────
  let missingTargetFile = 0;
  for (const task of tasks) {
    if (!task.targetFile) {
      findings.push({ type: 'fail', msg: `${fname}: ${task.id} 缺少"**目标文件**"字段——必须标注相对项目根的文件路径` });
      missingTargetFile++;
    }
  }
  if (missingTargetFile === 0) {
    findings.push({ type: 'pass', msg: `${fname}: 所有任务均含"目标文件"字段` });
  }

  // ── 4. 每个任务必须包含 **任务类型** 字段 ──────────────────
  const validTaskTypes = ['代码', '文档', '设计稿', '测试'];
  let missingTaskType = 0;
  let badTaskType = 0;
  for (const task of tasks) {
    if (!task.taskType) {
      findings.push({ type: 'fail', msg: `${fname}: ${task.id} 缺少"**任务类型**"字段` });
      missingTaskType++;
    } else if (!validTaskTypes.some(t => task.taskType.includes(t))) {
      findings.push({ type: 'fail', msg: `${fname}: ${task.id} 任务类型 "${task.taskType}" 不合法——只能是 代码 / 文档 / 设计稿 / 测试` });
      badTaskType++;
    }
  }
  if (missingTaskType === 0 && badTaskType === 0) {
    findings.push({ type: 'pass', msg: `${fname}: 所有任务类型均为合法值（代码/文档/设计稿/测试）` });
  }

  // ── 5. 每个任务必须包含 **任务描述** 字段，且动词开头 ────────
  const validVerbs = ['修改', '新增', '删除', '重构'];
  let missingDesc = 0;
  let badVerb = 0;
  for (const task of tasks) {
    if (!task.description) {
      findings.push({ type: 'fail', msg: `${fname}: ${task.id} 缺少"**任务描述**"字段` });
      missingDesc++;
    } else {
      const startsWithVerb = validVerbs.some(v => task.description.startsWith(v));
      if (!startsWithVerb) {
        findings.push({ type: 'fail', msg: `${fname}: ${task.id} 任务描述未动词开头——必须以 修改/新增/删除/重构 开头` });
        badVerb++;
      }
    }
  }
  if (missingDesc === 0 && badVerb === 0) {
    findings.push({ type: 'pass', msg: `${fname}: 所有任务描述均动词开头` });
  }

  // ── 6. 需调研标注格式 ────────────────────────────────────
  for (const task of tasks) {
    if (!task.needResearch) continue;
    // 如果标注"是"，必须列出建议调研方式
    if (/^是/.test(task.needResearch)) {
      const hasMethod = /WebSearch|Context7|GitHub|官网文档|调研方式/.test(task.needResearch);
      if (!hasMethod) {
        findings.push({ type: 'fail', msg: `${fname}: ${task.id} 标注"需调研: 是"但未列出建议调研方式（WebSearch / MCP Context7 / GitHub / 官网文档）` });
      } else {
        findings.push({ type: 'pass', msg: `${fname}: ${task.id} 调研标注含建议方式` });
      }
    }
  }

  // ── 7. 不应包含验收检查点 ──────────────────────────────────
  // 7a. 不应包含"验证方式"字段
  const verifyFieldPattern = /\*\*验证方式\*\*|\*\*验收标准\*\*|\*\*验收检查\*\*/;
  if (verifyFieldPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含验收检查点字段（如"验证方式"/"验收标准"）——那是 checklist 的事` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 未包含验收检查点字段（符合 L3 边界）` });
  }

  // 7b. 不应包含"怎么验证改对了"
  const howVerifyPattern = /怎么验证|如何验证|验证.*改对/;
  if (howVerifyPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含"怎么验证改对了"——那是 checklist 的事` });
  }

  return findings;
}

module.exports = { check };
