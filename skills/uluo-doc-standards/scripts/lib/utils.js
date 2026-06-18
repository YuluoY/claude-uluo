// Shared utilities for document validation scripts.

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

// ── Document type detection ────────────────────────────────

function detectDocType(filepath) {
  const name = path.basename(filepath);
  if (name === 'spec.md')                  return 'spec';
  if (name === 'research-report.md')       return 'research-report';
  if (name === 'verification-report.md')   return 'verification-report';
  if (name === 'retrospective.md')         return 'retrospective';
  if (name === 'CHANGELOG.md')             return 'changelog';
  if (name === 'plan.md' || name === 'README.md') return 'plan';
  if (/^phase\d/.test(name))              return 'tasks';
  return 'unknown';
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
  /$^/,                       // 空字符串视为未填写
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

module.exports = {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, collectMdFiles, detectDocType, hasHeading, relative,
  checkAuthor,
};
