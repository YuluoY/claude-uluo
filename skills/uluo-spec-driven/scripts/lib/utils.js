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

// ── Feature directory discovery ───────────────────────────

/**
 * 递归扫描 specs/ 根目录，返回所有含 spec.md 的特性目录路径数组。
 * 自动跳过设计文档单文件（.md 文件）与设计文档目录（不含 spec.md 的目录）。
 *
 * 特性目录的识别标志：目录内直接含 spec.md 文件。
 * 一旦识别为特性目录，不再递归进入其子目录（plans/、tasks/ 等不是特性目录）。
 *
 * @param {string} specsRootDir - specs/ 根目录的绝对路径
 * @returns {string[]} 特性目录的绝对路径数组
 */
function findFeatureDirs(specsRootDir) {
  const result = [];

  function walk(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

    // 检查当前目录是否直接含 spec.md —— 是则为特性目录，不再递归
    if (fs.existsSync(path.join(dir, 'spec.md'))) {
      result.push(dir);
      return; // 特性目录内部不再递归（plans/、tasks/ 等子目录不是独立特性）
    }

    // 当前目录不是特性目录 —— 递归扫描子目录（可能是领域目录或设计文档目录）
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      }
      // 跳过文件（设计文档单文件 .md 等不处理）
    }
  }

  walk(specsRootDir);
  return result;
}

// ── Design document discovery ─────────────────────────────

/**
 * 扫描 specs/ 根目录，返回所有设计文档清单（用于报告而非校验）。
 *
 * 识别规则：
 *   L0 战略层（全局）：
 *     - specs/roadmap-*.md
 *     - specs/tech-selection-*.md
 *     - specs/architecture/（目录）
 *   L1 领域层（按领域 <domain>）：
 *     - specs/<domain>/layout.md
 *     - specs/<domain>/layout/（目录）
 *     - specs/<domain>/feature-*.md
 *   L2 组件层（全局清单）：
 *     - specs/components/atomic.md
 *     - specs/components/business.md
 *
 * 跳过特性目录（含 spec.md 的目录）与 features/、designs/ 冲突隔离目录。
 *
 * @param {string} specsRootDir - specs/ 根目录的绝对路径
 * @returns {Array<{path: string, type: string, layer: string}>} 设计文档清单
 *   - path: 相对 specs/ 的路径
 *   - type: 'roadmap' | 'tech-selection' | 'architecture' | 'layout-interaction' |
 *           'feature-domain' | 'atomic-component' | 'business-component'
 *   - layer: 'L0' | 'L1' | 'L2'
 */
function findDesignDocs(specsRootDir) {
  const result = [];
  if (!fs.existsSync(specsRootDir) || !fs.statSync(specsRootDir).isDirectory()) return result;

  function walk(dir, depth) {
    if (depth === undefined) depth = 0;
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      // 跳过特性目录（含 spec.md）—— 不应作为设计文档上报
      if (entry.isDirectory() && fs.existsSync(path.join(fullPath, 'spec.md'))) continue;

      // 跳过 features/ 与 designs/ 冲突隔离目录（递归但不产出，避免与特性目录冲突）
      if (entry.isDirectory() && (entry.name === 'features' || entry.name === 'designs')) {
        walk(fullPath, depth + 1);
        continue;
      }

      // 仅在 specs/ 根目录（depth===0）识别 L0/L2 全局设计文档
      if (depth === 0) {
        // L0 战略层
        if (entry.isFile() && /^roadmap-.*\.md$/.test(entry.name)) {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'roadmap', layer: 'L0' });
        }
        if (entry.isFile() && /^tech-selection-.*\.md$/.test(entry.name)) {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'tech-selection', layer: 'L0' });
        }
        if (entry.isDirectory() && entry.name === 'architecture') {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'architecture', layer: 'L0' });
        }

        // L2 组件层（全局清单）
        if (entry.isDirectory() && entry.name === 'components') {
          for (const ce of fs.readdirSync(fullPath, { withFileTypes: true })) {
            if (ce.isFile() && ce.name === 'atomic.md') {
              result.push({ path: path.relative(specsRootDir, path.join(fullPath, ce.name)), type: 'atomic-component', layer: 'L2' });
            }
            if (ce.isFile() && ce.name === 'business.md') {
              result.push({ path: path.relative(specsRootDir, path.join(fullPath, ce.name)), type: 'business-component', layer: 'L2' });
            }
          }
        }

        // L1 领域层（按领域目录识别，排除 components/architecture 等全局目录）
        if (entry.isDirectory() && entry.name !== 'components' && entry.name !== 'architecture') {
          walkDomain(fullPath);
        }
      }
    }
  }

  function walkDomain(domainDir) {
    if (!fs.existsSync(domainDir) || !fs.statSync(domainDir).isDirectory()) return;
    for (const entry of fs.readdirSync(domainDir, { withFileTypes: true })) {
      const fullPath = path.join(domainDir, entry.name);
      if (entry.isFile() && entry.name === 'layout.md') {
        result.push({ path: path.relative(specsRootDir, fullPath), type: 'layout-interaction', layer: 'L1' });
      }
      if (entry.isDirectory() && entry.name === 'layout') {
        result.push({ path: path.relative(specsRootDir, fullPath), type: 'layout-interaction', layer: 'L1' });
      }
      if (entry.isFile() && /^feature-.*\.md$/.test(entry.name)) {
        result.push({ path: path.relative(specsRootDir, fullPath), type: 'feature-domain', layer: 'L1' });
      }
    }
  }

  walk(specsRootDir);
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
  fileExists, dirExists, collectMdFiles, findFeatureDirs, findDesignDocs, detectDocType, hasHeading, relative,
  checkAuthor,
};
