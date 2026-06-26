'use strict';

const fs = require('fs');
const path = require('path');

const {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, relative,
} = require('./reporter');

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

function findFeatureDirs(specsRootDir) {
  const result = [];

  function walk(dir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

    if (fs.existsSync(path.join(dir, 'spec.md'))) {
      result.push(dir);
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      }
    }
  }

  walk(specsRootDir);
  return result;
}

function findDesignDocs(specsRootDir) {
  const result = [];
  if (!fs.existsSync(specsRootDir) || !fs.statSync(specsRootDir).isDirectory()) return result;

  function walk(dir, depth) {
    if (depth === undefined) depth = 0;
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && fs.existsSync(path.join(fullPath, 'spec.md'))) continue;

      if (entry.isDirectory() && (entry.name === 'features' || entry.name === 'designs')) {
        walk(fullPath, depth + 1);
        continue;
      }

      if (depth === 0) {
        if (entry.isFile() && /^roadmap-.*\.md$/.test(entry.name)) {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'roadmap', layer: 'L0' });
        }
        if (entry.isFile() && /^tech-selection-.*\.md$/.test(entry.name)) {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'tech-selection', layer: 'L0' });
        }
        if (entry.isDirectory() && entry.name === 'architecture') {
          result.push({ path: path.relative(specsRootDir, fullPath), type: 'architecture', layer: 'L0' });
        }

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

module.exports = {
  reset, pass, fail, warn, section, summary,
  fileExists, dirExists, collectMdFiles, findFeatureDirs, findDesignDocs, detectDocType, hasHeading, relative,
  checkAuthor,
};
