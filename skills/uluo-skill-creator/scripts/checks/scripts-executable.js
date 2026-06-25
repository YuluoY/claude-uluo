'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { readFile, listDir, formatResult } = require('../_shared/utils');

// 非法依赖模式——AI 上下文依赖不应出现在脚本中（脚本必须独立执行）
const ILLEGAL_DEP_PATTERNS = [
  /require\(\s*['"]claude['"]\s*\)/,
  /require\(\s*['"]@anthropic[^'"]*['"]\s*\)/,
  /from\s+['"]claude['"]/,
  /from\s+['"]@anthropic[^'"]*['"]/,
];

/**
 * 递归收集目录下所有文件（跳过 __tests__ 目录）
 * @param {string} dir 起始目录
 * @param {string[]} files 累积文件列表
 * @returns {string[]}
 */
function walkScripts(dir, files) {
  const acc = files || [];
  const entries = listDir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      // 跳过 __tests__ 目录（测试文件不强制可执行性校验）
      if (entry === '__tests__') continue;
      walkScripts(full, acc);
    } else if (stat.isFile()) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * 校验脚本可执行性
 * @param {string} skillPath skill 根目录绝对路径
 * @returns {{ checkName: string, status: string, errors: Array, warnings: Array }}
 */
function check(skillPath) {
  const errors = [];
  const warnings = [];

  const scriptsDir = path.join(skillPath, 'scripts');

  // scripts/ 不存在则跳过（可选目录）
  if (!fs.existsSync(scriptsDir) || !fs.statSync(scriptsDir).isDirectory()) {
    return formatResult('scripts-executable', 'pass', errors, warnings);
  }

  const files = walkScripts(scriptsDir);

  for (const file of files) {
    const ext = path.extname(file);
    const relPath = path.relative(skillPath, file);

    // ── .js 文件：node --check 语法校验 + 非法依赖检查 ──
    if (ext === '.js') {
      // 语法校验
      try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
      } catch (e) {
        const stderr = e.stderr ? e.stderr.toString().trim() : e.message;
        errors.push({
          file: relPath,
          rule: 'js-syntax',
          message: `node --check 失败: ${stderr}`,
        });
      }

      // 非法依赖检查
      const content = readFile(file);
      if (content) {
        for (const pattern of ILLEGAL_DEP_PATTERNS) {
          const match = content.match(pattern);
          if (match) {
            errors.push({
              file: relPath,
              rule: 'illegal-dependency',
              message: `检测到非法 AI 上下文依赖 "${match[0]}"——脚本必须独立执行，不依赖 AI`,
            });
          }
        }
      }
    }

    // ── .py 文件：python -m py_compile 语法校验 ──
    if (ext === '.py') {
      try {
        execSync(`python -m py_compile "${file}"`, { stdio: 'pipe' });
      } catch (e) {
        const stderr = e.stderr ? e.stderr.toString().trim() : e.message;
        errors.push({
          file: relPath,
          rule: 'py-syntax',
          message: `python -m py_compile 失败: ${stderr}`,
        });
      }
    }
  }

  const status = errors.length > 0 ? 'fail' : 'pass';
  return formatResult('scripts-executable', status, errors, warnings);
}

module.exports = { check };
