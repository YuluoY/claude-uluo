// change-spec.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/change-spec');

const FIXTURES = path.join(__dirname, 'fixtures');
const SPEC = path.join(FIXTURES, 'spec-test.md');

cleanFixtures(FIXTURES);

// 元数据行（合规）
const META = '> 日期: 2026-06-25 | 作者: 张三 | 变更编号: CHG-001 | 关联特性: specs/test/';

// ────────────────────────────────────────────────────────
suite('change-spec — 正例', () => {
  test('pass: 完整合规文档（元数据/变更背景/影响范围/决策结论，无实施细节）', () => {
    writeFixture(SPEC, `# 测试变更 Spec\n${META}\n## 变更背景\n### 变更触发原因\n产品要求增加导出功能。\n### 变更目标\n允许用户导出 CSV 数据。\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | ## 功能需求 > FR-1 | MODIFIED | 中 | 修改触发条件 |\n| spec.md | ## 功能需求 > FR-3 | ADDED | 低 | 新增功能 |\n### 代码影响\n| 模块 | 影响类型 | 风险等级 | 说明 |\n|------|---------|---------|------|\n| 导出模块 | MODIFIED | 高 | 修改导出逻辑 |\n### 设计稿影响\n| 组件 | 影响类型 | 风险等级 | 说明 |\n|------|---------|---------|------|\n| 导出按钮 | MODIFIED | 中 | 更新样式 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 变更范围明确，风险可控`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '作者字段有效');
    hasPass(f, '变更编号格式有效');
    hasPass(f, '变更背景');
    hasPass(f, '影响范围');
    hasPass(f, '决策为.*批准');
  });

  test('pass: 影响类型 ADDED/MODIFIED/REMOVED 均合法', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景内容\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | ADDED | 低 | 新增 |\n| spec.md | FR-2 | MODIFIED | 中 | 修改 |\n| spec.md | FR-3 | REMOVED | 高 | 删除 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '影响类型均为合法值');
  });

  test('pass: 风险等级 高/中/低 均合法', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景内容\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | ADDED | 低 | 新增 |\n| spec.md | FR-2 | MODIFIED | 中 | 修改 |\n| spec.md | FR-3 | REMOVED | 高 | 删除 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '风险等级均为合法值');
  });

  test('pass: 决策为"需更多信息"时含缺失信息列表', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景内容\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 需更多信息\n- **理由**: 需要确认细节\n- **缺失信息**:\n  - 用户量级\n  - 性能要求`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '决策为.*需更多信息');
    hasPass(f, '已列出缺失信息');
  });
});

// ────────────────────────────────────────────────────────
suite('change-spec — 反例', () => {
  test('fail: 缺少元数据行', () => {
    writeFixture(SPEC, `# 测试\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '缺少元数据行');
  });

  test('fail: 缺少变更背景', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '缺少.*变更背景');
  });

  test('fail: 缺少影响范围', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '缺少.*影响范围');
  });

  test('fail: 缺少决策结论', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |`);
    const f = check(SPEC);
    hasFail(f, '缺少.*决策结论');
  });

  test('fail: 影响类型非法（UPDATED）', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | UPDATED | 中 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '影响类型.*UPDATED.*不合法');
  });

  test('warn: 风险等级非法（极高）', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 极高 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasWarn(f, '风险等级.*极高.*不规范');
  });

  test('fail: 决策非法（同意）', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 同意\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '决策.*同意.*不合法');
  });

  test('fail: 包含具体文件路径（src/utils/helper.js）', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n需要修改 src/utils/helper.js 文件\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '不应包含具体文件路径');
  });

  test('fail: 包含代码片段（```js 代码块）', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试\n\`\`\`js\nconst x = 1;\n\`\`\``);
    const f = check(SPEC);
    hasFail(f, '不应包含代码片段');
  });

  test('fail: 包含技术方案选择', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 技术方案选择\n方案 A\n## 决策结论\n- **决策**: 批准\n- **理由**: 测试`);
    const f = check(SPEC);
    hasFail(f, '不应包含技术方案选择');
  });
});

// ────────────────────────────────────────────────────────
suite('change-spec — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/spec.md');
    hasFail(f, '无法读取');
  });

  test('fail: 决策为"需更多信息"但未列出缺失信息', () => {
    writeFixture(SPEC, `# 测试\n${META}\n## 变更背景\n背景\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | FR-1 | MODIFIED | 中 | 测试 |\n## 决策结论\n- **决策**: 需更多信息\n- **理由**: 需要确认`);
    const f = check(SPEC);
    hasFail(f, '需更多信息.*未列出缺失信息');
  });
});

cleanFixtures(FIXTURES);
summary();
