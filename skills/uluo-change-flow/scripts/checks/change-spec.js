// change-spec.js — L1 变更 Spec 专有校验
const fs = require('fs');
const path = require('path');
const { checkAuthor, checkChangeNumber } = require('../_shared/utils');

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

  const changeNumErr = checkChangeNumber(content, fname);
  if (changeNumErr) findings.push({ type: 'fail', msg: changeNumErr });
  else findings.push({ type: 'pass', msg: `${fname}: 变更编号格式有效` });

  const sections = parseSections(content);

  // ── 1. 变更背景章节 ─────────────────────────────────────
  const bgSec = findSection(sections, '变更背景');
  if (bgSec.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: 包含"变更背景"章节` });
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 变更背景"章节——必须说明变更触发原因和目标` });
  }

  // ── 2. 影响范围章节 ─────────────────────────────────────
  const impactSec = findSection(sections, '影响范围');
  if (impactSec.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 影响范围"章节——必须覆盖文档/代码/设计稿影响` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 包含"影响范围"章节` });

    const impactBody = impactSec[0].content;

    // 2a. 必须包含文档影响表格
    const hasDocImpact = /###\s*文档影响/.test(impactBody);
    if (hasDocImpact) {
      findings.push({ type: 'pass', msg: `${fname}: 影响范围包含文档影响表格` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 影响范围缺少"### 文档影响"表格——必须列出受影响的文档` });
    }

    // 2b. 影响类型只能是 ADDED / MODIFIED / REMOVED
    const validTypes = ['ADDED', 'MODIFIED', 'REMOVED'];
    const tableRows = impactBody.match(/^\|.*\|/gm) || [];
    let badTypeFound = false;
    for (const row of tableRows.slice(2)) { // 跳过表头和分隔行
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      // 找到影响类型列（包含 ADDED/MODIFIED/REMOVED 之一的位置）
      for (const col of cols) {
        if (/^(ADDED|MODIFIED|REMOVED)$/.test(col)) break; // 合法
        // 如果列看起来像影响类型但不在合法列表中
        if (/^[A-Z]+$/.test(col) && col.length > 2 && !validTypes.includes(col)) {
          findings.push({ type: 'fail', msg: `${fname}: 影响类型 "${col}" 不合法——只能是 ADDED / MODIFIED / REMOVED` });
          badTypeFound = true;
          break;
        }
      }
    }
    if (!badTypeFound && tableRows.length > 2) {
      findings.push({ type: 'pass', msg: `${fname}: 影响类型均为合法值（ADDED/MODIFIED/REMOVED）` });
    }

    // 2c. 风险等级只能是 高 / 中 / 低
    let badRiskFound = false;
    for (const row of tableRows.slice(2)) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      for (const col of cols) {
        if (/^[高中低]$/.test(col)) break; // 合法
      }
      // 检查是否有看起来像风险等级但不在合法列表中的
      const riskCol = cols.find(c => /高|中|低/.test(c) && !/^[高中低]$/.test(c));
      if (riskCol) {
        findings.push({ type: 'warn', msg: `${fname}: 风险等级 "${riskCol}" 不规范——建议只用 高 / 中 / 低` });
        badRiskFound = true;
        break;
      }
    }
    if (!badRiskFound && tableRows.length > 2) {
      findings.push({ type: 'pass', msg: `${fname}: 风险等级均为合法值（高/中/低）` });
    }
  }

  // ── 3. 决策结论章节 ─────────────────────────────────────
  const decisionSec = findSection(sections, '决策结论');
  if (decisionSec.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 决策结论"章节——必须有明确的决策` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 包含"决策结论"章节` });

    const decBody = decisionSec[0].content;

    // 3a. 决策只能是 批准 / 拒绝 / 需更多信息
    const decisionMatch = decBody.match(/\*\*决策\*\*[:\s]*([^\n]+)/);
    if (!decisionMatch) {
      findings.push({ type: 'fail', msg: `${fname}: 决策结论缺少"**决策**: ..."字段` });
    } else {
      const decision = decisionMatch[1].trim();
      const validDecisions = ['批准', '拒绝', '需更多信息'];
      const matched = validDecisions.find(d => decision.includes(d));
      if (matched) {
        findings.push({ type: 'pass', msg: `${fname}: 决策为"${matched}"` });

        // 3b. 决策为"需更多信息"时必须有缺失信息列表
        if (matched === '需更多信息') {
          const hasMissingInfo = /缺失信息/.test(decBody);
          if (hasMissingInfo) {
            findings.push({ type: 'pass', msg: `${fname}: "需更多信息"决策已列出缺失信息` });
          } else {
            findings.push({ type: 'fail', msg: `${fname}: 决策为"需更多信息"但未列出缺失信息项` });
          }
        }
      } else {
        findings.push({ type: 'fail', msg: `${fname}: 决策 "${decision}" 不合法——只能是 批准 / 拒绝 / 需更多信息` });
      }
    }
  }

  // ── 4. 不应包含的内容（L1 边界检查）──────────────────────

  // 4a. 不应包含具体文件路径（如 src/xxx.js）—— 那是 L3 的事
  const filePathPattern = /\b(?:src|lib|app|components|pages|utils|services|models|controllers)\/[^\s)`]+\.(js|ts|tsx|jsx|py|java|go|rs|vue|rb|php|c|cpp|h)\b/;
  if (filePathPattern.test(content)) {
    const match = content.match(filePathPattern);
    findings.push({ type: 'fail', msg: `${fname}: 不应包含具体文件路径 "${match[0]}"——文件级定位是 L3 tasks 的事` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 未包含具体文件路径（符合 L1 边界）` });
  }

  // 4b. 不应包含代码片段（```js 等代码块）—— 那是 L3 的事
  const codeBlockPattern = /```(js|javascript|ts|typescript|python|java|go|rust|c|cpp|php|ruby|vue|jsx|tsx|bash|shell)\b/i;
  if (codeBlockPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含代码片段——技术实现是 L3 的事` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 未包含代码片段（符合 L1 边界）` });
  }

  // 4c. 不应包含行号
  const lineNumPattern = /第\s*\d+\s*行|line\s+\d+|:\d+:\d+/i;
  if (lineNumPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含行号——文档会变化，行号不可靠` });
  }

  // 4d. 不应包含技术方案选择 —— 那是 L2 plan 的事
  const techChoicePattern = /##\s*技术方案选择|##\s*方案对比|###\s*方案\s*[AB]/;
  if (techChoicePattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含技术方案选择——那是 L2 plan 的事` });
  }

  return findings;
}

module.exports = { check };
