'use strict';

const fs = require('fs');
const path = require('path');

/** 只处理文章类文件；源代码、配置、数据文件一律拒绝 */
const PROSE_EXT = new Set(['.md', '.markdown', '.mdx', '.txt', '.text', '.rst', '.adoc', '.org']);

class RefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RefusedError';
  }
}

function readInput(arg) {
  if (!arg || arg === '-') {
    return { text: fs.readFileSync(0, 'utf8'), file: '<stdin>' };
  }
  const file = path.resolve(arg);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`文件不存在：${arg}`);
  }
  const ext = path.extname(file).toLowerCase();
  if (!PROSE_EXT.has(ext)) {
    throw new RefusedError(
      `拒绝处理 ${path.basename(file)}：只处理文章类文件（${[...PROSE_EXT].join(' ')}）。源代码、配置、数据文件不在本 skill 范围内。`
    );
  }
  return { text: fs.readFileSync(file, 'utf8'), file: arg };
}

module.exports = { PROSE_EXT, RefusedError, readInput };
