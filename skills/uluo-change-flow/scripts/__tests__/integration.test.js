// integration.test.js — 完整变更流程集成测试
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const specCheck = require('../checks/change-spec');
const planCheck = require('../checks/change-plan');
const tasksCheck = require('../checks/change-tasks');
const checklistCheck = require('../checks/change-checklist');
const syncCheck = require('../checks/sync-consistency');

const FIXTURES = path.join(__dirname, 'fixtures');

cleanFixtures(FIXTURES);

// 设置 PROJECT_ROOT 为 FIXTURES 目录，供代码对齐校验使用
process.env.PROJECT_ROOT = FIXTURES;
// 创建 TASKS_FULL 中引用的目标代码文件，使现有正例测试通过代码对齐校验
writeFixture(path.join(FIXTURES, 'specs/test/spec.md'), '# Test spec code file');

// ────────────────────────────────────────────────────────
// 基础 fixture 内容（四份文档完全对齐）
// ────────────────────────────────────────────────────────

const SPEC_META = '> 日期: 2026-06-25 | 作者: 张三 | 变更编号: CHG-001 | 关联特性: specs/test/';
const PLAN_META = '> 日期: 2026-06-25 | 作者: 张三 | 关联变更 spec: ./spec.md';
const TASKS_META = '> 日期: 2026-06-25 | 作者: 张三 | 关联变更 plan: ./plan.md';
const CHECKLIST_META = '> 日期: 2026-06-25 | 审查人: 张三 | 关联变更: ./spec.md ./plan.md ./tasks.md';

const SPEC_FULL = `# 测试变更 Spec\n${SPEC_META}\n## 变更背景\n### 变更触发原因\n产品要求增加导出功能。\n### 变更目标\n允许用户导出 CSV 数据。\n## 影响范围\n### 文档影响\n| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |\n|------|------|---------|---------|------|\n| spec.md | ## 功能需求 > FR-1 | MODIFIED | 中 | 修改触发条件 |\n| spec.md | ## 功能需求 > FR-3 | ADDED | 低 | 新增功能 |\n### 代码影响\n| 模块 | 影响类型 | 风险等级 | 说明 |\n|------|---------|---------|------|\n| 导出模块 | MODIFIED | 高 | 修改导出逻辑 |\n### 设计稿影响\n| 组件 | 影响类型 | 风险等级 | 说明 |\n|------|---------|---------|------|\n| 导出按钮 | MODIFIED | 中 | 更新样式 |\n## 决策结论\n- **决策**: 批准\n- **理由**: 变更范围明确，风险可控`;

const PLAN_FULL = `# 测试变更 Plan\n${PLAN_META}\n## Delta 规格\n### MODIFIED: spec.md > ## 功能需求 > FR-1\n- **原文摘要**: 原始的触发条件\n- **改为**: 新的触发条件\n### ADDED: spec.md > ## 功能需求 > FR-3\n- **插入位置**: 在 FR-2 之后\n- **新内容**:\n  \`\`\`\n  ### FR-3: 新功能\n  \`\`\``;

const TASKS_FULL = `# 测试变更 Tasks\n${TASKS_META}\n## 执行任务清单\n### T1: 修改 spec 的 FR-1\n- **目标文件**: \`specs/test/spec.md\`\n- **任务类型**: 文档\n- **任务描述**: 修改 spec.md 的 FR-1 触发条件\n- **需调研**: 否\n- **依赖**: 无\n### T2: 新增 spec 的 FR-3\n- **目标文件**: \`specs/test/spec.md\`\n- **任务类型**: 文档\n- **任务描述**: 新增 spec.md 的 FR-3 功能需求\n- **需调研**: 否\n- **依赖**: T1`;

