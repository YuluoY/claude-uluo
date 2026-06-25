// change-plan.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/change-plan');

const FIXTURES = path.join(__dirname, 'fixtures');
const PLAN = path.join(FIXTURES, 'plan-test.md');

cleanFixtures(FIXTURES);

// 元数据行（合规）
const META = '> 日期: 2026-06-25 | 作者: 张三 | 关联变更 spec: ./spec.md';

// ────────────────────────────────────────────────────────
suite('change-plan — 正例', () => {
  test('pass: 完整合规文档（元数据/Delta 规格/MODIFIED/ADDED/REMOVED 格式正确）', () => {
    writeFixture(PLAN, `# 测试变更 Plan\n${META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始的触发条件\n- **改为**: 新的触发条件\n### ADDED: spec.md > ## 功能需求 > FR-3\n- **插入位置**: 在 FR-2 之后\n- **新内容**:\n  \`\`\`\n  ### FR-3: 新功能\n  \`\`\`\n### REMOVED: spec.md > ## 非目标\n- **删除位置**: 第 2 条\n- **删除原因**: 不再适用`);
    const f = check(PLAN);
    noFail(f);
    hasPass(f, 'Delta 规格');
    hasPass(f, 'MODIFIED delta 字段完整');
    hasPass(f, 'ADDED delta 字段完整');
    hasPass(f, 'REMOVED delta 字段完整');
  });

  test('pass: MODIFIED 项含原文摘要和改为', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容\n- **改为**: 新内容`);
    const f = check(PLAN);
    noFail(f);
    hasPass(f, '1 个 MODIFIED delta 字段完整');
  });

  test('pass: ADDED 项含插入位置和新内容', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### ADDED: spec.md > ## 功能需求 > FR-3\n- **插入位置**: 在 FR-2 之后\n- **新内容**: 新章节内容`);
    const f = check(PLAN);
    noFail(f);
    hasPass(f, '1 个 ADDED delta 字段完整');
  });

  test('pass: REMOVED 项含删除位置和删除原因', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### REMOVED: spec.md > ## 非目标\n- **删除位置**: 第 2 条\n- **删除原因**: 过时`);
    const f = check(PLAN);
    noFail(f);
    hasPass(f, '1 个 REMOVED delta 字段完整');
  });

  test('pass: 有技术方案选择章节且含结论', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## 技术方案选择\n### 方案对比\n| 方案 | 优点 | 缺点 | 复杂度 |\n|------|------|------|--------|\n| 方案 A | 简单 | 性能差 | 低 |\n| 方案 B | 性能好 | 复杂 | 高 |\n### 选择结论\n- **选择**: 方案 A\n- **理由**: 简单优先\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容\n- **改为**: 新内容`);
    const f = check(PLAN);
    noFail(f);
    hasPass(f, '技术方案选择包含方案对比');
    hasPass(f, '技术方案选择包含选择结论');
  });
});

// ────────────────────────────────────────────────────────
suite('change-plan — 反例', () => {
  test('fail: 缺少 Delta 规格', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## 其他章节\n内容`);
    const f = check(PLAN);
    hasFail(f, '缺少.*Delta 规格');
  });

  test('fail: Delta 未使用 MODIFIED/ADDED/REMOVED 标记', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### 修改: spec.md > FR-1\n- 内容`);
    const f = check(PLAN);
    hasFail(f, 'Delta 规格为空');
  });

  test('fail: MODIFIED 项缺少"改为"', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容`);
    const f = check(PLAN);
    hasFail(f, 'MODIFIED.*缺少.*改为');
  });

  test('fail: ADDED 项缺少"新内容"', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### ADDED: spec.md > ## 功能需求 > FR-3\n- **插入位置**: 在 FR-2 之后`);
    const f = check(PLAN);
    hasFail(f, 'ADDED.*缺少.*新内容');
  });

  test('fail: REMOVED 项缺少"删除原因"', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### REMOVED: spec.md > ## 非目标\n- **删除位置**: 第 2 条`);
    const f = check(PLAN);
    hasFail(f, 'REMOVED.*缺少.*删除原因');
  });

  test('fail: 包含具体文件路径', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容\n- **改为**: 修改 src/utils/helper.js 的逻辑`);
    const f = check(PLAN);
    hasFail(f, '不应包含具体文件路径');
  });

  test('fail: 包含行号', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容\n- **改为**: 修改第 10 行的内容`);
    const f = check(PLAN);
    hasFail(f, '不应包含行号');
  });
});

// ────────────────────────────────────────────────────────
suite('change-plan — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/plan.md');
    hasFail(f, '无法读取');
  });

  test('fail: 技术方案选择缺少选择结论', () => {
    writeFixture(PLAN, `# 测试\n${META}\n## 技术方案选择\n### 方案对比\n| 方案 | 优点 | 缺点 |\n|------|------|------|\n| A | 简单 | 慢 |\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始内容\n- **改为**: 新内容`);
    const f = check(PLAN);
    hasFail(f, '缺少选择结论');
  });
});

cleanFixtures(FIXTURES);
summary();
