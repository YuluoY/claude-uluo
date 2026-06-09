// Lightweight test runner — no external dependencies
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ${GREEN}✓${NC} ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ${RED}✗${NC} ${name}`);
    console.log(`    ${RED}${e.message}${NC}`);
  }
}

// Assert helpers
function hasFail(findings, msgPattern) {
  const found = findings.filter(f => f.type === 'fail' && new RegExp(msgPattern).test(f.msg));
  assert.ok(found.length > 0, `Expected a fail matching "${msgPattern}", got ${findings.filter(f=>f.type==='fail').map(f=>f.msg).join('; ') || 'none'}`);
}

function noFail(findings) {
  const fails = findings.filter(f => f.type === 'fail');
  assert.strictEqual(fails.length, 0, `Expected 0 fails, got: ${fails.map(f => f.msg).join('; ')}`);
}

function hasWarn(findings, msgPattern) {
  const found = findings.filter(f => f.type === 'warn' && new RegExp(msgPattern).test(f.msg));
  assert.ok(found.length > 0, `Expected a warn matching "${msgPattern}", got ${findings.filter(f=>f.type==='warn').map(f=>f.msg).join('; ') || 'none'}`);
}

function hasPass(findings, msgPattern) {
  const found = findings.filter(f => f.type === 'pass' && new RegExp(msgPattern).test(f.msg));
  assert.ok(found.length > 0, `Expected a pass matching "${msgPattern}"`);
}

function suite(name, fn) {
  console.log(`\n${BOLD}${CYAN}${name}${NC}`);
  const beforePassed = passed;
  const beforeFailed = failed;
  fn();
  const sPassed = passed - beforePassed;
  const sFailed = failed - beforeFailed;
  const total = sPassed + sFailed;
  const status = sFailed === 0 ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
  console.log(`  ${status} ${sPassed}/${total} passed`);
}

function summary() {
  const total = passed + failed;
  console.log(`\n${BOLD}──── 测试结果 ────${NC}`);
  console.log(`  ${GREEN}${passed} passed${NC}  ${RED}${failed} failed${NC}  ${total} total`);
  if (failed > 0) {
    console.log(`\n${RED}${BOLD}✗ 测试失败${NC}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✓ 全部测试通过${NC}`);
  }
}

// Write fixture file
function writeFixture(filename, content) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, content);
}

// Clean up fixture dir
function cleanFixtures(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures };
