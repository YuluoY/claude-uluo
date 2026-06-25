// change-tasks.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/change-tasks');

const FIXTURES = path.join(__dirname, 'fixtures');
const TASKS = path.join(FIXTURES, 'tasks-test.md');

cleanFixtures(FIXTURES);

// 元数据行（合规）
const META = '> 日期: 2026-06-25 | 作者: 张三 | 关联变更 plan: ./plan.md';

// ────────────────────────────────────────────────────────
suite('change-tasks — 正例', () => {
  test('pass: 完整合规文档（元数据/执行任务清单/目标文件/任务类型/任务描述）', () => {
    writeFixture(TASKS, `# 测试变更 Tasks\n${META}\n## 执行任务清单\n### T1: 修改导出服务\n- **目标文件**: \`src/modules/export/service.js\`\n- **任务类型**: 代码\n- **任务描述**: 修改导出服务的 CSV 生成逻辑\n- **需调研**: 否\n- **依赖**: 无\n### T2: 新增文档章节\n- **目标文件**: \`specs/test/spec.md\`\n- **任务类型**: 文档\n- **任务描述**: 新增 FR-3 功能需求章节\n- **需调研**: 是 — 建议调研方式: WebSearch\n- **依赖**: T1`);
    const f = check(TASKS);
    noFail(f);
    hasPass(f, '执行任务清单');
    hasPass(f, '所有任务均含.*目标文件');
    hasPass(f, '所有任务类型均为合法值');
    hasPass(f, '所有任务描述均动词开头');
  });

  test('pass: 任务描述动词开头（修改/新增/删除/重构）', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 修改服务\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 代码\n- **任务描述**: 修改服务逻辑\n- **需调研**: 否\n- **依赖**: 无\n### T2: 新增文档\n- **目标文件**: \`docs/b.md\`\n- **任务类型**: 文档\n- **任务描述**: 新增文档章节\n- **需调研**: 否\n- **依赖**: T1\n### T3: 删除旧代码\n- **目标文件**: \`src/c.js\`\n- **任务类型**: 代码\n- **任务描述**: 删除旧的导出逻辑\n- **需调研**: 否\n- **依赖**: 无\n### T4: 重构模块\n- **目标文件**: \`src/d.js\`\n- **任务类型**: 代码\n- **任务描述**: 重构导出模块结构\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    noFail(f);
    hasPass(f, '所有任务描述均动词开头');
  });

  test('pass: 需调研标注格式正确', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 调研 API\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 代码\n- **任务描述**: 新增 API 调用逻辑\n- **需调研**: 是 — 建议调研方式: Context7\n- **依赖**: 无`);
    const f = check(TASKS);
    noFail(f);
    hasPass(f, 'T1.*调研标注含建议方式');
  });
});

// ────────────────────────────────────────────────────────
suite('change-tasks — 反例', () => {
  test('fail: 缺少执行任务清单', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 其他章节\n内容`);
    const f = check(TASKS);
    hasFail(f, '缺少.*执行任务清单');
  });

  test('fail: 任务缺少目标文件', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 修改服务\n- **任务类型**: 代码\n- **任务描述**: 修改服务逻辑\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, 'T1.*缺少.*目标文件');
  });

  test('fail: 任务缺少任务类型', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 修改服务\n- **目标文件**: \`src/a.js\`\n- **任务描述**: 修改服务逻辑\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, 'T1.*缺少.*任务类型');
  });

  test('fail: 任务描述非动词开头', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 导出服务\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 代码\n- **任务描述**: 导出服务的 CSV 逻辑\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, 'T1.*任务描述未动词开头');
  });

  test('fail: 任务类型非法（编码）', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 修改服务\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 编码\n- **任务描述**: 修改服务逻辑\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, 'T1.*任务类型.*编码.*不合法');
  });

  test('fail: 包含验收检查点（验证方式字段）', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 修改服务\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 代码\n- **任务描述**: 修改服务逻辑\n- **验证方式**: 运行测试\n- **需调研**: 否\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, '不应包含验收检查点');
  });
});

// ────────────────────────────────────────────────────────
suite('change-tasks — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/tasks.md');
    hasFail(f, '无法读取');
  });

  test('fail: 需调研标注"是"但未列出建议方式', () => {
    writeFixture(TASKS, `# 测试\n${META}\n## 执行任务清单\n### T1: 调研 API\n- **目标文件**: \`src/a.js\`\n- **任务类型**: 代码\n- **任务描述**: 新增 API 调用\n- **需调研**: 是\n- **依赖**: 无`);
    const f = check(TASKS);
    hasFail(f, 'T1.*需调研.*是.*未列出建议调研方式');
  });
});

cleanFixtures(FIXTURES);
summary();
