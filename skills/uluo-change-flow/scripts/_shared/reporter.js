'use strict';

const fs = require('fs');
const path = require('path');

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

function pass(msg) {
  console.log(`  ${GREEN}✓${NC} ${msg}`);
  state.pass++;
}

function fail(msg) {
  console.log(`  ${RED}✗${NC} ${msg}`);
  state.fail++;
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${NC} ${msg}`);
  state.warn++;
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}── ${title}${NC}`);
}

function fileExists(base, rel) {
  return fs.existsSync(path.join(base, rel));
}

function dirExists(base, rel) {
  const p = path.join(base, rel);
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function relative(base, file) {
  return path.relative(base, file);
}

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

module.exports = { reset, pass, fail, warn, section, summary, fileExists, dirExists, relative };
