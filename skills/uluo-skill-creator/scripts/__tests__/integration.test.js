// 集成测试——校验 validate-skill.js 主编排器的端到端行为
// 运行: node scripts/__tests__/integration.test.js
//
// 说明: validate-skill.js 在模块顶层解析 argv 并调用 process.exit，
// 无法通过 require() 复用（会直接退出测试进程），故用 execSync 以子进程方式运行，
// 这也更贴近真实 CLI 调用方式。

const path = require('path');
const { execSync } = require('child_process');
const {
  suite,
  test,
  summary,
  createValidSkill,
  createTempSkill,
  cleanFixtures,
} = require('./helpers');

// 校验工具主入口（绝对路径）
const VALIDATE_SCRIPT = path.resolve(__dirname, '..', 'validate-skill.js');

/**
 * 运行 validate-skill.js 子进程
 * @param {string} skillPath skill 根目录
 * @param {boolean} jsonMode 是否使用 --json 模式
 * @returns {{ exitCode: number, stdout: string, json: object|null }}
 */
function runValidate(skillPath, jsonMode) {
  const cmd = jsonMode
    ? `node "${VALIDATE_SCRIPT}" "${skillPath}" --json`
    : `node "${VALIDATE_SCRIPT}" "${skillPath}"`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { exitCode: 0, stdout, json: jsonMode ? JSON.parse(stdout) : null };
  } catch (e) {
    const stdout = e.stdout ? e.stdout.toString() : '';
    return {
      exitCode: typeof e.status === 'number' ? e.status : 1,
      stdout,
      json: jsonMode && stdout ? safeParse(stdout) : null,
    };
  }
}

// 安全 JSON 解析（失败返回 null，避免掩盖真实错误）
function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const tmpDirs = [];

suite('集成测试：validate-skill.js', () => {
  // 正例：合法 skill 完整校验——3 项全 pass
  test('正例：合法 skill 完整校验 → 总体 pass，3 项全 pass', () => {
    const dir = createValidSkill('valid-integration');
    tmpDirs.push(path.dirname(dir));
    const { exitCode, json } = runValidate(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 0) throw new Error(`期望退出码 0，实际 ${exitCode}`);
    if (json.overall !== 'pass') throw new Error(`期望 overall=pass，实际 ${json.overall}`);
    if (!Array.isArray(json.checks) || json.checks.length !== 3) {
      throw new Error(`期望 3 项 checks，实际 ${json.checks ? json.checks.length : 0}`);
    }
    for (const c of json.checks) {
      if (c.status !== 'pass') {
        throw new Error(`期望 ${c.checkName}=pass，实际 ${c.status}`);
      }
    }
  });

  // 反例：非法 skill 完整校验——缺 SKILL.md
  test('反例：非法 skill 完整校验 → 总体 fail，列出具体问题', () => {
    const dir = createTempSkill('invalid-integration');
    tmpDirs.push(path.dirname(dir));
    // 不创建 SKILL.md（缺必需文件）
    const { exitCode, json } = runValidate(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 1) throw new Error(`期望退出码 1，实际 ${exitCode}`);
    if (json.overall !== 'fail') throw new Error(`期望 overall=fail，实际 ${json.overall}`);
    // structure 校验应 fail（缺 SKILL.md）
    const structure = json.checks.find((c) => c.checkName === 'structure');
    if (!structure || structure.status !== 'fail') {
      throw new Error('期望 structure=fail');
    }
    // 应提及 SKILL.md 缺失
    const hasSkillmdError = structure.errors.some((e) => /SKILL\.md/.test(e.message));
    if (!hasSkillmdError) throw new Error('期望 structure errors 提及 SKILL.md');
  });

  // 正例：--json 输出格式正确
  test('正例：--json 输出格式正确（含 overall + checks 数组）', () => {
    const dir = createValidSkill('json-output');
    tmpDirs.push(path.dirname(dir));
    const { json } = runValidate(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (typeof json.overall !== 'string') throw new Error('overall 应为字符串');
    if (!['pass', 'fail'].includes(json.overall)) {
      throw new Error(`overall 值非法: ${json.overall}`);
    }
    if (!Array.isArray(json.checks)) throw new Error('checks 应为数组');
    for (const c of json.checks) {
      if (typeof c.checkName !== 'string') throw new Error('checkName 应为字符串');
      if (!['pass', 'fail'].includes(c.status)) {
        throw new Error(`status 值非法: ${c.status}`);
      }
      if (!Array.isArray(c.errors)) throw new Error('errors 应为数组');
      if (!Array.isArray(c.warnings)) throw new Error('warnings 应为数组');
    }
  });
});

for (const d of tmpDirs) cleanFixtures(d);

summary();
