// change-checklist.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/change-checklist');

const FIXTURES = path.join(__dirname, 'fixtures');
const CHECKLIST = path.join(FIXTURES, 'checklist-test.md');

cleanFixtures(FIXTURES);

// 元数据行（合规）—— checklist 用"审查人"而非"作者"
const META = '> 日期: 2026-06-25 | 审查人: 张三 | 关联变更: ./spec.md ./plan.md ./tasks.md';

// 完整合规 checklist（四分组 + 结论 + 全 [x]）
const FULL_PASS = `# 测试变更 Review Checklist\n${META}\n## Spec Review\n- [x] 影响范围清单中所有文档影响项都有对应 plan delta\n- [x] 决策结论为"批准"\n## Plan Review\n- [x] 每个 MODIFIED delta 都包含"原文摘要"和"改为"\n- [x] 每个 ADDED delta 都包含"插入位置"和"新内容"\n## Tasks Review\n- [x] 每个任务都有目标文件路径\n- [x] 每个任务描述都是动词开头\n## 执行 Review\n- [x] 所有 tasks 任务已执行完成\n- [x] spec.md 已按 plan delta 更新\n## Review 结论\n- **结论**: 通过`;

// ────────────────────────────────────────────────────────
suite('change-checklist — 正例', () => {
  test('pass: 完整合规文档（Spec/Plan/Tasks/执行 Review 四分组 + Review 结论）', () => {
    writeFixture(CHECKLIST, FULL_PASS);
    const f = check(CHECKLIST);
    noFail(f);
    hasPass(f, '审查人字段有效');
    hasPass(f, 'Spec Review');
    hasPass(f, 'Plan Review');
    hasPass(f, 'Tasks Review');
    hasPass(f, '执行 Review');
    hasPass(f, 'Review 结论');
  });

  test('pass: 检查点格式正确（[ ] / [x] / [-]）', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [ ] 待检查项\n- [x] 已通过项\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 不通过\n- **不通过项**:\n  - [-] 待检查项 → 回退到 spec 层级，原因: 未完成`);
    const f = check(CHECKLIST);
    hasPass(f, '含.*个检查点');
  });

  test('pass: Review 结论为"通过"时所有检查点为 [x]', () => {
    writeFixture(CHECKLIST, FULL_PASS);
    const f = check(CHECKLIST);
    noFail(f);
    hasPass(f, 'Review 结论为.*通过');
  });

  test('pass: 不通过项标注回退层级', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [-] 影响范围不完整 → 回退到 spec 层级，原因: 缺少代码影响\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 不通过\n- **不通过项**:\n  - [-] 影响范围不完整 → 回退到 spec 层级，原因: 缺少代码影响`);
    const f = check(CHECKLIST);
    // 不通过项有回退层级和原因，不应触发对应 fail
    hasPass(f, 'Review 结论为.*不通过');
  });

  test('pass: checklist 只含检查点，不重复 spec/plan/tasks 正文', () => {
    const dupDir = path.join(FIXTURES, 'dup-pass');
    const checklist = path.join(dupDir, 'checklist.md');
    const spec = path.join(dupDir, 'spec.md');
    writeFixture(spec, `# Spec\n## 变更背景\n这是 spec 的正文内容第一行。\n这是 spec 的正文内容第二行。\n这是 spec 的正文内容第三行。\n`);
    writeFixture(checklist, `# 测试\n${META}\n## Spec Review\n- [x] spec.md 变更背景章节存在\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(checklist);
    noFail(f);
    hasPass(f, '未重复 spec/plan/tasks');
  });
});

// ────────────────────────────────────────────────────────
suite('change-checklist — 反例', () => {
  test('fail: 缺少 Spec Review 分组', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '缺少.*Spec Review');
  });

  test('fail: 缺少 Plan Review 分组', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [x] 检查项\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '缺少.*Plan Review');
  });

  test('fail: 缺少 Tasks Review 分组', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [x] 检查项\n## Plan Review\n- [x] delta 字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '缺少.*Tasks Review');
  });

  test('fail: 缺少 Review 结论', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [x] 检查项\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行`);
    const f = check(CHECKLIST);
    hasFail(f, '缺少.*Review 结论');
  });

  test('fail: 检查点格式非法（[?]）—— 无法识别为检查点', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [?] 检查项\n## Plan Review\n- [?] 检查项\n## Tasks Review\n- [?] 检查项\n## 执行 Review\n- [?] 检查项\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '未找到任何检查点');
  });

  test('fail: 不通过项未标注回退层级', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [-] 影响范围不完整，原因: 缺少代码影响\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 不通过\n- **不通过项**:\n  - [-] 影响范围不完整，原因: 缺少代码影响`);
    const f = check(CHECKLIST);
    hasFail(f, '未标注回退层级');
  });

  test('fail: Review 结论为"通过"但有未通过项', () => {
    writeFixture(CHECKLIST, `# 测试\n${META}\n## Spec Review\n- [-] 影响范围不完整 → 回退到 spec 层级，原因: 测试\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '结论为.*通过.*但有.*检查点未通过');
  });

  test('fail: checklist 复制了 spec.md 的正文段落（3 行以上连续文本）', () => {
    const dupDir = path.join(FIXTURES, 'dup-fail');
    const checklist = path.join(dupDir, 'checklist.md');
    const spec = path.join(dupDir, 'spec.md');
    writeFixture(spec, `# Spec\n## 变更背景\n这是 spec 的正文内容第一行。\n这是 spec 的正文内容第二行。\n这是 spec 的正文内容第三行。\n`);
    writeFixture(checklist, `# 测试\n${META}\n## Spec Review\n这是 spec 的正文内容第一行。\n这是 spec 的正文内容第二行。\n这是 spec 的正文内容第三行。\n- [x] 检查通过\n## Plan Review\n- [x] delta 字段完整\n## Tasks Review\n- [x] 任务字段完整\n## 执行 Review\n- [x] 任务已执行\n## Review 结论\n- **结论**: 通过`);
    const f = check(checklist);
    hasFail(f, '不应重复');
  });
});

// ────────────────────────────────────────────────────────
suite('change-checklist — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/checklist.md');
    hasFail(f, '无法读取');
  });

  test('fail: 缺少审查人元数据', () => {
    writeFixture(CHECKLIST, `# 测试\n## Spec Review\n- [x] 检查项\n## Plan Review\n- [x] 检查项\n## Tasks Review\n- [x] 检查项\n## 执行 Review\n- [x] 检查项\n## Review 结论\n- **结论**: 通过`);
    const f = check(CHECKLIST);
    hasFail(f, '缺少元数据行');
  });
});

cleanFixtures(FIXTURES);
summary();
