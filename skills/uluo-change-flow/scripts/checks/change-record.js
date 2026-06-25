// change-record.md 留痕归档校验
const fs = require('fs');
const path = require('path');

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据校验 ──────────────────────────────────────────
  // 变更编号: CHG-NNN | 变更日期: YYYY-MM-DD | 变更发起人: <name> | 状态: [已合并/已拒绝/进行中]
  const metaLine = content.match(/^>\s*变更编号:\s*(CHG-\d+)\s*\|\s*变更日期:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*变更发起人:\s*([^|\n]+?)\s*\|\s*状态:\s*(已合并|已拒绝|进行中)/m);
  if (!metaLine) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少元数据行——格式: "> 变更编号: CHG-NNN | 变更日期: YYYY-MM-DD | 变更发起人: <姓名> | 状态: [已合并/已拒绝/进行中]"` });
  } else {
    const [, changeNum, date, initiator, status] = metaLine;
    findings.push({ type: 'pass', msg: `${fname}: 元数据完整（${changeNum} / ${date} / ${status}）` });

    // 校验发起人非占位符
    const initiatorRaw = initiator.trim();
    if (!initiatorRaw) {
      findings.push({ type: 'fail', msg: `${fname}: 变更发起人为空——必须从 git config user.name 获取真实姓名` });
    } else if (/`git config user\.name`/.test(initiatorRaw) || /\[Author Name\]/i.test(initiatorRaw) || /\[作者\]/.test(initiatorRaw) || /TODO/i.test(initiatorRaw)) {
      findings.push({ type: 'fail', msg: `${fname}: 变更发起人 "${initiatorRaw}" 是占位符——必须填入真实姓名` });
    } else {
      findings.push({ type: 'pass', msg: `${fname}: 变更发起人有效` });
    }
  }

  // ── 1. 变更概述章节 ────────────────────────────────────────
  const overviewSec = content.match(/## 变更概述([\s\S]*?)(?=\n##\s|$)/);
  if (overviewSec) {
    const body = overviewSec[1].trim();
    if (body.length > 10) {
      findings.push({ type: 'pass', msg: `${fname}: 变更概述已填写` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 变更概述过短——应 1-2 句话概述` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 变更概述"章节` });
  }

  // ── 2. 变更原因章节 ────────────────────────────────────────
  const reasonSec = content.match(/## 变更原因([\s\S]*?)(?=\n##\s|$)/);
  if (reasonSec) {
    const body = reasonSec[1].trim();
    if (body.length > 10) {
      findings.push({ type: 'pass', msg: `${fname}: 变更原因已填写` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 变更原因过短——应说明为什么需要变更` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 变更原因"章节` });
  }

  // ── 3. 执行结果章节 ────────────────────────────────────────
  const resultSec = content.match(/## 执行结果([\s\S]*?)(?=\n##\s|$)/);
  if (resultSec) {
    const body = resultSec[1];
    const hasTaskCount = /执行任务数/.test(body);
    const hasComplete = /完成数/.test(body);
    const hasFail = /失败数/.test(body);
    const hasFileCount = /修改文件数/.test(body);

    if (hasTaskCount && hasComplete && hasFail && hasFileCount) {
      // 校验数字一致性
      const taskNum = parseInt((body.match(/执行任务数.*?(\d+)/) || [])[1] || '0');
      const completeNum = parseInt((body.match(/完成数.*?(\d+)/) || [])[1] || '0');
      const failNum = parseInt((body.match(/失败数.*?(\d+)/) || [])[1] || '0');

      if (taskNum > 0 && completeNum + failNum === taskNum) {
        findings.push({ type: 'pass', msg: `${fname}: 执行结果数字一致（${taskNum} = ${completeNum} + ${failNum}）` });
      } else if (taskNum > 0) {
        findings.push({ type: 'warn', msg: `${fname}: 执行结果数字不一致——任务数(${taskNum}) ≠ 完成数(${completeNum}) + 失败数(${failNum})` });
      } else {
        findings.push({ type: 'warn', msg: `${fname}: 执行结果数字未填写` });
      }
    } else {
      const missing = [];
      if (!hasTaskCount) missing.push('执行任务数');
      if (!hasComplete) missing.push('完成数');
      if (!hasFail) missing.push('失败数');
      if (!hasFileCount) missing.push('修改文件数');
      findings.push({ type: 'fail', msg: `${fname}: 执行结果缺少: ${missing.join(', ')}` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 执行结果"章节` });
  }

  // ── 4. 验收结论章节 ────────────────────────────────────────
  const concSec = content.match(/## 验收结论([\s\S]*?)(?=\n##\s|$)/);
  if (concSec) {
    const body = concSec[1];
    const hasReviewResult = /Review 结论/.test(body);
    const hasReviewDate = /Review 日期/.test(body);
    const hasRollbackCount = /回退次数/.test(body);

    if (hasReviewResult && hasReviewDate && hasRollbackCount) {
      // 校验 Review 结论值
      const reviewResult = (body.match(/Review 结论.*?(通过|不通过)/) || [])[1];
      if (reviewResult) {
        findings.push({ type: 'pass', msg: `${fname}: Review 结论明确（${reviewResult}）` });
      } else {
        findings.push({ type: 'fail', msg: `${fname}: Review 结论值不合法——必须为"通过"或"不通过"` });
      }

      // 如有回退，校验回退历史
      const rollbackCount = parseInt((body.match(/回退次数.*?(\d+)/) || [])[1] || '0');
      if (rollbackCount > 0) {
        const hasHistory = /回退历史/.test(body) && /第 1 次回退/.test(body);
        if (hasHistory) {
          findings.push({ type: 'pass', msg: `${fname}: 回退历史已记录（${rollbackCount} 次回退）` });
        } else {
          findings.push({ type: 'fail', msg: `${fname}: 回退次数 > 0 但未记录回退历史` });
        }
      }
    } else {
      const missing = [];
      if (!hasReviewResult) missing.push('Review 结论');
      if (!hasReviewDate) missing.push('Review 日期');
      if (!hasRollbackCount) missing.push('回退次数');
      findings.push({ type: 'fail', msg: `${fname}: 验收结论缺少: ${missing.join(', ')}` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## 验收结论"章节` });
  }

  // ── 5. Diff 引用章节 ───────────────────────────────────────
  const diffSec = content.match(/## Diff 引用([\s\S]*?)(?=\n##\s|$)/);
  if (diffSec) {
    const body = diffSec[1];
    const hasSpecDiff = /spec\.md diff/.test(body);
    const hasPlanDiff = /plan\.md diff/.test(body);
    const hasTasksDiff = /tasks\.md diff/.test(body);
    const hasCodeDiff = /代码变更/.test(body);

    const count = [hasSpecDiff, hasPlanDiff, hasTasksDiff, hasCodeDiff].filter(Boolean).length;
    if (count === 4) {
      findings.push({ type: 'pass', msg: `${fname}: Diff 引用完整（4 项）` });
    } else if (count > 0) {
      findings.push({ type: 'warn', msg: `${fname}: Diff 引用不完整（${count}/4 项）` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: Diff 引用章节为空` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## Diff 引用"章节` });
  }

  return findings;
}

module.exports = { check };
