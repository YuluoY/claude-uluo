// SKILL.md 内容校验测试——校验 skillmd.check 的正例/反例
// 运行: node scripts/__tests__/skillmd.test.js

const path = require('path');
const {
  suite,
  test,
  summary,
  assertPass,
  assertFail,
  assertHasError,
  assertHasWarning,
  createTempSkill,
  cleanFixtures,
  writeFixture,
} = require('./helpers');

const { check } = require('../checks/skillmd');

const tmpDirs = [];

// 生成指定行数的 body 内容（每行独立，用 \n 连接）
function bodyOf(lineCount) {
  return Array(lineCount).fill('some content line').join('\n');
}

suite('skillmd 校验', () => {
  // 正例：完整 frontmatter——name + version + description 含 "Use when"
  test('正例：完整 frontmatter（含 version），description 含 "Use when" → pass', () => {
    const dir = createTempSkill('valid-skill');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: valid-skill\nversion: 0.1.0\ndescription: >-\n  A test skill. Use when running tests.\n---\n\n# valid-skill\n'
    );
    const result = check(dir);
    assertPass(result);
  });

  // 正例：description 含 "Use this skill"
  test('正例：description 含 "Use this skill" → pass', () => {
    const dir = createTempSkill('valid-skill2');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: valid-skill2\nversion: 1.0.0\ndescription: Use this skill for testing.\n---\n\n# valid-skill2\n'
    );
    const result = check(dir);
    assertPass(result);
  });

  // 正例：version 含 pre-release 标识
  test('正例：version 含 pre-release（0.1.0-beta.1）→ pass', () => {
    const dir = createTempSkill('pre-release');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: pre-release\nversion: 0.1.0-beta.1\ndescription: Use when testing.\n---\n\n# pre-release\n'
    );
    const result = check(dir);
    assertPass(result);
  });

  // 反例：name 与目录名不一致
  test('反例：name 与目录名不一致 → fail', () => {
    const dir = createTempSkill('my-skill');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: other-name\nversion: 0.1.0\ndescription: Use when testing.\n---\n\n# other-name\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /不一致/);
  });

  // 反例：description 缺触发条件
  test('反例：description 缺触发条件 → fail', () => {
    const dir = createTempSkill('no-trigger');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: no-trigger\nversion: 0.1.0\ndescription: A skill without trigger.\n---\n\n# no-trigger\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /触发条件/);
  });

  // 反例：name 为空
  test('反例：name 为空 → fail', () => {
    const dir = createTempSkill('empty-name');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname:\nversion: 0.1.0\ndescription: Use when testing.\n---\n\n# empty-name\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /name 字段为空/);
  });

  // 反例：description 为空
  test('反例：description 为空 → fail', () => {
    const dir = createTempSkill('empty-desc');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: empty-desc\nversion: 0.1.0\ndescription:\n---\n\n# empty-desc\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /description 字段为空/);
  });

  // 反例：version 缺失
  test('反例：version 缺失 → fail', () => {
    const dir = createTempSkill('no-version');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: no-version\ndescription: Use when testing.\n---\n\n# no-version\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /version 字段为空/);
  });

  // 反例：version 不符合 semver 格式
  test('反例：version 不符合 semver 格式 → fail', () => {
    const dir = createTempSkill('bad-version');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'SKILL.md'),
      '---\nname: bad-version\nversion: v1\ndescription: Use when testing.\n---\n\n# bad-version\n'
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /semver 格式/);
  });

  // 正例：body 行数 < 300 → pass（无 warning）
  test('正例：body 行数 < 300 → pass，无行数 warning', () => {
    const dir = createTempSkill('ok-lines');
    tmpDirs.push(path.dirname(dir));
    const content =
      '---\nname: ok-lines\nversion: 0.1.0\ndescription: Use when testing.\n---\n' + bodyOf(200);
    writeFixture(path.join(dir, 'SKILL.md'), content);
    const result = check(dir);
    assertPass(result);
    // 不应有行数相关 warning
    const lineWarnings = (result.warnings || []).filter((w) => w.rule === 'line-count-warning');
    if (lineWarnings.length > 0) {
      throw new Error(`期望无行数 warning，实际: ${JSON.stringify(lineWarnings)}`);
    }
  });

  // warning：body 行数 300-500 → 软警告，不 fail
  test('warning：body 行数 300-500 → warning，不 fail', () => {
    const dir = createTempSkill('soft-warn-lines');
    tmpDirs.push(path.dirname(dir));
    const content =
      '---\nname: soft-warn-lines\nversion: 0.1.0\ndescription: Use when testing.\n---\n' + bodyOf(400);
    writeFixture(path.join(dir, 'SKILL.md'), content);
    const result = check(dir);
    assertPass(result);
    assertHasWarning(result, /超过 300 行——建议拆分/);
  });

  // 强警告：body 行数 500-799 → warning，不 fail
  test('强警告：body 行数 500-799 → warning，不 fail', () => {
    const dir = createTempSkill('warn-lines');
    tmpDirs.push(path.dirname(dir));
    const content =
      '---\nname: warn-lines\nversion: 0.1.0\ndescription: Use when testing.\n---\n' + bodyOf(600);
    writeFixture(path.join(dir, 'SKILL.md'), content);
    const result = check(dir);
    assertPass(result);
    assertHasWarning(result, /强警告/);
  });

  // 反例：行数 ≥ 800
  test('反例：body 行数 ≥ 800 → fail', () => {
    const dir = createTempSkill('fail-lines');
    tmpDirs.push(path.dirname(dir));
    const content =
      '---\nname: fail-lines\nversion: 0.1.0\ndescription: Use when testing.\n---\n' + bodyOf(850);
    writeFixture(path.join(dir, 'SKILL.md'), content);
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /上限/);
  });
});

for (const d of tmpDirs) cleanFixtures(d);

summary();
