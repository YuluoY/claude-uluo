// Shared utilities for change-flow validation scripts.

const fs = require('fs');
const path = require('path');

// ── Color output ──────────────────────────────────────────
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

const state = { pass: 0, fail: 0, warn: 0 };

function reset() {
  state.pass = 0;
  state.fail = 0;
  state.warn = 0;
}

function pass(msg) { console.log(`  ${GREEN}✓${NC} ${msg}`); state.pass++; }
function fail(msg) { console.log(`  ${RED}✗${NC} ${msg}`); state.fail++; }
function warn(msg) { console.log(`  ${YELLOW}⚠${NC} ${msg}`); state.warn++; }

function section(title) {
  console.log(`\n${BOLD}${CYAN}── ${title}${NC}`);
}

// ── File helpers ──────────────────────────────────────────

function fileExists(base, rel) {
  return fs.existsSync(path.join(base, rel));
}

function dirExists(base, rel) {
  const p = path.join(base, rel);
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

// Collect all .md files in a directory (recursive)
function collectMdFiles(dir) {
  const result = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        result.push(full);
      }
    }
  }
  walk(dir);
  return result;
}

// ── Section check ──────────────────────────────────────────

function hasHeading(file, headingPattern) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const re = new RegExp(`^##\\s+${headingPattern}`, 'im');
    return re.test(content);
  } catch {
    return false;
  }
}

// ── Get relative path for display ──────────────────────────

function relative(base, file) {
  return path.relative(base, file);
}

// ── Summary ────────────────────────────────────────────────

function summary() {
  const total = state.pass + state.fail + state.warn;
  console.log(`\n${BOLD}── 校验结果 ──${NC}`);
  console.log(`  通过: ${GREEN}${state.pass}${NC}  失败: ${RED}${state.fail}${NC}  警告: ${YELLOW}${state.warn}${NC}  合计: ${total}`);
  console.log('');

  if (state.fail > 0) {
    console.log(`${RED}${BOLD}✗ 校验未通过 —— 请修复上方失败项后重新运行。${NC}`);
    return false;
  } else {
    console.log(`${GREEN}${BOLD}✓ 全部校验通过。${NC}`);
    return true;
  }
}

// ── Author metadata check ────────────────────────────────────

// 占位符模式：AI 没有正确获取作者名时会残留这些
const AUTHOR_PLACEHOLDERS = [
  /`git config user\.name`/,  // 未执行的命令
  /git config user\.name/,
  /\[Author Name\]/i,
  /\[作者\]/,
  /TODO/i,
  /FIXME/i,
]

/**
 * Check that the document metadata line contains a valid author name.
 * Metadata line format: "> 日期: YYYY-MM-DD | 作者: <name> | ..."
 * Returns null if valid, or a failure message string if invalid.
 */
function checkAuthor(content, fname) {
  // Look for the metadata line starting with "> 日期:"
  const metaLine = content.match(/^> 日期:\s*\d{4}-\d{2}-\d{2}\s*\|\s*作者:\s*([^|\n]+?)\s*(?:\||$)/m)
  if (!metaLine) {
    return `${fname}: 缺少元数据行——应包含 "> 日期: YYYY-MM-DD | 作者: <姓名> | ..."`
  }

  const authorRaw = metaLine[1].trim()
  if (!authorRaw) {
    return `${fname}: 作者字段为空——必须从 git config user.name 获取真实姓名填入`
  }

  for (const pattern of AUTHOR_PLACEHOLDERS) {
    if (pattern.test(authorRaw)) {
      return `${fname}: 作者字段仍是占位符 "${authorRaw}"——必须运行 git config user.name 获取真实姓名后替换`
    }
  }

  // 作者名至少 2 个字符（中英文名）
  if (authorRaw.length < 2) {
    return `${fname}: 作者名过短 "${authorRaw}"——应为真实姓名`
  }

  return null // valid
}

// ── Change number check ────────────────────────────────────

/**
 * Check that the spec metadata line contains a valid change number.
 * Format: 变更编号: CHG-NNN (where NNN is digits)
 * Returns null if valid, or a failure message string if invalid.
 */
function checkChangeNumber(content, fname) {
  // 先检查是否有"变更编号"字段
  const fieldMatch = content.match(/^> 日期:[^\n]*\|\s*变更编号:\s*([^|\n]+?)\s*(?:\||$)/m);
  if (!fieldMatch) {
    return `${fname}: 元数据行缺少"变更编号: CHG-NNN"字段`;
  }
  const num = fieldMatch[1].trim();
  if (!/^CHG-\d+$/.test(num)) {
    return `${fname}: 变更编号格式错误 "${num}"——应为 CHG-NNN（如 CHG-001）`;
  }
  return null;
}

// ── Delta items extraction (from plan.md) ───────────────────

/**
 * Extract delta items from plan.md content.
 * Returns array of { type: 'MODIFIED'|'ADDED'|'REMOVED', location: string, content: string }
 */
