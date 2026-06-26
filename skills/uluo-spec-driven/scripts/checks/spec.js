// spec.md 专有校验
const fs = require('fs');
const { checkAuthor } = require('../_shared/utils');

/**
 * Parse markdown into sections: { heading: string, level: number, content: string }[]
 */
function parseSections(content) {
  // Only split on ## (level 2) headings — ### and below are treated as content
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
  const fname = require('path').basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 0. 元数据 author 校验 ──────────────────────────────────
  const authorErr = checkAuthor(content, fname);
  if (authorErr) findings.push({ type: 'fail', msg: authorErr });
  else findings.push({ type: 'pass', msg: `${fname}: 作者字段有效` });

  const sections = parseSections(content);

  // ── 1. 用户故事格式 ─────────────────────────────────────
  const storySec = findSection(sections, '用户故事');
  if (storySec.length > 0) {
    const storyText = storySec[0].content;
    // Each story row should follow "作为 <角色>，我希望 <功能>，以便 <价值>"
    const storyRows = storyText.match(/\| US-\d+ \|.*\|.*\|/g) || [];
    if (storyRows.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: 用户故事表格为空——必须列出至少一个用户故事` });
    } else {
      for (const row of storyRows) {
        // Check format: should contain 作为/我希望/以便
        const hasFormat = /作为.*我希望.*以便/.test(row);
        if (!hasFormat) {
          findings.push({ type: 'warn', msg: `${fname}: 用户故事格式不符合"作为<角色>，我希望<功能>，以便<价值>"` });
          break;
        }
      }

      // Check role diversity — not all "用户"
      const roles = storyRows.map(r => {
        // Extract the second column (role) from the table row
        const cols = r.split('|').map(c => c.trim()).filter(Boolean);
        return cols[1] || ''; // cols[0]=编号, cols[1]=角色
      }).filter(Boolean);

      const uniqueRoles = [...new Set(roles)];
      if (uniqueRoles.length === 1 && uniqueRoles[0] === '用户') {
        findings.push({ type: 'warn', msg: `${fname}: 用户故事所有角色都是"用户"——考虑区分运营/管理员/系统管理员/外部调用方等` });
      }
      findings.push({ type: 'pass', msg: `${fname}: 用户故事覆盖 ${storyRows.length} 个故事，${uniqueRoles.length} 种角色` });
    }
  }

  // ── 2. 非目标 ──────────────────────────────────────────
  const nonGoalMatch = content.match(/#{2,3}\s+非目标[^\n]*\n([\s\S]*?)(?=\n#{2,3}\s|\n*$)/);
  if (nonGoalMatch) {
    const items = nonGoalMatch[1].match(/^-\s*.+/gm);
    if (!items || items.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: 非目标为空——必须明确写出不做的事` });
    } else {
      findings.push({ type: 'pass', msg: `${fname}: 非目标含 ${items.length} 项` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"非目标"章节——必须明确写出不做的事，防止范围蔓延` });
  }

  // ── 3. FR 完整性（搜全文，因 ### 级别标题会被 parseSections 分割）──
  // Split by ## headings to get the 功能需求 section
  const frParts = content.split(/^##\s/gm);
  const frPart = frParts.find(p => p.startsWith('功能需求'));
  if (frPart) {
    const frContent = frPart.replace(/^功能需求\n*/, '');
    const frHeaders = frContent.match(/^### FR-\d+:.*/gm) || [];
    if (frHeaders.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: 没有定义任何功能需求（FR）` });
    } else {
      // Each FR should have: 优先级, 触发条件, 预期行为, 边界条件
      const frBodies = frContent.split(/^### FR-\d+:/m).slice(1);
      let complete = 0, incomplete = 0;

      for (let i = 0; i < frBodies.length; i++) {
        const body = frBodies[i];
        const hasPriority = /\*\*优先级\*\*/.test(body);
        const hasTrigger = /\*\*触发条件\*\*/.test(body);
        const hasBehavior = /\*\*预期行为\*\*/.test(body);
        const hasBoundary = /\*\*边界条件\*\*/.test(body);
        const frName = frHeaders[i] ? frHeaders[i].replace('### ', '').trim() : `FR-${i+1}`;

        if (hasPriority && hasTrigger && hasBehavior && hasBoundary) {
          complete++;
        } else {
          incomplete++;
          const missing = [];
          if (!hasPriority) missing.push('优先级');
          if (!hasTrigger) missing.push('触发条件');
          if (!hasBehavior) missing.push('预期行为');
          if (!hasBoundary) missing.push('边界条件');
          findings.push({ type: 'fail', msg: `${fname}: ${frName} 缺少: ${missing.join(', ')}` });
        }
      }
      if (complete > 0) {
        findings.push({ type: 'pass', msg: `${fname}: ${complete}/${frHeaders.length} 个 FR 字段完整` });
      }
    }
  }

  // ── 4. 验收标准可验证性 ─────────────────────────────────
  const acSec = findSection(sections, '验收标准');
  if (acSec.length > 0) {
    const items = acSec[0].content.match(/^-\s*\[.\]\s*.+/gm) || [];
    if (items.length === 0) {
      findings.push({ type: 'fail', msg: `${fname}: 验收标准为空` });
    } else {
      // Check for vague acceptance criteria
      const vaguePatterns = [
        /用户体验好/, /界面美观/, /操作流畅/, /响应快/,
        /好用/, /易用/, /够快/, /稳定/,
      ];
      let vague = 0;
      for (const item of items) {
        if (vaguePatterns.some(p => p.test(item))) {
          vague++;
          findings.push({ type: 'fail', msg: `${fname}: 验收标准不可验证: "${item.trim().substring(0, 40)}..."` });
        }
      }
      if (vague === 0 && items.length > 0) {
        findings.push({ type: 'pass', msg: `${fname}: ${items.length} 条验收标准均可验证` });
      }
    }
  }

  // ── 5. 调研依据 ─────────────────────────────────────────
  const researchSec = findSection(sections, '调研依据');
  if (researchSec.length > 0) {
    // Check for source tables
    const sourceTypes = ['Context7', 'GitHub', 'WebSearch', 'Stack Overflow'];
    const foundSources = sourceTypes.filter(s => researchSec[0].content.includes(s));
    if (foundSources.length >= 2) {
      findings.push({ type: 'pass', msg: `${fname}: 调研依据覆盖 ${foundSources.join(', ')}` });
    } else if (foundSources.length === 1) {
      findings.push({ type: 'warn', msg: `${fname}: 调研依据仅含 ${foundSources[0]}——建议多源交叉验证` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 调研依据未标注信息源——必须标注结论来源` });
    }

    // Check confidence markers
    const hasConfidence = /可信度[\s\S]*?(高|中|低)/.test(researchSec[0].content);
    if (hasConfidence) {
      findings.push({ type: 'pass', msg: `${fname}: 调研依据标注了可信度` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 调研依据未标注可信度（高/中/低）` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"调研依据"章节——核心结论必须说明信息来源` });
  }

  // ── 6. 参考资料分组 ─────────────────────────────────────
  const refSec = findSection(sections, '参考资料');
  if (refSec.length > 0) {
    const refGroups = refSec[0].content.match(/^###\s+.+/gm) || [];
    if (refGroups.length >= 2) {
      findings.push({ type: 'pass', msg: `${fname}: 参考资料按 ${refGroups.length} 个信息源分组` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 参考资料未按信息源类型分组` });
    }
  }

  return findings;
}

module.exports = { check };
