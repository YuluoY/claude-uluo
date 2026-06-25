// 脚本可执行性校验测试——校验 scripts-executable.check 的正例/反例
// 运行: node scripts/__tests__/scripts-executable.test.js

const path = require('path');
const { execSync } = require('child_process');
const {
  suite,
  test,
  skip,
  summary,
  assertPass,
  assertFail,
  assertHasError,
  createTempSkill,
  cleanFixtures,
  writeFixture,
} = require('./helpers');

const { check } = require('../checks/scripts-executable');

// 检测 python 命令是否可用（校验工具使用 `python` 而非 `python3`）
function hasPython() {
  try {
    execSync('python --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const pythonAvailable = hasPython();
const tmpDirs = [];

suite('scripts-executable 校验', () => {
  // 正例：无 scripts 目录 → pass（跳过）
  test('正例：无 scripts 目录 → pass', () => {
    const dir = createTempSkill('no-scripts');
    tmpDirs.push(path.dirname(dir));
    const result = check(dir);
    assertPass(result);
  });

  // 正例：合法 .js 脚本
  test('正例：合法 .js 脚本 → pass', () => {
    const dir = createTempSkill('valid-js');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'scripts', 'ok.js'),
      'const x = 1;\nmodule.exports = x;\n'
    );
    const result = check(dir);
    assertPass(result);
  });

  // 反例：.js 语法错误
  test('反例：.js 语法错误 → fail，错误提及文件名', () => {
    const dir = createTempSkill('bad-js');
    tmpDirs.push(path.dirname(dir));
    writeFixture(path.join(dir, 'scripts', 'bad.js'), 'function {\n');
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /bad\.js/);
  });

  // 反例：.js 含非法依赖 require('claude')
  test('反例：.js 含非法依赖 require("claude") → fail', () => {
    const dir = createTempSkill('illegal-dep');
    tmpDirs.push(path.dirname(dir));
    writeFixture(
      path.join(dir, 'scripts', 'dep.js'),
      "const c = require('claude');\nmodule.exports = c;\n"
    );
    const result = check(dir);
    assertFail(result);
    assertHasError(result, /非法/);
  });

  // 正例：合法 .py 脚本（需 python）
  // 反例：.py 语法错误（需 python）
  // 说明：校验工具调用 `python -m py_compile`，若环境无 python 命令则跳过
  if (pythonAvailable) {
    test('正例：合法 .py 脚本 → pass', () => {
      const dir = createTempSkill('valid-py');
      tmpDirs.push(path.dirname(dir));
      writeFixture(path.join(dir, 'scripts', 'ok.py'), 'print("hello")\n');
      const result = check(dir);
      assertPass(result);
    });

    test('反例：.py 语法错误 → fail', () => {
      const dir = createTempSkill('bad-py');
      tmpDirs.push(path.dirname(dir));
      writeFixture(path.join(dir, 'scripts', 'bad.py'), 'def (\n');
      const result = check(dir);
      assertFail(result);
      assertHasError(result, /py_compile/);
    });
  } else {
    skip('正例：合法 .py 脚本 → pass', '环境无 python 命令');
    skip('反例：.py 语法错误 → fail', '环境无 python 命令');
  }
});

for (const d of tmpDirs) cleanFixtures(d);

summary();
