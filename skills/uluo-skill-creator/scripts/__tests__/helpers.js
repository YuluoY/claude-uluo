// uluo-skill-creator 测试工具——轻量级自定义测试运行器
// 不依赖外部 npm 包（jest/mocha），仅用 Node.js 内置模块
// 适配校验工具返回格式：{ checkName, status, errors, warnings }
//   - status: 'pass' | 'fail'
//   - errors / warnings: Array<{ file, rule, message }>

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

// ── 颜色输出 ──────────────────────────────────────────────
const GREEN = '\x1b[0;32m';
const RED = '\x1b[0;31m';
const YELLOW = '\x1b[0;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

let passed = 0;
let failed = 0;
let skipped = 0;

/**
 * 运行单个测试用例（同步，抛异常即失败）
 * @param {string} name 测试名
 * @param {Function} fn 测试函数
 */
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

/**
 * 跳过测试用例（环境不满足时使用）
 * @param {string} name 测试名
 * @param {string} reason 跳过原因
 */
function skip(name, reason) {
  skipped++;
  console.log(`  ${YELLOW}○${NC} ${name} ${YELLOW}(跳过: ${reason})${NC}`);
}

/**
 * 测试套件——聚合一组测试并输出小计
 * @param {string} name 套件名
 * @param {Function} fn 含多个 test() 调用
 */
function suite(name, fn) {
  console.log(`\n${BOLD}${CYAN}${name}${NC}`);
  const beforePassed = passed;
  const beforeFailed = failed;
  const beforeSkipped = skipped;
  fn();
  const sPassed = passed - beforePassed;
  const sFailed = failed - beforeFailed;
  const sSkipped = skipped - beforeSkipped;
  const total = sPassed + sFailed + sSkipped;
  const status = sFailed === 0 ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
  console.log(
    `  ${status} ${sPassed}/${total} passed${sSkipped > 0 ? `, ${sSkipped} skipped` : ''}`
  );
}

/**
 * 输出总结并设置退出码
 */
function summary() {
  const total = passed + failed + skipped;
  console.log(`\n${BOLD}──── 测试结果 ────${NC}`);
  console.log(
    `  ${GREEN}${passed} passed${NC}  ${RED}${failed} failed${NC}  ${YELLOW}${skipped} skipped${NC}  ${total} total`
  );
  if (failed > 0) {
    console.log(`\n${RED}${BOLD}✗ 测试失败${NC}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✓ 全部测试通过${NC}`);
  }
}

// ── 断言辅助函数（适配 { checkName, status, errors, warnings } 格式）──

/**
 * 断言校验结果为 pass
 * @param {{status:string, errors:Array, warnings:Array}} result
 */
function assertPass(result) {
  assert.strictEqual(
    result.status,
    'pass',
    `期望 status='pass'，实际 '${result.status}'；errors: ${formatItems(result.errors)}`
  );
}

/**
 * 断言校验结果为 fail
 * @param {{status:string, errors:Array, warnings:Array}} result
 */
function assertFail(result) {
  assert.strictEqual(result.status, 'fail', `期望 status='fail'，实际 '${result.status}'`);
}

/**
 * 断言 errors 中有匹配的消息（message 字段）
 * @param {{errors:Array}} result
 * @param {string|RegExp} msgPattern 消息匹配模式
 */
function assertHasError(result, msgPattern) {
  const re = msgPattern instanceof RegExp ? msgPattern : new RegExp(msgPattern);
  const found = (result.errors || []).filter((e) => re.test(e.message));
  assert.ok(
    found.length > 0,
    `期望 errors 中有匹配 ${msgPattern} 的项，实际 errors: ${formatItems(result.errors)}`
  );
}

/**
 * 断言 warnings 中有匹配的消息（message 字段）
 * @param {{warnings:Array}} result
 * @param {string|RegExp} msgPattern 消息匹配模式
 */
function assertHasWarning(result, msgPattern) {
  const re = msgPattern instanceof RegExp ? msgPattern : new RegExp(msgPattern);
  const found = (result.warnings || []).filter((w) => re.test(w.message));
  assert.ok(
    found.length > 0,
    `期望 warnings 中有匹配 ${msgPattern} 的项，实际 warnings: ${formatItems(result.warnings)}`
  );
}

/**
 * 断言 errors 为空
 * @param {{errors:Array}} result
 */
function assertNoErrors(result) {
  assert.strictEqual(
    (result.errors || []).length,
    0,
    `期望无 errors，实际: ${formatItems(result.errors)}`
  );
}

// ── 内部格式化 ────────────────────────────────────────────
function formatItems(items) {
  if (!items || items.length === 0) return '[]';
  return '[' + items.map((i) => `[${i.rule}] ${i.message}`).join(' | ') + ']';
}

// ── Fixture 工具 ──────────────────────────────────────────

/**
 * 写入 fixture 文件（自动创建父目录）
 * @param {string} filename 文件绝对路径
 * @param {string} content 文件内容
 */
function writeFixture(filename, content) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, content);
}

/**
 * 清理 fixture 目录
 * @param {string} dir 目录绝对路径
 */
function cleanFixtures(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * 创建临时 skill 目录（空骨架）——目录名等于 name（满足 skillmd name 一致性校验）
 * @param {string} name skill 名称（同时作为目录名）
 * @returns {string} skill 根目录绝对路径
 */
function createTempSkill(name) {
  const parent = path.join(
    os.tmpdir(),
    `uluo-skill-tests-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const dir = path.join(parent, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 创建一个合法的临时 skill（可通过所有校验）
 * - SKILL.md：name 与目录名一致，description 含 "Use this skill" 触发条件，body < 500 行
 * @param {string} name skill 名称（同时作为目录名）
 * @returns {string} skill 根目录绝对路径
 */
function createValidSkill(name) {
  const dir = createTempSkill(name);
  writeFixture(
    path.join(dir, 'SKILL.md'),
    [
      '---',
      `name: ${name}`,
      'version: 0.1.0',
      'description: >-',
      '  A valid skill for testing. Use this skill when running validation tests.',
      '---',
      '',
      `# ${name}`,
      '',
      'Test skill body.',
      '',
    ].join('\n')
  );
  return dir;
}

module.exports = {
  test,
  skip,
  suite,
  summary,
  assertPass,
  assertFail,
  assertHasError,
  assertHasWarning,
  assertNoErrors,
  writeFixture,
  cleanFixtures,
  createTempSkill,
  createValidSkill,
};
