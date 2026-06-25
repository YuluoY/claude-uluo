// change-checklist.js — 独立验收 Checklist 专有校验
const fs = require('fs');
const path = require('path');
const { extractChecklistItems } = require('../lib/utils');

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

// 占位符模式：审查人字段未正确填写时残留
const REVIEWER_PLACEHOLDERS = [
  /`git config user\.name`/,
  /git config user\.name/,
  /\[Author Name\]/i,
  /\[审查人\]/,
  /\[作者\]/,
  /TODO/i,
  /FIXME/i,
];

/**
 * 检查 checklist 元数据行中的审查人字段。
 * 元数据格式: "> 日期: YYYY-MM-DD | 审查人: <name> | ..."
 * 返回 null 表示有效，否则返回失败消息。
 */
function checkReviewer(content, fname) {
  const metaLine = content.match(/^> 日期:\s*\d{4}-\d{2}-\d{2}\s*\|\s*审查人:\s*([^|\n]+?)\s*(?:\||$)/m);
  if (!metaLine) {
    return `${fname}: 缺少元数据行——应包含 "> 日期: YYYY-MM-DD | 审查人: <姓名> | ..."`;
  }

  const reviewerRaw = metaLine[1].trim();
  if (!reviewerRaw) {
    return `${fname}: 审查人字段为空——必须从 git config user.name 获取真实姓名填入`;
  }

  for (const pattern of REVIEWER_PLACEHOLDERS) {
    if (pattern.test(reviewerRaw)) {
      return `${fname}: 审查人字段仍是占位符 "${reviewerRaw}"——必须运行 git config user.name 获取真实姓名后替换`;
    }
  }

  if (reviewerRaw.length < 2) {
    return `${fname}: 审查人名过短 "${reviewerRaw}"——应为真实姓名`;
  }

  return null;
}

/**
 * 过滤出正文内容行（排除空行、表格行、检查点格式行）
 */
function filterBodyLines(content) {
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l) return false;
      // 排除表格表头/分隔行/数据行
      if (l.startsWith('|')) return false;
      // 排除检查点格式行 - [ ] / - [x] / - [-]
      if (/^-\s*\[[ x-]\]\s*/i.test(l)) return false;
      return true;
    });
}

/**
 * 检查 checklist 是否复制了源文件的正文内容（连续 3 行以上相同文本）
 * 返回 null 表示无重复，否则返回失败消息。
 */
function checkContentDuplication(checklistContent, sourceContent, fname, sourceFile) {
  const checklistLines = filterBodyLines(checklistContent);
  const sourceLines = filterBodyLines(sourceContent);
  const MIN_LINES = 3;

  if (sourceLines.length < MIN_LINES) return null;

  for (let i = 0; i <= sourceLines.length - MIN_LINES; i++) {
    const window = sourceLines.slice(i, i + MIN_LINES);
    for (let j = 0; j <= checklistLines.length - MIN_LINES; j++) {
      let match = true;
      for (let k = 0; k < MIN_LINES; k++) {
        if (checklistLines[j + k] !== window[k]) {
          match = false;
          break;
        }
      }
      if (match) {
        return `${fname}: 检查点不应重复 spec/plan/tasks 各层正文内容——发现与 ${sourceFile} 相同的连续段落`;
      }
    }
  }
  return null;
}

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据校验（审查人字段）──────────────────────────────
  const reviewerErr = checkReviewer(content, fname);
  if (reviewerErr) findings.push({ type: 'fail', msg: reviewerErr });
  else findings.push({ type: 'pass', msg: `${fname}: 审查人字段有效` });

  const sections = parseSections(content);

  // ── 1. 必须有 ## Spec Review 分组 ──────────────────────────
  findSection(sections, 'Spec Review').length > 0
    ? findings.push({ type: 'pass', msg: `${fname}: 包含"Spec Review"分组` })
    : findings.push({ type: 'fail', msg: `${fname}: 缺少"## Spec Review"分组` });

  // ── 2. 必须有 ## Plan Review 分组 ──────────────────────────
  findSection(sections, 'Plan Review').length > 0
    ? findings.push({ type: 'pass', msg: `${fname}: 包含"Plan Review"分组` })
    : findings.push({ type: 'fail', msg: `${fname}: 缺少"## Plan Review"分组` });

  // ── 3. 必须有 ## Tasks Review 分组 ─────────────────────────
  findSection(sections, 'Tasks Review').length > 0
    ? findings.push({ type: 'pass', msg: `${fname}: 包含"Tasks Review"分组` })
    : findings.push({ type: 'fail', msg: `${fname}: 缺少"## Tasks Review"分组` });

  // ── 4. 必须有 ## 执行 Review 分组（如果有执行阶段）──────────
  // 执行 Review 是可选的——但如果其他 review 分组存在，建议也有执行 review
  const execSec = findSection(sections, '执行 Review');
  if (execSec.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: 包含"执行 Review"分组` });
  } else {
    findings.push({ type: 'warn', msg: `${fname}: 未找到"## 执行 Review"分组——如已有执行阶段，必须补充` });
  }

  // ── 5. 必须有 ## Review 结论 章节 ──────────────────────────
  const conclusionSec = findSection(sections, 'Review 结论');
  if (conclusionSec.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## Review 结论"章节——必须有明确的结论` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 包含"Review 结论"章节` });

    const concBody = conclusionSec[0].content;

    // 5a. 结论只能是 通过 / 不通过
    const conclusionMatch = concBody.match(/\*\*结论\*\*[:\s]*([^\n]+)/);
    if (!conclusionMatch) {
      findings.push({ type: 'fail', msg: `${fname}: Review 结论缺少"**结论**: ..."字段` });
    } else {
      const conclusion = conclusionMatch[1].trim();
      if (conclusion.includes('通过') && !conclusion.includes('不通过')) {
        findings.push({ type: 'pass', msg: `${fname}: Review 结论为"通过"` });
      } else if (conclusion.includes('不通过')) {
        findings.push({ type: 'pass', msg: `${fname}: Review 结论为"不通过"` });
      } else {
        findings.push({ type: 'fail', msg: `${fname}: Review 结论 "${conclusion}" 不合法——只能是 通过 / 不通过` });
      }
    }
  }

  // ── 6. 检查点格式校验 ────────────────────────────────────
  const items = extractChecklistItems(content);
  if (items.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 未找到任何检查点——格式应为 "- [ ] / - [x] / - [-]"` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 含 ${items.length} 个检查点` });

    // 6a. 不通过项（[-]）必须标注回退层级
    const failedItems = items.filter(i => i.status === 'fail');
    for (const item of failedItems) {
      const hasRollbackLevel = /回退.*spec|回退.*plan|回退.*tasks|回退.*执行|→.*spec|→.*plan|→.*tasks|→.*执行/.test(item.text);
      if (!hasRollbackLevel) {
        findings.push({ type: 'fail', msg: `${fname}: 不通过项 "${item.text.substring(0, 40)}..." 未标注回退层级（spec / plan / tasks / 执行）` });
      }
    }

    // 6b. 不通过项必须有不通过原因
    for (const item of failedItems) {
      const hasReason = /原因[:：]/.test(item.text);
      if (!hasReason) {
        findings.push({ type: 'fail', msg: `${fname}: 不通过项 "${item.text.substring(0, 40)}..." 未标注不通过原因` });
      }
    }

    if (failedItems.length > 0) {
      findings.push({ type: 'warn', msg: `${fname}: 有 ${failedItems.length} 个不通过项` });
    }
  }

  // ── 7. Review 结论与检查点状态一致性 ──────────────────────
  const conclusionSec2 = findSection(sections, 'Review 结论');
  if (conclusionSec2.length > 0 && items.length > 0) {
    const concBody = conclusionSec2[0].content;
    const conclusionMatch = concBody.match(/\*\*结论\*\*[:\s]*([^\n]+)/);

    if (conclusionMatch) {
      const conclusion = conclusionMatch[1].trim();
      const allPassed = items.every(i => i.status === 'pass');
      const hasFailed = items.some(i => i.status === 'fail');

      // 7a. 结论为"通过"时，所有检查点必须为 [x]
      if (conclusion.includes('通过') && !conclusion.includes('不通过')) {
        if (!allPassed) {
          const notPassed = items.filter(i => i.status !== 'pass').length;
          findings.push({ type: 'fail', msg: `${fname}: Review 结论为"通过"但有 ${notPassed} 个检查点未通过——结论与状态不一致` });
        }
      }

      // 7b. 结论为"不通过"时，必须有不通过项列表
      if (conclusion.includes('不通过')) {
        const hasFailedList = /不通过项/.test(concBody);
        if (!hasFailedList) {
          findings.push({ type: 'fail', msg: `${fname}: Review 结论为"不通过"但未列出不通过项列表` });
        }
        if (!hasFailed) {
          findings.push({ type: 'warn', msg: `${fname}: Review 结论为"不通过"但所有检查点状态均为通过——请确认` });
        }
      }
    }
  }

  // ── 8. 不重复 spec/plan/tasks 各层正文内容 ──────────────────
  const checkDir = path.dirname(filePath);
  const sourceFiles = ['spec.md', 'plan.md', 'tasks.md'];
  let duplicationFound = false;
  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(checkDir, sourceFile);
    let sourceContent;
    try { sourceContent = fs.readFileSync(sourcePath, 'utf-8'); }
    catch { continue; } // 文件不存在则跳过

    const dupMsg = checkContentDuplication(content, sourceContent, fname, sourceFile);
    if (dupMsg) {
      findings.push({ type: 'fail', msg: dupMsg });
      duplicationFound = true;
    }
  }
  if (!duplicationFound) {
    findings.push({ type: 'pass', msg: `${fname}: 未重复 spec/plan/tasks 各层正文内容` });
  }

  return findings;
}

module.exports = { check };
