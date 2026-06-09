// CHANGELOG.md 专有校验
const fs = require('fs');
const path = require('path');

function check(filePath) {
  const findings = [];
  const fname = path.basename(filePath);
  let content;
  try { content = fs.readFileSync(filePath, 'utf-8'); }
  catch { findings.push({ type: 'fail', msg: `${fname}: 无法读取文件` }); return findings; }

  // ── 1. 版本标题格式: ## [version] - YYYY-MM-DD ───────────
  const versions = content.match(/^##\s+\[.+\]\s*-\s*\d{4}-\d{2}-\d{2}/gm) || [];
  if (versions.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: ${versions.length} 个版本使用标准格式 ## [version] - YYYY-MM-DD` });
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 缺少版本标题——格式应为 "## [version] - YYYY-MM-DD"` });
  }

  // ── 2. 标准分类: Added/Changed/Deprecated/Removed/Fixed/Security ──
  const stdCategories = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
  const foundCategories = stdCategories.filter(cat =>
    new RegExp(`^### ${cat}`, 'm').test(content)
  );

  if (foundCategories.length >= 3) {
    findings.push({ type: 'pass', msg: `${fname}: 使用标准分类（${foundCategories.join(', ')}）` });
  } else if (foundCategories.length >= 1) {
    findings.push({ type: 'warn', msg: `${fname}: 标准分类不足（仅 ${foundCategories.join(', ')}）` });
  } else {
    findings.push({ type: 'fail', msg: `${fname}: 未使用标准分类——应使用 Added/Changed/Fixed 等` });
  }

  // ── 3. 检查反模式：一条变更多个内容 ────────────────────────
  const entryLines = content.match(/^-\s+.+/gm) || [];
  const antiPatterns = [
    /改了很多/, /优化了一堆/, /修了若干/, /各种/, /等等/,
    /多个/, /若干/, /一些/, /许多/, /大量/,
  ];

  let antiCount = 0;
  for (const line of entryLines) {
    for (const pat of antiPatterns) {
      if (pat.test(line)) {
        antiCount++;
        findings.push({ type: 'warn', msg: `${fname}: 条目过于笼统: "${line.trim().substring(0, 50)}..."——每条只应说一个变更` });
        break;
      }
    }
  }

  if (antiCount === 0 && entryLines.length > 0) {
    findings.push({ type: 'pass', msg: `${fname}: ${entryLines.length} 条变更条目，无笼统描述` });
  }

  // ── 4. Breaking Changes 必须有迁移说明 ─────────────────────
  const bcParts = content.split(/^### /gm);
  const bcPart = bcParts.find(p => p.startsWith('Breaking Changes'));
  if (bcPart) {
    const bcBody = bcPart.replace(/^Breaking Changes\n*/, '').trim();
    if (bcBody.length < 10 && !/N\/A/i.test(bcBody)) {
      findings.push({ type: 'warn', msg: `${fname}: Breaking Changes 节为空——如有破坏性变更需说明` });
    }

    // Check for migration guidance
    const hasMigration = /迁移/.test(bcBody) || /示例/.test(bcBody) || /替换/.test(bcBody)
                      || /migration/i.test(bcBody) || /upgrade/i.test(bcBody);
    if (bcBody.length > 5 && !hasMigration) {
      findings.push({ type: 'warn', msg: `${fname}: Breaking Changes 缺少迁移说明或代码示例` });
    } else if (hasMigration) {
      findings.push({ type: 'pass', msg: `${fname}: Breaking Changes 含迁移说明` });
    }
  }

  // ── 5. 语义化版本检查 ────────────────────────────────────
  const semverRe = /^##\s+\[(\d+)\.(\d+)\.(\d+)\]/m;
  const semverMatch = content.match(semverRe);
  if (semverMatch) {
    const major = parseInt(semverMatch[1]);
    if (major === 0 && !content.includes('Breaking Changes')) {
      // 0.x versions don't strictly need Breaking Changes section
    }
    findings.push({ type: 'pass', msg: `${fname}: 使用语义化版本 v${semverMatch[1]}.${semverMatch[2]}.${semverMatch[3]}` });
  }

  return findings;
}

module.exports = { check };
