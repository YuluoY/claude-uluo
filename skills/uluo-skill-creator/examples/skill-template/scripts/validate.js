#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

let jsonMode = false;
let target = null;

for (const arg of process.argv.slice(2)) {
  if (arg === '--json') jsonMode = true;
  else if (!target) target = arg;
}

if (!target) {
  console.log('用法: node scripts/validate.js <skill-path> [--json]');
  console.log('');
  console.log('参数:');
  console.log('  <skill-path>  skill 目录路径');
  console.log('  --json         以 JSON 格式输出（便于 AI 解析）');
  console.log('');
  console.log('退出码: 0 = 通过, 1 = 失败');
  process.exit(1);
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`错误: 目录不存在: ${target}`);
  process.exit(1);
}

const skillPath = path.resolve(target);

const results = [];

function checkSkillMdExists() {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  const exists = fs.existsSync(skillMdPath);
  return {
    checkName: 'SKILL.md 存在性检查',
    status: exists ? 'pass' : 'fail',
    errors: exists ? [] : [{ rule: 'required-file', file: 'SKILL.md', message: 'SKILL.md 文件必须存在' }],
    warnings: []
  };
}

function checkPluginJsonExists() {
  const pluginJsonPath = path.join(skillPath, '.claude-plugin', 'plugin.json');
  const exists = fs.existsSync(pluginJsonPath);
  return {
    checkName: '.claude-plugin/plugin.json 存在性检查',
    status: exists ? 'pass' : 'warn',
    errors: [],
    warnings: exists ? [] : [{ rule: 'recommended-file', file: '.claude-plugin/plugin.json', message: '建议创建 .claude-plugin/plugin.json 用于 plugin 分发' }]
  };
}

results.push(checkSkillMdExists());
results.push(checkPluginJsonExists());

const overallStatus = results.some((r) => r.status === 'fail') ? 'fail' : 'pass';

if (jsonMode) {
  console.log(JSON.stringify({ overall: overallStatus, checks: results }, null, 2));
} else {
  console.log(`\n${BOLD}校验 skill: ${CYAN}${path.basename(skillPath)}${NC}`);
  console.log('─────────────────────────────────────────');

  for (const r of results) {
    const icon = r.status === 'pass' ? `${GREEN}✓${NC}` : r.status === 'fail' ? `${RED}✗${NC}` : `${YELLOW}⚠${NC}`;
    console.log(`\n${BOLD}${icon} ${r.checkName}${NC}`);

    for (const err of r.errors) {
      console.log(`  ${RED}✗${NC} [${err.rule}] ${err.file}: ${err.message}`);
    }
    for (const warn of r.warnings) {
      console.log(`  ${YELLOW}⚠${NC} [${warn.rule}] ${warn.file}: ${warn.message}`);
    }
    if (r.errors.length === 0 && r.warnings.length === 0) {
      console.log(`  ${GREEN}无问题${NC}`);
    }
  }

  console.log(`\n${BOLD}── 总体结论 ──${NC}`);
  if (overallStatus === 'pass') {
    const hasWarnings = results.some(r => r.warnings.length > 0);
    if (hasWarnings) {
      console.log(`${YELLOW}${BOLD}⚠ 校验通过（有警告）${NC}`);
    } else {
      console.log(`${GREEN}${BOLD}✓ 全部校验通过${NC}`);
    }
  } else {
    console.log(`${RED}${BOLD}✗ 校验未通过——请修复上述失败项${NC}`);
  }
  console.log('');
}

process.exit(overallStatus === 'pass' ? 0 : 1);
