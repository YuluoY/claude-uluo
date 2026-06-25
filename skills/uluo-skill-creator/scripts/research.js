#!/usr/bin/env node
// ─────────────────────────────────────────────────────────
// uluo-skill-creator 通用渠道调研脚本——L1 通用调研渠道固化
//
// 功能:
//   1. 扫描本地 skills/ 目录，查找类似 skill（基于关键词匹配）
//   2. 扫描 anthropics/skills 仓库（本地缓存或提示 GitHub raw 获取）
//   3. 输出 JSON 格式的类似 skill 列表
//
// 用法:
//   node scripts/research.js <keywords>
//   node scripts/research.js <keywords> --json
//   node scripts/research.js <keywords> --skills-dir <path>
//
// 退出码: 0 (成功); 1 (错误)
// ─────────────────────────────────────────────────────────

const path = require('path');
const fs = require('fs');
const os = require('os');

const { readFile, listDir, parseFrontmatter } = require('./lib/utils');

// ── 颜色输出 ──────────────────────────────────────────────
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

// anthropics/skills 本地缓存路径
const ANTHROPICS_CACHE_DIR = path.join(os.homedir(), '.cache', 'anthropics-skills', 'skills');

// ─────────────────────────────────────────────────────────
// 核心函数
// ─────────────────────────────────────────────────────────

/**
 * 关键词匹配——将 keywords 按空格分割，检查 text 中是否包含关键词
 * @param {string} text 待匹配文本（name + description）
 * @param {string[]} keywords 关键词数组（已分割）
 * @returns {{ count: number, relevance: 'high'|'medium'|'low'|null }}
 */
function matchKeywords(text, keywords) {
  if (!text || keywords.length === 0) {
    return { count: 0, relevance: null };
  }

  const lowerText = text.toLowerCase();
  let count = 0;
  for (const kw of keywords) {
    const trimmed = kw.trim().toLowerCase();
    if (trimmed && lowerText.includes(trimmed)) {
      count++;
    }
  }

  let relevance = null;
  if (count >= 2) {
    relevance = 'high';
  } else if (count === 1) {
    relevance = 'medium';
  }

  return { count, relevance };
}

/**
 * 扫描本地 skills/ 目录，查找类似 skill
 * @param {string} skillsDir skills 目录绝对路径
 * @param {string[]} keywords 关键词数组
 * @returns {Array} 匹配的 skill 列表
 */
function scanLocalSkills(skillsDir, keywords) {
  const results = [];

  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return results;
  }

  const entries = listDir(skillsDir);
  for (const entry of entries) {
    const skillPath = path.join(skillsDir, entry);
    let stat;
    try {
      stat = fs.statSync(skillPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    // 读取 SKILL.md
    const skillmdPath = path.join(skillPath, 'SKILL.md');
    const content = readFile(skillmdPath);
    if (!content) continue;

    const fm = parseFrontmatter(content);
    const name = (fm && fm.name) || entry;
    const description = (fm && fm.description) || '';

    const text = `${name} ${description}`;
    const { count, relevance } = matchKeywords(text, keywords);

    if (relevance === null) continue;

    results.push({
      name,
      path: path.relative(skillsDir, skillPath),
      description,
      relevance,
      matched_keywords: count,
      source: 'local',
    });
  }

  // 按 relevance 排序：high > medium
  const order = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => order[a.relevance] - order[b.relevance]);
  return results;
}

/**
 * 扫描 anthropics/skills 仓库（本地缓存）
 * @param {string[]} keywords 关键词数组
 * @returns {{ results: Array, hint: string|null }}
 */