const CHECKLIST_FULL = `# 测试变更 Review Checklist\n${CHECKLIST_META}\n## Spec Review\n- [x] 影响范围清单中所有文档影响项都有对应 plan delta\n- [x] 决策结论为"批准"\n## Plan Review\n- [x] 每个 MODIFIED delta 都包含"原文摘要"和"改为"\n- [x] 每个 ADDED delta 都包含"插入位置"和"新内容"\n## Tasks Review\n- [x] T1 含目标文件路径\n- [x] T2 描述动词开头\n## 执行 Review\n- [x] 所有 tasks 任务已执行完成\n- [x] spec.md 已按 plan delta 更新\n## Review 结论\n- **结论**: 通过`;

// 写入完整 CHG 目录
function writeFullChg(dir) {
  writeFixture(path.join(dir, 'spec.md'), SPEC_FULL);
  writeFixture(path.join(dir, 'plan.md'), PLAN_FULL);
  writeFixture(path.join(dir, 'tasks.md'), TASKS_FULL);
  writeFixture(path.join(dir, 'checklist.md'), CHECKLIST_FULL);
}

// ────────────────────────────────────────────────────────
suite('集成测试 — 完整变更流程（正例）', () => {
  test('pass: 完整合规的 CHG-001 通过所有校验', () => {
    const CHG = path.join(FIXTURES, 'CHG-001');
    writeFullChg(CHG);

    const specF = specCheck.check(path.join(CHG, 'spec.md'));
    const planF = planCheck.check(path.join(CHG, 'plan.md'));
    const tasksF = tasksCheck.check(path.join(CHG, 'tasks.md'));
    const checklistF = checklistCheck.check(path.join(CHG, 'checklist.md'));
    const syncF = syncCheck.check(CHG);

    noFail(specF);
    noFail(planF);
    noFail(tasksF);
    noFail(checklistF);
    noFail(syncF);
  });

  test('pass: 同步一致性校验通过（spec→plan→tasks→checklist 对齐）', () => {
    const CHG = path.join(FIXTURES, 'CHG-001-align');
    writeFullChg(CHG);
    const f = syncCheck.check(CHG);
    noFail(f);
    hasPass(f, 'spec → plan 对齐');
    hasPass(f, 'plan → tasks 对齐');
    hasPass(f, 'tasks → checklist 对齐');
    hasPass(f, 'checklist 全部通过');
  });
});

// ────────────────────────────────────────────────────────
suite('集成测试 — 同步一致性反例', () => {
  test('fail: spec 的影响范围项在 plan 中没有对应 delta', () => {
    const CHG = path.join(FIXTURES, 'CHG-002');
    writeFullChg(CHG);
    // 在 spec.md 中追加一条文档影响项，plan 中无对应 delta
    const specWithExtra = SPEC_FULL.replace(
      '| spec.md | ## 功能需求 > FR-3 | ADDED | 低 | 新增功能 |',
      '| spec.md | ## 功能需求 > FR-3 | ADDED | 低 | 新增功能 |\n| spec.md | ## 非目标 | REMOVED | 低 | 删除过时非目标 |'
    );
    writeFixture(path.join(CHG, 'spec.md'), specWithExtra);

    const f = syncCheck.check(CHG);
    hasFail(f, 'spec 影响项.*在 plan.md 中无对应 delta');
  });

  test('fail: plan 的 delta 在 tasks 中没有对应任务', () => {
    const CHG = path.join(FIXTURES, 'CHG-003');
    writeFullChg(CHG);
    // 在 plan.md 中追加一条针对 plan.md 的 delta，tasks 中无对应任务
    const planWithExtra = PLAN_FULL + '\n### MODIFIED: plan.md > ## 模块设计\n- **原文摘要**: 原始设计\n- **改为**: 新设计';
    writeFixture(path.join(CHG, 'plan.md'), planWithExtra);

    const f = syncCheck.check(CHG);
    hasFail(f, 'plan delta.*在 tasks.md 中无对应任务');
  });

  test('fail: tasks 的任务在 checklist 中没有对应检查点', () => {
    const CHG = path.join(FIXTURES, 'CHG-004');
    writeFullChg(CHG);
    // 在 tasks.md 中追加 T3 任务，checklist 中无对应检查点
    const tasksWithExtra = TASKS_FULL + '\n### T3: 删除旧文档\n- **目标文件**: `docs/old.md`\n- **任务类型**: 文档\n- **任务描述**: 删除过时的文档\n- **需调研**: 否\n- **依赖**: 无';
    writeFixture(path.join(CHG, 'tasks.md'), tasksWithExtra);

    const f = syncCheck.check(CHG);
    hasFail(f, '任务 T3.*在 checklist.md 中无对应');
  });

  test('fail: checklist 有未通过项', () => {
    const CHG = path.join(FIXTURES, 'CHG-005');
    writeFullChg(CHG);
    // 将 checklist 中一个 [x] 改为 [-]（含回退层级和原因），结论改为不通过
    const checklistWithFail = CHECKLIST_FULL
      .replace('- [x] 影响范围清单中所有文档影响项都有对应 plan delta', '- [-] 影响范围清单不完整 → 回退到 spec 层级，原因: 缺少代码影响')
      .replace('- **结论**: 通过', '- **结论**: 不通过\n- **不通过项**:\n  - [-] 影响范围清单不完整 → 回退到 spec 层级，原因: 缺少代码影响');
    writeFixture(path.join(CHG, 'checklist.md'), checklistWithFail);

    const f = syncCheck.check(CHG);
    hasFail(f, 'checklist 有.*不通过项');
  });
});

