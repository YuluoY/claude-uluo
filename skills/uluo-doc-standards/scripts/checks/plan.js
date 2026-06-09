// plan.md / plans/README.md 专有校验
const fs = require('fs');
const path = require('path');

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
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  const sections = parseSections(content);

  // ── 1. 关键设计决策：每项必须有 选择/原因/替代方案/影响 ──
  // 搜全文，因 ### 决策标题会被 parseSections 分割
  // Split by ## headings to get the 关键设计决策 section
  const decParts = content.split(/^##\s/gm);
  const decPart = decParts.find(p => p.startsWith('关键设计决策'));
  if (decPart) {
    const decisionContent = decPart.replace(/^关键设计决策\n*/, '');
    // Pre-check: if no ### decision headings, warn
    if (!/^###\s+决策/m.test(decisionContent)) {
      findings.push({ type: 'warn', msg: `${fname}: 关键设计决策章节为空——至少应有一个决策` });
      // Continue to other checks — don't return
    } else {
    const decisionBodies = decisionContent.split(/^###\s+/gm).filter(b => b.trim());
    let complete = 0, incomplete = 0;

    for (const body of decisionBodies) {
      const title = body.split('\n')[0].replace(/^决策\s*\d*[:：]\s*/, '').trim();
      if (!title || title.length < 1) continue;

      const hasSelection = /\*\*选择\*\*/.test(body);
      const hasReason = /\*\*原因\*\*/.test(body);
      const hasAlternative = /\*\*替代方案\*\*/.test(body);
      const hasImpact = /\*\*影响\*\*/.test(body);

      if (hasSelection && hasReason && hasAlternative && hasImpact) {
        complete++;
      } else {
        incomplete++;
        const missing = [];
        if (!hasSelection) missing.push('选择');
        if (!hasReason) missing.push('原因');
        if (!hasAlternative) missing.push('替代方案');
        if (!hasImpact) missing.push('影响');
        findings.push({ type: 'fail', msg: `${fname}: 设计决策 "${title}" 缺少: ${missing.join(', ')}` });
      }
    }

    if (complete > 0 && incomplete === 0) {
      findings.push({ type: 'pass', msg: `${fname}: ${complete} 个设计决策均含完整四段（选择/原因/替代方案/影响）` });
    } else if (complete === 0 && incomplete === 0) {
      findings.push({ type: 'warn', msg: `${fname}: 关键设计决策章节为空——至少应有一个决策` });
    }
    } // close inner else (### decision headings check)
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"关键设计决策"章节` });
  }

  // ── 2. 代码库分析：必须有源码引用 ────────────────────────
  const codeAnaSec = findSection(sections, '代码库分析');
  if (codeAnaSec.length > 0) {
    const body = codeAnaSec[0].content;
    // Check for file path references (with or without backticks)
    const sourceRefs = body.match(/(?:`[^`]*\/[^`]+\.\w+`|src\/\S+\.\w+)/g) || [];
    const tableRows = (body.match(/\|.*\|.*\|/g) || []);

    if (sourceRefs.length >= 1 || tableRows.length >= 2) {
      findings.push({ type: 'pass', msg: `${fname}: 代码库分析含 ${sourceRefs.length} 个源码引用` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 代码库分析缺少源码引用——设计决策必须有项目源码依据` });
    }

    // Check for 可复用清单
    if (/可复用/.test(body) && tableRows.length >= 2) {
      findings.push({ type: 'pass', msg: `${fname}: 包含可复用清单` });
    } else {
      findings.push({ type: 'warn', msg: `${fname}: 未找到可复用清单——应先查一遍已有模块` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"代码库分析"章节——plan 必须基于源码分析` });
  }

  // ── 3. API 契约：必须有错误码 ────────────────────────────
  const apiSec = findSection(sections, 'API 契约');
  if (apiSec.length > 0) {
    const body = apiSec[0].content.trim();
    // N/A = no API changes, skip checks
    if (/^N\/A$/im.test(body)) {
      findings.push({ type: 'pass', msg: `${fname}: API 契约标注 N/A（无 API 变更）` });
      // Skip remaining API checks
    } else {
    const hasErrorCodes = /错误码/.test(body) || /状态码/.test(body);

    if (hasErrorCodes) {
      // Check for actual error code table rows
      const errorRows = body.match(/\|\s*\d{3}\s*\|/g) || [];
      if (errorRows.length > 0) {
        findings.push({ type: 'pass', msg: `${fname}: API 契约含 ${errorRows.length} 个错误码定义` });
      } else {
        findings.push({ type: 'warn', msg: `${fname}: API 契约有"错误码"标题但无具体条目` });
      }
    } else {
      findings.push({ type: 'fail', msg: `${fname}: API 契约缺少错误码——调用方最关心异常情况` });
    }

    // Check for request/response examples
    const hasRequest = /\*\*请求\*\*/.test(body) || /请求参数/.test(body);
    const hasResponse = /\*\*响应\*\*/.test(body) || /响应/.test(body);
    if (hasRequest && hasResponse) {
      findings.push({ type: 'pass', msg: `${fname}: API 契约含请求/响应定义` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: API 契约缺少请求/响应示例` });
    }
    } // close else (N/A check)
  }

  // ── 4. 回滚方案 ─────────────────────────────────────────
  const rollbackSec = findSection(sections, '回滚方案');
  if (rollbackSec.length > 0) {
    const body = rollbackSec[0].content.trim();
    if (/N\/A/i.test(body)) {
      findings.push({ type: 'pass', msg: `${fname}: 回滚方案标注 N/A` });
    } else if (body.length > 5) {
      findings.push({ type: 'pass', msg: `${fname}: 回滚方案已填写` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 回滚方案为空——没有回滚方案的计划不完整` });
    }
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少"回滚方案"章节` });
  }

  // ── 5. 测试策略 ─────────────────────────────────────────
  const testSec = findSection(sections, '测试策略');
  if (testSec.length > 0) {
    const body = testSec[0].content;
    const hasUnit = /单元测试/.test(body);
    const hasIntegration = /集成测试/.test(body);

    if (hasUnit && hasIntegration) {
      findings.push({ type: 'pass', msg: `${fname}: 测试策略覆盖单元测试 + 集成测试` });
    } else {
      const m = [];
      if (!hasUnit) m.push('单元测试');
      if (!hasIntegration) m.push('集成测试');
      findings.push({ type: 'warn', msg: `${fname}: 测试策略缺少: ${m.join(', ')}` });
    }
  }

  // ── 6. 架构概览必须有图或文字描述 ────────────────────────
  const archSec = findSection(sections, '架构概览');
  if (archSec.length > 0) {
    const body = archSec[0].content.trim();
    if (body.length > 10) {
      findings.push({ type: 'pass', msg: `${fname}: 架构概览已填写` });
    } else {
      findings.push({ type: 'fail', msg: `${fname}: 架构概览内容过短——需包含方案概述` });
    }
  }

  return findings;
}

module.exports = { check };
