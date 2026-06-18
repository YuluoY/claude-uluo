// retrospective.md 专有校验
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

  // ── 1. 基本数据：偏差 >50% 是否有分析 ──────────────────────
  const dataSec = content.match(/## 基本数据([\s\S]*?)(?=^##\s)/m);
  if (dataSec) {
    const hasDeviation = /偏差/.test(dataSec[1]);
    if (hasDeviation) {
      // Check if any deviation is >50%
      const devCols = dataSec[1].match(/\|[+-]\d+[hmd%]/g) || [];
      const largeDev = devCols.filter(d => {
        const val = parseInt(d.replace(/[^0-9]/g, ''));
        return val > 50;
      });
      if (largeDev.length > 0) {
        findings.push({ type: 'warn', msg: `${fname}: 偏差超过 50%，应在 Lessons Learned 中分析原因` });
      }
    }
  }

  // ── 2. WWW/WCB 不允许泛泛而谈 ──────────────────────────────
  const vaguePatterns = [
    /很好/, /不错/, /还行/, /挺好/, /下次注意/, /以后要仔细/,
    /good/, /nice/, /fine/, /ok/,
  ];

  const wwwSec = content.match(/## What Went Well([\s\S]*?)(?=^##\s)/m);
  if (wwwSec) {
    const items = wwwSec[1].match(/^[-✅]\s*.+/gm) || [];
    if (items.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: What Went Well 为空` });
    } else {
      let vague = 0;
      for (const item of items) {
        if (vaguePatterns.some(p => p.test(item.replace(/✅/g, '')))) {
          vague++;
        }
      }
      if (vague > 0) {
        findings.push({ type: 'warn', msg: `${fname}: What Went Well 含 ${vague} 条泛泛而谈——需说明为什么好、带来什么价值` });
      } else {
        findings.push({ type: 'pass', msg: `${fname}: What Went Well 含 ${items.length} 条具体内容` });
      }
    }
  }

  const wcbSec = content.match(/## What Could Be Better([\s\S]*?)(?=^##\s)/m);
  if (wcbSec) {
    const items = wcbSec[1].match(/^[-🔧]\s*.+/gm) || [];
    if (items.length === 0) {
      findings.push({ type: 'warn', msg: `${fname}: What Could Be Better 为空——复盘应该找到改进空间` });
    }
  }

  // ── 3. Action Items 必须有 owner + deadline ────────────────
  const aiSec = content.match(/## Action Items([\s\S]*?)(?=^##\s|$)/m);
  if (aiSec) {
    const aiRows = aiSec[1].match(/\| AI-\d+ \|/g) || [];

    if (aiRows.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: Action Items 为空——必须有可执行的改进措施` });
    } else {
      // Check each row has owner and deadline (columns 4 and 5)
      const rows = aiSec[1].split('\n').filter(l => /\| AI-\d+ \|/.test(l));
      let complete = 0, incomplete = 0;

      for (const row of rows) {
        const cols = row.split('|').map(c => c.trim());
        const owner = cols[4] || '';
        const deadline = cols[5] || '';
        const hasOwner = owner && owner !== '-' && owner !== '—';
        const hasDeadline = deadline && /\d{4}-\d{2}-\d{2}/.test(deadline);

        if (hasOwner && hasDeadline) {
          complete++;
        } else {
          incomplete++;
          const missing = [];
          if (!hasOwner) missing.push('负责人');
          if (!hasDeadline) missing.push('截止日期');
          findings.push({ type: 'fail', msg: `${fname}: Action Item ${cols[1]} 缺少: ${missing.join(', ')}` });
        }
      }

      if (complete > 0 && incomplete === 0) {
        findings.push({ type: 'pass', msg: `${fname}: ${complete} 个 Action Items 均有负责人 + 截止日期` });
      }
    }
  }

  // ── 4. AI 执行反思必须填写 ────────────────────────────────
  const aiReflect = content.match(/## AI 执行反思([\s\S]*?)$/m);
  if (aiReflect) {
    const hasGood = /AI 做得好的/.test(aiReflect[1]);
    const hasMistake = /AI 犯的错/.test(aiReflect[1]);
    const hasSuggestion = /对后续.*建议/.test(aiReflect[1]);

    if (hasGood && hasMistake && hasSuggestion) {
      findings.push({ type: 'pass', msg: `${fname}: AI 执行反思三部分完整` });
    } else {
      const missing = [];
      if (!hasGood) missing.push('做得好的');
      if (!hasMistake) missing.push('犯的错');
      if (!hasSuggestion) missing.push('后续建议');
      findings.push({ type: 'warn', msg: `${fname}: AI 执行反思缺少: ${missing.join(', ')}` });
    }
  }

  return findings;
}

module.exports = { check };