// ────────────────────────────────────────────────────────
suite('集成测试 — 代码对齐校验', () => {
  test('pass: tasks.md 中目标文件都存在 → 代码对齐通过', () => {
    const CHG = path.join(FIXTURES, 'CHG-006');
    writeFullChg(CHG);
    // specs/test/spec.md 已在全局创建，目标文件存在
    const f = syncCheck.check(CHG);
    noFail(f);
    hasPass(f, '代码对齐');
  });

  test('fail: tasks.md 中目标文件不存在 → 代码对齐失败', () => {
    const CHG = path.join(FIXTURES, 'CHG-007');
    writeFullChg(CHG);
    // 覆盖 tasks.md，使用一个不存在的目标文件路径
    const tasksWithMissing = `# 测试变更 Tasks\n${TASKS_META}\n## 执行任务清单\n### T1: 修改不存在的代码文件\n- **目标文件**: \`src/nonexistent.js\`\n- **任务类型**: 代码\n- **任务描述**: 修改不存在的文件\n- **需调研**: 否\n- **依赖**: 无`;
    writeFixture(path.join(CHG, 'tasks.md'), tasksWithMissing);

    const f = syncCheck.check(CHG);
    hasFail(f, '目标文件不存在');
  });
});

// ────────────────────────────────────────────────────────
// change-record.md 内容（归档文档，用于回退→归档流程测试）
// 格式参考 examples/change-record-template.md
// ────────────────────────────────────────────────────────
const CHANGE_RECORD_FULL = `# 测试变更 变更记录

> 变更编号: CHG-001 | 变更日期: 2026-06-25 | 变更发起人: 张三 | 状态: 已合并

## 变更概述
增加 CSV 导出功能，允许用户导出数据。

## 变更原因
产品要求增加导出功能，用户需要离线分析数据。

## 影响清单
详见 spec.md > ## 影响范围

## 执行结果
- **执行任务数**: 2
- **完成数**: 2
- **失败数**: 0
- **修改文件数**: 3

## 验收结论
- **Review 结论**: 通过
- **Review 日期**: 2026-06-25
- **回退次数**: 1
- **回退历史**:
  - 第 1 次回退: spec 层级 — 影响范围清单缺少代码影响 — 已修复

## Diff 引用
- spec.md diff: a1b2c3d
- plan.md diff: e4f5g6h
- tasks.md diff: i7j8k9l
- 代码变更: m0n1o2p`;

