'use strict';

const fs = require('fs');
const path = require('path');

const { reset, pass, fail, warn, section, summary, fileExists, dirExists, relative } = require('./reporter');
const { COLORS } = require('./cli');

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

function hasHeading(file, headingPattern) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const re = new RegExp(`^##\\s+${headingPattern}`, 'im');
    return re.test(content);
  } catch {
    return false;
  }
}

const AUTHOR_PLACEHOLDERS = [
  /`git config user\.name`/,
  /git config user\.name/,
  /\[Author Name\]/i,
  /\[作者\]/,
  /TODO/i,
  /FIXME/i,
];

function checkAuthor(content, fname) {
  const metaLine = content.match(/^> 日期:\s*\d{4}-\d{2}-\d{2}\s*\|\s*作者:\s*([^|\n]+?)\s*(?:\||$)/m);
  if (!metaLine) {
    return `${fname}: 缺少元数据行——应包含 "> 日期: YYYY-MM-DD | 作者: <姓名> | ..."`;
  }

  const authorRaw = metaLine[1].trim();
  if (!authorRaw) {
    return `${fname}: 作者字段为空——必须从 git config user.name 获取真实姓名填入`;
  }

  for (const pattern of AUTHOR_PLACEHOLDERS) {
    if (pattern.test(authorRaw)) {
      return `${fname}: 作者字段仍是占位符 "${authorRaw}"——必须运行 git config user.name 获取真实姓名后替换`;
    }
  }

  if (authorRaw.length < 2) {
    return `${fname}: 作者名过短 "${authorRaw}"——应为真实姓名`;
  }

  return null;
}

function checkChangeNumber(content, fname) {
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

function extractImpactItems(content) {
  const items = [];
  const parts = content.split(/^##\s/gm);
  const impactPart = parts.find(p => p.startsWith('影响范围'));
  if (!impactPart) return items;

  const impactContent = impactPart.replace(/^影响范围[^\n]*\n/, '');

  const subParts = impactContent.split(/^###\s/gm).slice(1);
  for (const sub of subParts) {
    const heading = sub.split('\n')[0].trim();
    let dimension = '';
    if (/文档影响/.test(heading)) dimension = '文档';
    else if (/代码影响/.test(heading)) dimension = '代码';
    else if (/设计稿影响/.test(heading)) dimension = '设计稿';
    else continue;

    const rows = sub.match(/^\|.*\|/gm) || [];
    for (const row of rows.slice(2)) {
      const cols = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length < 3) continue;
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

function extractTasks(content) {
  const tasks = [];
  const parts = content.split(/^###\s+(T\d+)\s*[:：]\s*/m);
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

function extractChecklistItems(content) {
  const items = [];
  const lines = content.split('\n');
  let currentGroup = '';

  for (const line of lines) {
    const groupMatch = line.match(/^##\s+(.+)/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      continue;
    }
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
  COLORS,
  checkAuthor, checkChangeNumber,
  extractDeltaItems, extractImpactItems, extractTasks, extractChecklistItems,
};
