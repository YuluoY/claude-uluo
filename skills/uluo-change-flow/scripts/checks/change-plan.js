// change-plan.js — L2 变更 Plan 专有校验
const fs = require('fs');
const path = require('path');
const { checkAuthor, extractDeltaItems } = require('../lib/utils');

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

  // ── 1. Delta 规格章节 ─────────────────────────────────────
  const deltaSec = findSection(sections, 'Delta 规格');
  if (deltaSec.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"## Delta 规格"章节——必须用 delta 描述文档修改` });
    return findings;
  }
  findings.push({ type: 'pass', msg: `${fname}: 包含"Delta 规格"章节` });

  // ── 2. Delta 必须使用 ### MODIFIED / ### ADDED / ### REMOVED 标记 ──
  const deltaItems = extractDeltaItems(content);
  if (deltaItems.length === 0) {
    findings.push({ type: 'fail', msg: `${fname}: Delta 规格为空——必须至少有一个 ### MODIFIED/ADDED/REMOVED 项` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: Delta 规格含 ${deltaItems.length} 个 delta 项` });

    // 3. 检查每个 delta 的字段完整性
    let modComplete = 0, addComplete = 0, remComplete = 0;
    let modIncomplete = 0, addIncomplete = 0, remIncomplete = 0;

    for (const delta of deltaItems) {
      // 3a. 每个 delta 必须引用原文位置
      if (!delta.location || delta.location.trim().length < 3) {
        findings.push({ type: 'fail', msg: `${fname}: ${delta.type} delta 缺少原文位置引用——格式应为 "文件名 > 章节 > 子章节"` });
      }

      // 3b. 引用位置应包含 > 分隔符（如 spec.md > ## 功能需求 > FR-1）
      if (delta.location && !/>/.test(delta.location)) {
        findings.push({ type: 'warn', msg: `${fname}: ${delta.type} delta 引用位置 "${delta.location}" 缺少 ">" 分隔——建议格式 "文件名 > 章节 > 子章节"` });
      }

      // 3c. 按类型检查字段
      if (delta.type === 'MODIFIED') {
        const hasOriginal = /\*\*原文摘要\*\*/.test(delta.content);
        const hasChanged = /\*\*改为\*\*/.test(delta.content);
        if (hasOriginal && hasChanged) {
          modComplete++;
        } else {
          modIncomplete++;
          const missing = [];
          if (!hasOriginal) missing.push('原文摘要');
          if (!hasChanged) missing.push('改为');
          findings.push({ type: 'fail', msg: `${fname}: MODIFIED delta "${delta.location}" 缺少: ${missing.join(', ')}` });
        }
      } else if (delta.type === 'ADDED') {
        const hasInsertPos = /\*\*插入位置\*\*/.test(delta.content);
        const hasNewContent = /\*\*新内容\*\*/.test(delta.content);
        if (hasInsertPos && hasNewContent) {
          addComplete++;
        } else {
          addIncomplete++;
          const missing = [];
          if (!hasInsertPos) missing.push('插入位置');
          if (!hasNewContent) missing.push('新内容');
          findings.push({ type: 'fail', msg: `${fname}: ADDED delta "${delta.location}" 缺少: ${missing.join(', ')}` });
        }
      } else if (delta.type === 'REMOVED') {
        const hasDelPos = /\*\*删除位置\*\*/.test(delta.content);
        const hasDelReason = /\*\*删除原因\*\*/.test(delta.content);
        if (hasDelPos && hasDelReason) {
          remComplete++;
        } else {
          remIncomplete++;
          const missing = [];
          if (!hasDelPos) missing.push('删除位置');
          if (!hasDelReason) missing.push('删除原因');
          findings.push({ type: 'fail', msg: `${fname}: REMOVED delta "${delta.location}" 缺少: ${missing.join(', ')}` });
        }
      }
    }

    if (modComplete > 0 && modIncomplete === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${modComplete} 个 MODIFIED delta 字段完整` });
    }
    if (addComplete > 0 && addIncomplete === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${addComplete} 个 ADDED delta 字段完整` });
    }
    if (remComplete > 0 && remIncomplete === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${remComplete} 个 REMOVED delta 字段完整` });
    }
  }

  // ── 4. 技术方案选择章节（可选，但有则必须有方案对比和选择结论）──
  const techSec = findSection(sections, '技术方案选择');
  if (techSec.length > 0) {
    const techBody = techSec[0].content;

    // 必须有方案对比表格
    const hasComparison = /###\s*方案对比/.test(techBody) || /\|\s*方案\s*\|.*\|.*\|/.test(techBody);
    if (hasComparison) {
      findings.push({ type: 'pass', msg: `${fname}: 技术方案选择包含方案对比` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: "技术方案选择"章节缺少方案对比——必须有方案对比表格` });
    }

    // 必须有选择结论
    const hasConclusion = /###\s*选择结论/.test(techBody) || /\*\*选择\*\*/.test(techBody);
    if (hasConclusion) {
      findings.push({ type: 'pass', msg: `${fname}: 技术方案选择包含选择结论` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: "技术方案选择"章节缺少选择结论——必须有"**选择**: ..."字段` });
    }
  }

  // ── 5. 不应包含的内容（L2 边界检查）──────────────────────

  // 5a. 不应包含具体文件路径 —— 那是 L3 的事
  const filePathPattern = /\b(?:src|lib|app|components|pages|utils|services|models|controllers)\/[^\s)`]+\.(js|ts|tsx|jsx|py|java|go|rs|vue|rb|php|c|cpp|h)\b/;
  if (filePathPattern.test(content)) {
    const match = content.match(filePathPattern);
    findings.push({ type: 'fail', msg: `${fname}: 不应包含具体文件路径 "${match[0]}"——文件级定位是 L3 tasks 的事` });
  } else {
    findings.push({ type: 'pass', msg: `${fname}: 未包含具体文件路径（符合 L2 边界）` });
  }

  // 5b. 不应包含行号
  const lineNumPattern = /第\s*\d+\s*行|line\s+\d+|:\d+:\d+/i;
  if (lineNumPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含行号——文档会变化，行号不可靠` });
  }

  // 5c. 不应包含任务执行顺序
  const execOrderPattern = /##\s*任务依赖图|##\s*执行顺序|→.*→/;
  if (execOrderPattern.test(content)) {
    findings.push({ type: 'fail', msg: `${fname}: 不应包含任务执行顺序——那是 L3 tasks 的事` });
  }

  return findings;
}

module.exports = { check };
