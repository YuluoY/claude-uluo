// SKILL.md 内容校验——校验 frontmatter 字段、description 触发条件、body 行数
// 规范来源: references/skillmd-spec.md

const path = require('path');
const { readFile, parseFrontmatter, countLines, formatResult } = require('../lib/utils');

// 行数阈值（skillmd-spec.md 定义）
const LINE_SOFT_WARN_THRESHOLD = 300; // 软警告：建议拆分
const LINE_WARN_THRESHOLD = 500;     // 强警告：强烈建议拆分
const LINE_FAIL_THRESHOLD = 800;     // 失败：必须拆分

/**
 * 校验 SKILL.md 内容
 * @param {string} skillPath skill 根目录绝对路径
 * @returns {{ checkName: string, status: string, errors: Array, warnings: Array }}
 */
function check(skillPath) {
  const errors = [];
  const warnings = [];

  const skillmdPath = path.join(skillPath, 'SKILL.md');
  const content = readFile(skillmdPath);

  if (content === null) {
    errors.push({
      file: 'SKILL.md',
      rule: 'unreadable',
      message: '无法读取 SKILL.md',
    });
    return formatResult('skillmd', 'fail', errors, warnings);
  }

  const dirName = path.basename(path.resolve(skillPath));

  // ── 1. 解析 frontmatter ──────────────────────────────────
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push({
      file: 'SKILL.md',
      rule: 'no-frontmatter',
      message: 'SKILL.md 缺少 YAML frontmatter（应以 --- 包裹，包含 name/description 字段）',
    });
    return formatResult('skillmd', 'fail', errors, warnings);
  }

  // ── 2. 校验 name 字段 ────────────────────────────────────
  if (!fm.name || fm.name.trim() === '') {
    errors.push({
      file: 'SKILL.md',
      rule: 'name-required',
      message: 'frontmatter name 字段为空',
    });
  } else if (fm.name !== dirName) {
    errors.push({
      file: 'SKILL.md',
      rule: 'name-mismatch',
      message: `frontmatter name "${fm.name}" 与目录名 "${dirName}" 不一致`,
    });
  }

  // ── 2.5 校验 version 字段 ────────────────────────────────
  if (!fm.version || fm.version.trim() === '') {
    errors.push({
      file: 'SKILL.md',
      rule: 'version-required',
      message: 'frontmatter version 字段为空——必须包含语义化版本号（如 0.1.0）',
    });
  } else {
    // semver 格式校验：MAJOR.MINOR.PATCH
    const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?(?:\+[\w.]+)?$/;
    if (!semverRegex.test(fm.version.trim())) {
      errors.push({
        file: 'SKILL.md',
        rule: 'version-invalid-format',
        message: `frontmatter version "${fm.version}" 不符合 semver 格式（应为 MAJOR.MINOR.PATCH，如 0.1.0）`,
      });
    }
  }

  // ── 3. 校验 description 字段 ─────────────────────────────
  if (!fm.description || fm.description.trim() === '') {
    errors.push({
      file: 'SKILL.md',
      rule: 'description-required',
      message: 'frontmatter description 字段为空',
    });
  } else {
    // 校验触发条件——必须包含 "Use when" 或 "Use this skill"
    const hasTrigger = /Use when|Use this skill/i.test(fm.description);
    if (!hasTrigger) {
      errors.push({
        file: 'SKILL.md',
        rule: 'description-no-trigger',
        message: 'description 缺少触发条件——必须包含 "Use when" 或 "Use this skill"',
      });
    }
  }

  // ── 4. 校验 body 行数（frontmatter 之后的内容）──────────
  const fmEndMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = fmEndMatch ? content.slice(fmEndMatch[0].length) : content;
  const lineCount = countLines(body);

  if (lineCount >= LINE_FAIL_THRESHOLD) {
    errors.push({
      file: 'SKILL.md',
      rule: 'line-count-fail',
      message: `SKILL.md body ${lineCount} 行，超过 ${LINE_FAIL_THRESHOLD} 行上限——必须拆分到 references/`,
    });
  } else if (lineCount >= LINE_WARN_THRESHOLD) {
    // 500-799 行：强警告
    warnings.push({
      file: 'SKILL.md',
      rule: 'line-count-warning',
      message: `SKILL.md body ${lineCount} 行，超过 ${LINE_WARN_THRESHOLD} 行——强警告：强烈建议拆分到 references/`,
    });
  } else if (lineCount >= LINE_SOFT_WARN_THRESHOLD) {
    // 300-499 行：软警告
    warnings.push({
      file: 'SKILL.md',
      rule: 'line-count-warning',
      message: `SKILL.md body ${lineCount} 行，超过 ${LINE_SOFT_WARN_THRESHOLD} 行——建议拆分到 references/`,
    });
  }

  const status = errors.length > 0 ? 'fail' : 'pass';
  return formatResult('skillmd', status, errors, warnings);
}

module.exports = { check };
