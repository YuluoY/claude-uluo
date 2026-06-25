'use strict';

const path = require('path');
const fs = require('fs');
const { fileExists, listDir, formatResult } = require('../_shared/utils');

// 规范目录名（skill-anatomy.md 定义）
const CANONICAL_DIRS = ['references', 'scripts', 'agents', 'evals', 'examples', 'assets'];

/**
 * 校验 skill 目录结构
 * @param {string} skillPath skill 根目录绝对路径
 * @returns {{ checkName: string, status: string, errors: Array, warnings: Array }}
 */
function check(skillPath) {
  const errors = [];
  const warnings = [];

  // ── 1. 校验必需文件存在 ──────────────────────────────────
  const skillmdPath = path.join(skillPath, 'SKILL.md');
  if (!fileExists(skillmdPath)) {
    errors.push({
      file: 'SKILL.md',
      rule: 'required-file',
      message: '缺失必需文件: SKILL.md',
    });
  }

  // ── 2. 校验可选目录命名规范 ──────────────────────────────
  const entries = listDir(skillPath);
  for (const entry of entries) {
    const fullPath = path.join(skillPath, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    // 跳过隐藏目录（如 .claude-plugin）和 __tests__（jest 约定例外）
    if (entry.startsWith('.') || entry === '__tests__') continue;

    if (!CANONICAL_DIRS.includes(entry)) {
      warnings.push({
        file: entry,
        rule: 'non-canonical-dir',
        message: `非规范目录名 "${entry}"——规范目录: ${CANONICAL_DIRS.join(', ')}`,
      });
    }
  }

  const status = errors.length > 0 ? 'fail' : 'pass';
  return formatResult('structure', status, errors, warnings);
}

module.exports = { check };
