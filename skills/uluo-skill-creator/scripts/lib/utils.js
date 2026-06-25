// 共享工具函数——不依赖外部 npm 包，仅用 Node.js 内置模块（fs/path）
// 供 structure / skillmd / scripts-executable 三个校验模块复用

const fs = require('fs');
const path = require('path');

// YAML 块标量指示符——遇到这些值时，后续缩进行需折叠为单行
const BLOCK_INDICATORS = ['>-', '>', '|-', '|'];

/**
 * 安全读取文件，返回字符串或 null
 * @param {string} filePath 文件绝对路径
 * @returns {string|null}
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 检查文件是否存在
 * @param {string} filePath 文件绝对路径
 * @returns {boolean}
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 列出目录内容，返回文件/目录名数组；不存在或不可读返回空数组
 * @param {string} dirPath 目录绝对路径
 * @returns {string[]}
 */
function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

/**
 * 解析 YAML frontmatter（简单正则实现，不依赖外部库）
 * 支持:
 *   - name: value（普通单行值）
 *   - description: >- 折叠多行（>- / > / |- / | 指示符）
 *   - description: 后续缩进行（无指示符的块标量）
 * @param {string} content 文件内容
 * @returns {object|null} { name, description, ... } 或 null（无 frontmatter）
 */
function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const fmContent = fmMatch[1];
  const result = {};
  const lines = fmContent.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!kvMatch) {
      i++;
      continue;
    }

    const key = kvMatch[1];
    let value = kvMatch[2].trim();

    // 处理带指示符的折叠多行标量（>- / > / |- / |）
    if (BLOCK_INDICATORS.includes(value)) {
      const foldedLines = [];
      i++;
      while (i < lines.length && /^\s+/.test(lines[i])) {
        foldedLines.push(lines[i].trim());
        i++;
      }
      value = foldedLines.join(' ');
      result[key] = value;
      continue; // i 已指向下一个非缩进行
    }

    // 处理无指示符的块标量（key: 后为空，后续缩进行为值）
    if (value === '') {
      const blockLines = [];
      let j = i + 1;
      while (j < lines.length && /^\s+/.test(lines[j])) {
        blockLines.push(lines[j].trim());
        j++;
      }
      if (blockLines.length > 0) {
        value = blockLines.join(' ');
        result[key] = value;
        i = j;
        continue;
      }
    }

    // 普通单行值
    result[key] = value;
    i++;
  }

  return result;
}

/**
 * 统计文件行数
 * @param {string} content 文件内容
 * @returns {number}
 */
function countLines(content) {
  if (!content) return 0;
  return content.split('\n').length;
}

/**
 * 格式化校验结果
 * @param {string} checkName 校验名称
 * @param {'pass'|'fail'} status 状态
 * @param {Array} errors 错误数组，每项 { file, rule, message }
 * @param {Array} warnings 警告数组，每项 { file, rule, message }
 * @returns {{ checkName: string, status: string, errors: Array, warnings: Array }}
 */
function formatResult(checkName, status, errors, warnings) {
  return {
    checkName,
    status,
    errors: errors || [],
    warnings: warnings || [],
  };
}

module.exports = {
  readFile,
  fileExists,
  listDir,
  parseFrontmatter,
  countLines,
  formatResult,
};
