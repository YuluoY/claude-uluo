// grade-skill.js 评分工具测试——验证 5 维度评分逻辑与输出格式
// 运行: node scripts/__tests__/grade-skill.test.js
//
// 说明: grade-skill.js 在模块顶层解析 argv 并调用 process.exit，
// 无法通过 require() 复用（会直接退出测试进程），故用 execSync 以子进程方式运行，
// 这也更贴近真实 CLI 调用方式。

const path = require('path');
const { execSync } = require('child_process');
const {
  suite,
  test,
  summary,
  createTempSkill,
  createValidSkill,
  cleanFixtures,
  writeFixture,
} = require('./helpers');

// 评分工具主入口（绝对路径）
const GRADE_SCRIPT = path.resolve(__dirname, '..', 'grade-skill.js');
// uluo-skill-creator 根目录（用于自评测试）
const CREATOR_ROOT = path.resolve(__dirname, '..', '..');

/**
 * 运行 grade-skill.js 子进程
 * @param {string} skillPath skill 根目录
 * @param {boolean} jsonMode 是否使用 --json 模式
 * @returns {{ exitCode: number, stdout: string, json: object|null }}
 */
function runGrade(skillPath, jsonMode) {
  const cmd = jsonMode
    ? `node "${GRADE_SCRIPT}" "${skillPath}" --json`
    : `node "${GRADE_SCRIPT}" "${skillPath}"`;
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

/**
 * 创建一个高质量完整 skill fixture（覆盖 5 维度全部子项，目标得分 ≥ 70）
 * - SKILL.md：含 frontmatter（name + Use this skill 触发条件）、Phase 模型、mermaid、loop、闸门、软硬约束、references 引用、内容结构化（表格/列表/mermaid）
 * - scripts/：含可执行 .js 脚本
 * - scripts/__tests__/：含测试文件
 * - evals/evals.json：含 2+ 用例 + assertions
 * @param {string} name skill 名称
 * @returns {string} skill 根目录绝对路径
 */
function createCompleteSkill(name) {
  const dir = createTempSkill(name);

  // SKILL.md——覆盖 workflow / constraint / documentation 维度全部子项
  writeFixture(
    path.join(dir, 'SKILL.md'),
    [
      '---',
      `name: ${name}`,
      'version: 0.1.0',
      'description: >-',
      '  A complete skill for grading tests. Use this skill when running grade tests.',
      '---',
      '',
      `# ${name}`,
      '',
      '完整 skill 示例，覆盖 5 维度评分。',
      '',
      '## Phase 模型',
      '',
      '十阶段流程编排，含校验回退 loop 闭环。',
      '',
      '| Phase | 名称 | 校验 |',
      '| ----- | ---- | ---- |',
      '| 1 | 需求 | spec.md |',
      '| 2 | 实现 | tests |',
      '',
      '```mermaid',
      'flowchart TD',
      '  A[开始] --> B{校验闸门}',
      '  B -->|pass| C[完成]',
      '  B -->|fail| A',
      '```',
      '',
      '## 软硬约束分工',
      '',
      '- 软约束：md 写 AI 判断部分',
      '- 硬约束：scripts 写确定性校验',
      '',
      '质量闸门：每个 Phase 结束时运行 validate-skill.js 校验。',
      '',
      '详见 [references/spec.md](references/spec.md)。',
      '',
    ].join('\n')
  );

  // scripts/——含可执行 .js 脚本（覆盖 constraint 维度子项 2/4）
  writeFixture(
    path.join(dir, 'scripts', 'check.js'),
    ['// 校验脚本示例', "console.log('ok');", ''].join('\n')
  );

  // scripts/__tests__/——含测试文件（覆盖 testing 维度子项 4）
  writeFixture(
    path.join(dir, 'scripts', '__tests__', 'check.test.js'),
    [
      "const assert = require('assert');",
      "assert.strictEqual(1 + 1, 2);",
      "console.log('test passed');",
      '',
    ].join('\n')
  );

  // evals/evals.json——含 2 个用例 + assertions（覆盖 testing 维度子项 1/2/3）
  writeFixture(
    path.join(dir, 'evals', 'evals.json'),
    JSON.stringify(
      {
        skill_name: name,
        evals: [
          {
            id: 1,
            prompt: 'test prompt 1',
            expected_output: 'expected 1',
            assertions: [{ text: 'assertion 1', type: 'contains' }],
          },
          {
            id: 2,
            prompt: 'test prompt 2',
            expected_output: 'expected 2',
            assertions: [{ text: 'assertion 2', type: 'contains' }],
          },
        ],
      },
      null,
      2
    )
  );

  return dir;
}

const tmpDirs = [];

suite('grade-skill.js 评分测试', () => {
  // 正例：完整合法 skill 评分——目标 B 级以上
  test('正例：完整合法 skill 评分 → 退出码 0，B 级以上，5 维度齐全', () => {
    const dir = createCompleteSkill('complete-skill');
    tmpDirs.push(path.dirname(dir));
    const { exitCode, json } = runGrade(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 0) throw new Error(`期望退出码 0，实际 ${exitCode}`);
    if (typeof json.total_score !== 'number') throw new Error('total_score 应为数字');
    if (json.total_score < 70) throw new Error(`期望 total_score >= 70，实际 ${json.total_score}`);
    if (!['A', 'B'].includes(json.grade)) {
      throw new Error(`期望 grade 为 A 或 B，实际 ${json.grade}`);
    }
    // 5 个维度都有 score
    const dimKeys = ['structure', 'workflow', 'constraint', 'documentation', 'testing'];
    for (const key of dimKeys) {
      const dim = json.dimensions[key];
      if (!dim || typeof dim.score !== 'number') {
        throw new Error(`维度 ${key} 缺失或无 score 字段`);
      }
    }
  });

  // 正例：uluo-skill-creator 自评——目标 A 级
  test('正例：uluo-skill-creator 自评 → 退出码 0，A 级，total_score >= 90', () => {
    const { exitCode, json } = runGrade(CREATOR_ROOT, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 0) throw new Error(`期望退出码 0，实际 ${exitCode}`);
    if (json.grade !== 'A') throw new Error(`期望 grade=A，实际 ${json.grade}`);
    if (json.total_score < 90) {
      throw new Error(`期望 total_score >= 90，实际 ${json.total_score}`);
    }
  });

  // 反例：缺 SKILL.md 的 skill 评分——退出码 1，structure 扣分
  test('反例：缺 SKILL.md → 退出码 1，total_score < 70，structure 有 SKILL.md 扣分', () => {
    const dir = createTempSkill('no-skillmd');
    tmpDirs.push(path.dirname(dir));
    // 不创建 SKILL.md
    const { exitCode, json } = runGrade(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 1) throw new Error(`期望退出码 1，实际 ${exitCode}`);
    if (json.total_score >= 70) {
      throw new Error(`期望 total_score < 70，实际 ${json.total_score}`);
    }
    // structure 维度应有 SKILL.md 相关扣分
    const structDeductions = json.dimensions.structure.deductions || [];
    const hasSkillmdDeduction = structDeductions.some((d) => /SKILL\.md/i.test(d.item));
    if (!hasSkillmdDeduction) {
      throw new Error(`期望 structure deductions 含 SKILL.md 扣分项，实际: ${JSON.stringify(structDeductions)}`);
    }
  });

  // 反例：空目录评分——退出码 1，D 级
  test('反例：空目录 → 退出码 1，grade=D，total_score < 50', () => {
    const dir = createTempSkill('empty-dir');
    tmpDirs.push(path.dirname(dir));
    // 不创建任何文件
    const { exitCode, json } = runGrade(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    if (exitCode !== 1) throw new Error(`期望退出码 1，实际 ${exitCode}`);
    if (json.grade !== 'D') throw new Error(`期望 grade=D，实际 ${json.grade}`);
    if (json.total_score >= 50) {
      throw new Error(`期望 total_score < 50，实际 ${json.total_score}`);
    }
  });

  // 边界：缺 evals 的 skill 评分——testing 维度扣分
  test('边界：缺 evals → testing 维度 score < 20，deductions 含 evals 扣分', () => {
    // createValidSkill 仅创建 SKILL.md，无 evals
    const dir = createValidSkill('no-evals');
    tmpDirs.push(path.dirname(dir));
    const { json } = runGrade(dir, true);
    if (!json) throw new Error('未返回 JSON 输出');
    const testing = json.dimensions.testing;
    if (testing.score >= 20) {
      throw new Error(`期望 testing score < 20，实际 ${testing.score}`);
    }
    const testingDeductions = testing.deductions || [];
    const hasEvalsDeduction = testingDeductions.some((d) => /evals/i.test(d.item));
    if (!hasEvalsDeduction) {
      throw new Error(`期望 testing deductions 含 evals 扣分项，实际: ${JSON.stringify(testingDeductions)}`);
    }
  });

  // 边界：人类可读输出格式（不带 --json）
  test('边界：人类可读输出 → 含报告标题、总分、等级、5 维度名称', () => {
    const dir = createCompleteSkill('human-readable');
    tmpDirs.push(path.dirname(dir));
    const { stdout } = runGrade(dir, false);
    if (!stdout) throw new Error('未返回 stdout 输出');
    if (!stdout.includes('Skill Quality Grade Report')) {
      throw new Error('输出应包含 "Skill Quality Grade Report"');
    }
    if (!stdout.includes('Total Score')) {
      throw new Error('输出应包含 "Total Score"');
    }
    if (!stdout.includes('Grade')) {
      throw new Error('输出应包含 "Grade"');
    }
    // 5 个维度名称
    const dimLabels = ['Structure', 'Workflow', 'Constraint', 'Documentation', 'Testing'];
    for (const label of dimLabels) {
      if (!stdout.includes(label)) {
        throw new Error(`输出应包含维度名称 "${label}"`);
      }
    }
  });
});

// 清理所有临时目录
for (const d of tmpDirs) cleanFixtures(d);

summary();
