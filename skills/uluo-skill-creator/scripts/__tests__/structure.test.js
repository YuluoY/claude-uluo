// 目录结构校验测试——校验 structure.check 的正例/反例
// 运行: node scripts/__tests__/structure.test.js

const path = require('path');
const fs = require('fs');
const {
  suite,
  test,
  summary,
  assertPass,
  assertFail,
  assertHasError,
  assertHasWarning,
  assertNoErrors,
  writeFixture,
  createTempSkill,
  cleanFixtures,
} = require('./helpers');

const { check } = require('../checks/structure');

// 收集所有临时父目录，测试结束后统一清理
const tmpDirs = [];

suite('structure 校验', () => {
  // 正例：完整结构——SKILL.md
  test('正例：完整结构 → pass', () => {
    const dir = createTempSkill('full-skill');
    tmpDirs.push(path.dirname(dir));
    writeFixture(path.join(dir, 'SKILL.md'), '# full-skill\n');
    const result = check(dir);
    assertPass(result);
    assertNoErrors(result);
  });

  // 反例：缺 SKILL.md
  test('反例：缺 SKILL.md → fail，错误提及 SKILL.md', () => {
    const dir = createTempSkill('no-skillmd');
    tmpDirs.push(path.dirname(dir));
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /SKILL\.md/);
  });

  // warning：非规范目录名
  test('warning：非规范目录名 foo/ → warning，不 fail', () => {
    const dir = createTempSkill('warn-dir');
    tmpDirs.push(path.dirname(dir));
    writeFixture(path.join(dir, 'SKILL.md'), '# warn-dir\n');
    // 创建非规范目录 foo/
    fs.mkdirSync(path.join(dir, 'foo'), { recursive: true });
    const result = check(dir);
    assertPass(result); // warning 不导致 fail
    assertHasWarning(result, /foo/);
  });
});

// 统一清理临时目录
for (const d of tmpDirs) cleanFixtures(d);

summary();
