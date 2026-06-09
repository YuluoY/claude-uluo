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

module.exports = {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, collectMdFiles, detectDocType, hasHeading, relative,
};
