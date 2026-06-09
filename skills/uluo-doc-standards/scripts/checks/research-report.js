// research-report.md 专有校验
const fs = require('fs');
const path = require('path');

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 1. 知识缺口是否全部闭合 ──────────────────────────────
  const kgTable = content.match(/## 知识缺口与结论([\s\S]*?)(?=^##\s)/m);
  if (kgTable) {
    const rows = kgTable[1].match(/\| KG-\d+ \|/g) || [];
    // Each row must have a conclusion (5th column) and confidence (6th column)
    const kgRows = kgTable[1].split('\n').filter(l => /\| KG-\d+ \|/.test(l));

    let closed = 0, open = 0;
    for (const row of kgRows) {
      const cols = row.split('|').map(c => c.trim());
      // cols: [empty, KG-id, gap, depth, source, conclusion, confidence, empty]
      const conclusion = cols[5] || '';
      const confidence = cols[6] || '';

      if (conclusion && conclusion !== '-' && conclusion !== '—') {
        closed++;
        if (!confidence || (!confidence.includes('高') && !confidence.includes('中') && !confidence.includes('低'))) {
          findings.push({ type: 'warn', msg: `${fname}: 知识缺口 ${cols[1]} 未标注可信度` });
        }
      } else {
        open++;
        findings.push({ type: 'fail', msg: `${fname}: 知识缺口 ${cols[1]} 未闭合（无结论）` });
      }
    }

    if (rows.length > 0 && open === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${closed} 个知识缺口全部闭合` });
    } else if (rows.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: 知识缺口表格为空` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"知识缺口与结论"章节` });
  }

  // ── 2. 调研深度：L3 项是否有 ≥3 个来源 ────────────────────
  const l3Items = content.match(/\| KG-\d+ \|.*\| L3 \|/g) || [];
  for (const item of l3Items) {
    const cols = item.split('|');
    const source = (cols[4] || '').trim();
    const sources = source.split(/[,/、]/).filter(Boolean);
    if (sources.length < 2) {
      findings.push({ type: 'warn', msg: `${fname}: L3 深度的知识缺口仅含 ${sources.length} 个来源——要求三源交叉验证` });
    }
  }
  if (l3Items.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: ${l3Items.length} 个 L3 深度缺口` });
  }

  // ── 3. 方案对比必须有"本项目适用性"列 ──────────────────────
  const comparisonSec = content.match(/## 业界方案对比([\s\S]*?)(?=^##\s)/m);
  if (comparisonSec) {
    const hasApplicability = /本项目适用性/.test(comparisonSec[1]);
    if (hasApplicability) {
      findings.push({ type: 'pass', msg: `${fname}: 方案对比含"本项目适用性"列` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 方案对比缺少"本项目适用性"列——仅列优缺点不够，需判断是否适用于本项目` });
    }
  }

  // ── 4. 综合建议必须推荐具体方案 ────────────────────────────
  const recParts = content.split(/^##\s/gm);
  const recPart = recParts.find(p => p.startsWith('综合建议'));
  if (recPart) {
    const body = recPart.replace(/^综合建议\n*/, '');
    const hasRecommendation = /推荐方案/.test(body) && body.length > 50;
    if (hasRecommendation) {
      findings.push({ type: 'pass', msg: `${fname}: 综合建议含推荐方案` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 综合建议未给出明确推荐方案` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"综合建议"章节` });
  }

  // ── 5. 参考资料按信息源分组 ────────────────────────────────
  const refs = content.match(/^### (Context7|GitHub|WebSearch|Stack Overflow|项目源码)/gm) || [];
  if (refs.length >= 2) {
    findings.push({ type: 'pass', msg: `${fname}: 参考资料按 ${refs.length} 个信息源分组` });
  } else if (refs.length === 1) {
    findings.push({ type: 'warn', msg: `${fname}: 参考资料仅含 1 个信息源` });
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 参考资料未按信息源类型分组` });
  }

  return findings;
}

module.exports = { check };