function scanAnthropicsSkills(keywords) {
  const results = [];

  if (!fs.existsSync(ANTHROPICS_CACHE_DIR) || !fs.statSync(ANTHROPICS_CACHE_DIR).isDirectory()) {
    return {
      results,
      hint:
        'anthropics/skills 本地缓存不存在（~/.cache/anthropics-skills/skills/）。' +
        '请使用 WebFetch 获取 https://github.com/anthropics/skills 或克隆仓库到缓存路径后重试。',
    };
  }

  const entries = listDir(ANTHROPICS_CACHE_DIR);
  for (const entry of entries) {
    const skillPath = path.join(ANTHROPICS_CACHE_DIR, entry);
    let stat;
    try {
      stat = fs.statSync(skillPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    const skillmdPath = path.join(skillPath, 'SKILL.md');
    const content = readFile(skillmdPath);
    if (!content) continue;

    const fm = parseFrontmatter(content);
    const name = (fm && fm.name) || entry;
    const description = (fm && fm.description) || '';

    const text = `${name} ${description}`;
    const { count, relevance } = matchKeywords(text, keywords);

    if (relevance === null) continue;

    results.push({
      name,
      path: `skills/${entry}`,
      description,
      relevance,
      matched_keywords: count,
      source: 'anthropics',
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => order[a.relevance] - order[b.relevance]);
  return { results, hint: null };
}

// ─────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────

// ── 参数解析 ──────────────────────────────────────────────
let keywordsRaw = null;
let jsonMode = false;
let skillsDirArg = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--json') {
    jsonMode = true;
  } else if (arg === '--skills-dir') {
    skillsDirArg = args[i + 1];
    i++;
  } else if (!keywordsRaw) {
    keywordsRaw = arg;
  }
}

if (!keywordsRaw) {
  console.log('用法: node scripts/research.js <keywords> [--json] [--skills-dir <path>]');
  console.log('');
  console.log('参数:');
  console.log('  <keywords>       关键词（空格分隔，建议用引号包裹，如 "react component"）');
  console.log('  --json           以 JSON 格式输出（便于 AI 解析）');
  console.log('  --skills-dir     指定本地 skills 目录路径（默认: ../../skills/）');
  console.log('');
  console.log('退出码: 0 (成功); 1 (错误)');
  process.exit(1);
}

const keywords = keywordsRaw.split(/\s+/).filter(Boolean);

// 默认 skills-dir：相对于脚本位置向上两级（即 claude-uluo/skills/）
// 脚本位于 <repo>/skills/uluo-skill-creator/scripts/，../../ 即 <repo>/skills/
const defaultSkillsDir = path.resolve(__dirname, '..', '..');
const skillsDir = skillsDirArg ? path.resolve(skillsDirArg) : defaultSkillsDir;

if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
  console.error(`${RED}错误: skills 目录不存在: ${skillsDir}${NC}`);
  process.exit(1);
}

// ── 执行调研 ──────────────────────────────────────────────
const localSkills = scanLocalSkills(skillsDir, keywords);
const { results: anthropicsSkills, hint } = scanAnthropicsSkills(keywords);

// ── 输出结果 ──────────────────────────────────────────────
if (jsonMode) {
  const output = {
    keywords,
    local_skills: localSkills,
    anthropics_skills: anthropicsSkills,
    summary: {
      total_local: localSkills.length,
      total_anthropics: anthropicsSkills.length,
      total: localSkills.length + anthropicsSkills.length,
    },
  };
  if (hint) output.hint = hint;
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`\n${BOLD}Skill Research Report${NC}`);
  console.log('======================');
  console.log(`Keywords: ${CYAN}${keywords.join(' ')}${NC}`);
  console.log(`Skills Dir: ${skillsDir}`);

  console.log(`\n${BOLD}Local Skills (${localSkills.length})${NC}`);
  if (localSkills.length === 0) {
    console.log(`  ${YELLOW}无匹配的本地 skill${NC}`);
  } else {
    for (const s of localSkills) {
      const color = s.relevance === 'high' ? GREEN : s.relevance === 'medium' ? YELLOW : '';
      console.log(`  ${color}[${s.relevance}]${NC} ${s.name} — ${s.path}`);
      if (s.description) {
        console.log(`      ${s.description.slice(0, 100)}${s.description.length > 100 ? '...' : ''}`);
      }
    }
  }

  console.log(`\n${BOLD}Anthropics Skills (${anthropicsSkills.length})${NC}`);
  if (hint) {
    console.log(`  ${YELLOW}${hint}${NC}`);
  } else if (anthropicsSkills.length === 0) {
    console.log(`  ${YELLOW}无匹配的 anthropics skill${NC}`);
  } else {
    for (const s of anthropicsSkills) {
      const color = s.relevance === 'high' ? GREEN : s.relevance === 'medium' ? YELLOW : '';
      console.log(`  ${color}[${s.relevance}]${NC} ${s.name} — ${s.path}`);
      if (s.description) {
        console.log(`      ${s.description.slice(0, 100)}${s.description.length > 100 ? '...' : ''}`);
      }
    }
  }

  const total = localSkills.length + anthropicsSkills.length;
  console.log(`\n${BOLD}Summary${NC}: ${total} matched (local: ${localSkills.length}, anthropics: ${anthropicsSkills.length})`);
  console.log('');
}

process.exit(0);