// ────────────────────────────────────────────────────────
suite('集成测试 — 回退→重新review→归档完整流程', () => {
  test('pass: review 不通过 → 回退到 spec → 修复 → 重新 review 通过 → 归档', () => {
    const CHG = path.join(FIXTURES, 'CHG-006-rollback');

    // 步骤 1: 初始状态——checklist 有一项不通过（[-] 标注回退到 spec）
    writeFullChg(CHG);
    const checklistWithFail = CHECKLIST_FULL
      .replace('- [x] 影响范围清单中所有文档影响项都有对应 plan delta', '- [-] 影响范围清单不完整 → 回退到 spec 层级，原因: 缺少代码影响')
      .replace('- **结论**: 通过', '- **结论**: 不通过\n- **不通过项**:\n  - [-] 影响范围清单不完整 → 回退到 spec 层级，原因: 缺少代码影响');
    writeFixture(path.join(CHG, 'checklist.md'), checklistWithFail);

    // 步骤 2: 运行 checklist 校验 → 验证 hasFail（review 不通过）
    let sf = syncCheck.check(CHG);
    hasFail(sf, 'checklist 有.*不通过项');

    // 步骤 3: 修复 spec.md（补充缺失内容——重写完整 spec）
    writeFixture(path.join(CHG, 'spec.md'), SPEC_FULL);

    // 步骤 4: 修复 checklist.md（将 [-] 改为 [x]，结论改为通过）
    writeFixture(path.join(CHG, 'checklist.md'), CHECKLIST_FULL);

    // 步骤 5: 重新运行 checklist 校验 → 验证 noFail（review 通过）
    let cf = checklistCheck.check(path.join(CHG, 'checklist.md'));
    noFail(cf);
    sf = syncCheck.check(CHG);
    noFail(sf);

    // 步骤 6: 创建 change-record.md（使用 examples/change-record-template.md 的格式）
    writeFixture(path.join(CHG, 'change-record.md'), CHANGE_RECORD_FULL);

    // 步骤 7: 运行 checklist 校验 → 验证 noFail（归档不影响 review 状态）
    cf = checklistCheck.check(path.join(CHG, 'checklist.md'));
    noFail(cf);
  });
});

// ────────────────────────────────────────────────────────
suite('集成测试 — change-record.md 归档文档校验', () => {
  test('pass: 合规的 change-record.md 包含所有必填字段', () => {
    const CHG = path.join(FIXTURES, 'CHG-007-record');
    writeFullChg(CHG);
    writeFixture(path.join(CHG, 'change-record.md'), CHANGE_RECORD_FULL);

    const content = fs.readFileSync(path.join(CHG, 'change-record.md'), 'utf-8');

    // 验证变更编号
    assert.ok(/变更编号:\s*CHG-\d+/.test(content), '应包含变更编号 CHG-NNN');
    // 验证变更日期
    assert.ok(/变更日期:\s*\d{4}-\d{2}-\d{2}/.test(content), '应包含变更日期 YYYY-MM-DD');
    // 验证变更发起人
    assert.ok(/变更发起人:\s*[^\s|]+/.test(content), '应包含变更发起人');
    // 验证变更原因章节
    assert.ok(/##\s*变更原因/.test(content), '应包含"## 变更原因"章节');
    // 验证执行结果章节
    assert.ok(/##\s*执行结果/.test(content), '应包含"## 执行结果"章节');
    // 验证验收结论章节
    assert.ok(/##\s*验收结论/.test(content), '应包含"## 验收结论"章节');
    // 验证 Diff 引用章节
    assert.ok(/##\s*Diff 引用/.test(content), '应包含"## Diff 引用"章节');
    // 验证回退历史（如有回退）
    assert.ok(/第 1 次回退/.test(content), '应记录回退历史');
  });
});

cleanFixtures(FIXTURES);
summary();
