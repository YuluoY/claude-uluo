// verification-report.md 专有校验
const fs = require('fs');
const path = require('path');
const { checkAuthor } = require('../lib/utils');

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据 author 校验 ──────────────────────────────────
  const authorErr = checkAuthor(content, fname);
  if (authorErr) findings.push({ type: 'fail', msg: authorErr });
  else findings.push({ type: 'pass', msg: `${fname}: 作者字段有效` });

  // ── 1. 验收概要必须有通过率数据 ────────────────────────────
  const summarySec = content.match(/## 验收概要([\s\S]*?)(?=^##\s)/m);
  if (summarySec) {
    const hasData = /\d+%/.test(summarySec[1]) || /通过率/.test(summarySec[1]);
    if (hasData) {
      findings.push({ type: 'pass', msg: `${fname}: 验收概要有通过率数据` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 验收概要缺少通过率——需要数字，不只是"通过"` });
    }
  }

  // ── 2. 验收标准逐条对照：每条必须有验证方式和证据 ──────────
  const acSec = content.match(/## 验收标准逐条对照([\s\S]*?)(?=^##\s)/m);
  if (acSec) {
    const items = acSec[1].match(/-\s*\[[ x]\]\s*\*\*\[?FR-\d+\]?\*\*/g) || [];
    let verified = 0, unverified = 0, hasPlan = 0;

    for (let i = 0; i < items.length; i++) {
      // Extract the block for this item
      const currentItem = items[i];
      const nextItem = items[i + 1];
      let block;
      if (nextItem) {
        const start = acSec[1].indexOf(currentItem);
        const end = acSec[1].indexOf(nextItem, start);
        block = acSec[1].substring(start, end);
      } else {
        const start = acSec[1].indexOf(currentItem);
        block = acSec[1].substring(start);
      }

      const hasMethod = /\*\*验证方式\*\*/.test(block);
      const hasEvidence = /\*\*证据\*\*/.test(block);
      const isUnpassed = /⚠️/.test(block) || /❌/.test(block);

      if (isUnpassed) {
        // Unpassed items must have a plan
        if (/\*\*计划\*\*/.test(block) || /\*\*原因\*\*/.test(block)) {
          hasPlan++;
        } else {
          findings.push({ type: 'fail', msg: `${fname}: 未通过的验收项缺少处理计划` });
        }
      }

      if (hasMethod && hasEvidence) {
        verified++;
      } else {
        unverified++;
      }
    }

    if (items.length > 0 && unverified === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${items.length} 条验收标准逐条对照完整（含验证方式+证据）` });
    } else if (unverified > 0) {
      findings.push({ type: 'fail', msg: `${fname}: ${unverified}/${items.length} 条验收标准缺少验证方式或证据` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"验收标准逐条对照"章节——验收报告的核心` });
  }

  // ── 3. 测试结果必须有数字 ─────────────────────────────────
  const testSec = content.match(/## 测试结果汇总([\s\S]*?)(?=^##\s)/m);
  if (testSec) {
    const hasNumbers = /\d+/.test(testSec[1]);
    const hasCoverage = /覆盖率/.test(testSec[1]);

    if (hasNumbers) {
      findings.push({ type: 'pass', msg: `${fname}: 测试结果含数据` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 测试结果缺少数字——需要总数/通过/失败等` });
    }
    if (hasCoverage) {
      findings.push({ type: 'pass', msg: `${fname}: 标注了测试覆盖率` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 未标注测试覆盖率` });
    }
  }

  // ── 4. 结论必须三选一 ─────────────────────────────────────
  // Use the LAST "结论" section (there may be a summary table with "结论" column)
  const concParts = content.split(/^##\s/gm);
  const concPart = concParts.filter(p => p.startsWith('结论')).pop();
  if (concPart) {
    const body = concPart.replace(/^结论\n*/, '');
    const hasPass = /✅.*通过/.test(body);
    const hasConditional = /⚠️.*有条件/.test(body);
    const hasFail = /❌.*不通过/.test(body);

    if (hasPass || hasConditional || hasFail) {
      findings.push({ type: 'pass', msg: `${fname}: 结论明确（通过/有条件通过/不通过）` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 结论不明确——必须三选一（通过/有条件通过/不通过）` });
    }
  }

  // ── 5. 已知问题必须有处理计划 ────────────────────────────
  const issuesSec = content.match(/## 已知问题[\s/].*?([\s\S]*?)(?=^##\s|$)/m);
  if (issuesSec) {
    const issueRows = issuesSec[1].match(/\|.+\|.+\|.+\|.+\|/g) || [];
    if (issueRows.length > 1) { // >1 because first is header
      let withPlan = 0;
      for (let i = 1; i < issueRows.length; i++) {
        const cols = issueRows[i].split('|');
        const plan = (cols[4] || '').trim();
        if (plan && plan !== '-' && plan !== '—' && plan.length > 2) {
          withPlan++;
        } else {
          findings.push({ type: 'warn', msg: `${fname}: 已知问题无处理计划` });
        }
      }
      if (withPlan > 0) {
        findings.push({ type: 'pass', msg: `${fname}: ${withPlan} 个已知问题有处理计划` });
      }
    }
  }

  return findings;
}

module.exports = { check };
