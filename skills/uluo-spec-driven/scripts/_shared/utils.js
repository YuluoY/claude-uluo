'use strict';

const fs = require('fs');

const BLOCK_INDICATORS = ['>-', '>', '|-', '|'];

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function listDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

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

    if (BLOCK_INDICATORS.includes(value)) {
      const foldedLines = [];
      i++;
      while (i < lines.length && /^\s+/.test(lines[i])) {
        foldedLines.push(lines[i].trim());
        i++;
      }
      value = foldedLines.join(' ');
      result[key] = value;
      continue;
    }

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

    result[key] = value;
    i++;
  }

  return result;
}

function countLines(content) {
  if (!content) return 0;
  return content.split('\n').length;
}

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