function extractDeltaItems(content) {
  const items = [];
  const lines = content.split('\n');
  let current = null;
  const deltaRe = /^###\s+(MODIFIED|ADDED|REMOVED):\s*(.*)/;

  for (const line of lines) {
    const m = line.match(deltaRe);
    if (m) {
      if (current) items.push(current);
      current = { type: m[1], location: m[2].trim(), content: '' };
    } else if (current) {
      // 遇到 ## 级别标题时结束当前 delta
      if (/^##\s/.test(line)) {
        items.push(current);
        current = null;
      } else {
        current.content += line + '\n';
      }
    }
  }
  if (current) items.push(current);
  return items;
}

// ── Impact items extraction (from spec.md) ──────────────────

/**
 * Extract impact scope items from spec.md content.
 * Parses the 影响范围 section and its sub-tables.
 * Returns array of { dimension, target, impactType, riskLevel }
 */
function extractImpactItems(content) {
  const items = [];
  // 取 ## 影响范围 章节
  const parts = content.split(/^##\s/gm);
  const impactPart = parts.find(p => p.startsWith('影响范围'));
  if (!impactPart) return items;

  const impactContent = impactPart.replace(/^影响范围[^\n]*\n/, '');

  // 解析子章节：### 文档影响 / ### 代码影响 / ### 设计稿影响
  const subParts = impactContent.split(/^###\s/gm).slice(1);
  for (const sub of subParts) {
    const heading = sub.split('\n')[0].trim();
    let dimension = '';
    if (/文档影响/.test(heading)) dimension = '文档';
    else if (/代码影响/.test(heading)) dimension = '代码';
    else if (/设计稿影响/.test(heading)) dimension = '设计稿';
    else continue;

    // 解析表格行（跳过表头和分隔行）
    const rows = sub.match(/^\|.*\|/gm) || [];
    for (const row of rows.slice(2)) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length < 3) continue;
      // 文档影响: | 文档 | 章节 | 影响类型 | 风险等级 | 说明 |
      // 代码影响: | 模块 | 影响类型 | 风险等级 | 说明 |
      // 设计稿影响: | 组件 | 影响类型 | 风险等级 | 说明 |
      let target, impactType, riskLevel;
      if (dimension === '文档') {
        target = cols[0] + ' > ' + cols[1];
        impactType = cols[2];
        riskLevel = cols[3];
      } else {
        target = cols[0];
        impactType = cols[1];
        riskLevel = cols[2];
      }
      if (target && impactType) {
        items.push({ dimension, target, impactType, riskLevel });
      }
    }
  }
  return items;
}

// ── Tasks extraction (from tasks.md) ────────────────────────

/**
 * Extract tasks from tasks.md content.
 * Returns array of { id, title, content, targetFile, taskType, description, needResearch, deps }
 */
function extractTasks(content) {
  const tasks = [];
  // 匹配 ### T1: ..., ### T2: ... 等
  const parts = content.split(/^###\s+(T\d+)\s*[:：]\s*/m);
  // parts[0] 是前导内容，之后交替为 id, body
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const body = parts[i + 1] || '';
    const titleLine = body.split('\n')[0].trim();

    const targetFile = (body.match(/\*\*目标文件\*\*[:\s]*`?([^`\n]+)`?/) || [])[1];
    const taskType = (body.match(/\*\*任务类型\*\*[:\s]*([^\n]+)/) || [])[1];
    const description = (body.match(/\*\*任务描述\*\*[:\s]*([^\n]+)/) || [])[1];
    const needResearch = (body.match(/\*\*需调研\*\*[:\s]*([^\n]+)/) || [])[1];
    const deps = (body.match(/\*\*依赖\*\*[:\s]*([^\n]+)/) || [])[1];

    tasks.push({
      id,
      title: titleLine,
      content: body,
      targetFile: targetFile ? targetFile.trim() : null,
      taskType: taskType ? taskType.trim() : null,
      description: description ? description.trim() : null,
      needResearch: needResearch ? needResearch.trim() : null,
      deps: deps ? deps.trim() : null,
    });
  }
  return tasks;
}

// ── Checklist items extraction (from checklist.md) ──────────

/**
 * Extract review checklist items from checklist.md content.
 * Returns array of { status: 'pending'|'pass'|'fail', text, group }
 */
function extractChecklistItems(content) {
  const items = [];
  const lines = content.split('\n');
  let currentGroup = '';

  for (const line of lines) {
    // 跟踪当前 ## 分组
    const groupMatch = line.match(/^##\s+(.+)/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      continue;
    }
    // 匹配检查点：- [ ], - [x], - [-]
    const itemMatch = line.match(/^-\s*\[([ x-])\]\s*(.+)/i);
    if (itemMatch) {
      const statusChar = itemMatch[1].toLowerCase();
      let status;
      if (statusChar === ' ') status = 'pending';
      else if (statusChar === 'x') status = 'pass';
      else if (statusChar === '-') status = 'fail';
      else status = 'unknown';
      items.push({ status, text: itemMatch[2].trim(), group: currentGroup });
    }
  }
  return items;
}

module.exports = {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, collectMdFiles, hasHeading, relative,
  checkAuthor, checkChangeNumber,
  extractDeltaItems, extractImpactItems, extractTasks, extractChecklistItems,
};
