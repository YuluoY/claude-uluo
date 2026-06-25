// change-record.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/change-record');

const FIXTURES = path.join(__dirname, 'fixtures');
const RECORD = path.join(FIXTURES, 'change-record-test.md');

cleanFixtures(FIXTURES);

const META = '> 变更编号: CHG-001 | 变更日期: 2026-06-25 | 变更发起人: 张三 | 状态: 已合并\n';

// ────────────────────────────────────────────────────────
suite('change-record.md — 元数据校验', () => {
  test('pass: 元数据完整', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n将 CSV 导出改为 Excel 导出\n## 变更原因\n用户反馈 CSV 在 Excel 中乱码\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc123\n- plan.md diff: def456\n- tasks.md diff: ghi789\n- 代码变更: commit-hash`);
    const f = check(RECORD);
    hasPass(f, '元数据完整');
  });

  test('fail: 缺少元数据行', () => {
    writeFixture(RECORD, `# 变更记录\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少元数据行');
  });

  test('fail: 状态值不合法', () => {
    writeFixture(RECORD, `# 变更记录\n> 变更编号: CHG-001 | 变更日期: 2026-06-25 | 变更发起人: 张三 | 状态: 已完成\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少元数据行');
  });

  test('fail: 变更发起人为占位符', () => {
    writeFixture(RECORD, `# 变更记录\n> 变更编号: CHG-001 | 变更日期: 2026-06-25 | 变更发起人: \`git config user.name\` | 状态: 已合并\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '占位符');
  });
});

// ────────────────────────────────────────────────────────
suite('change-record.md — 章节完整性', () => {
  test('fail: 缺少变更概述章节', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少.*变更概述.*章节');
  });

  test('fail: 缺少变更原因章节', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少.*变更原因.*章节');
  });

  test('fail: 缺少执行结果章节', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少.*执行结果.*章节');
  });

  test('fail: 缺少验收结论章节', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '缺少.*验收结论.*章节');
  });

  test('fail: 缺少 Diff 引用章节', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0`);
    const f = check(RECORD);
    hasFail(f, '缺少.*Diff 引用.*章节');
  });
});

// ────────────────────────────────────────────────────────
suite('change-record.md — 执行结果数字一致性', () => {
  test('pass: 数字一致（5 = 5 + 0）', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasPass(f, '执行结果数字一致');
  });

  test('pass: 数字一致（10 = 8 + 2）', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 10\n- **完成数**: 8\n- **失败数**: 2\n- **修改文件数**: 5\n## 验收结论\n- **Review 结论**: 不通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 1\n- **回退历史**:\n  - 第 1 次回退: spec 层级 — 影响范围遗漏 — 已修复\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasPass(f, '执行结果数字一致');
  });

  test('warn: 数字不一致（5 ≠ 3 + 1）', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 3\n- **失败数**: 1\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasWarn(f, '执行结果数字不一致');
  });

  test('fail: 缺少执行任务数字段', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '执行结果缺少.*执行任务数');
  });
});

// ────────────────────────────────────────────────────────
suite('change-record.md — 验收结论', () => {
  test('pass: Review 结论为通过', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasPass(f, 'Review 结论明确.*通过');
  });

  test('pass: Review 结论为不通过', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 3\n- **失败数**: 2\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 不通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 1\n- **回退历史**:\n  - 第 1 次回退: plan 层级 — delta 不完整 — 已修复\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasPass(f, 'Review 结论明确.*不通过');
  });

  test('fail: Review 结论值不合法', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 待定\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, 'Review 结论值不合法');
  });

  test('pass: 回退历史已记录', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 2\n- **回退历史**:\n  - 第 1 次回退: spec 层级 — 影响范围遗漏 — 已修复\n  - 第 2 次回退: tasks 层级 — 文件路径错误 — 已修复\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasPass(f, '回退历史已记录');
  });

  test('fail: 回退次数 > 0 但未记录回退历史', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 1\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def\n- tasks.md diff: ghi\n- 代码变更: commit`);
    const f = check(RECORD);
    hasFail(f, '回退次数 > 0 但未记录回退历史');
  });
});

// ────────────────────────────────────────────────────────
suite('change-record.md — Diff 引用', () => {
  test('pass: Diff 引用完整（4 项）', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc123\n- plan.md diff: def456\n- tasks.md diff: ghi789\n- 代码变更: commit-hash`);
    const f = check(RECORD);
    hasPass(f, 'Diff 引用完整');
  });

  test('warn: Diff 引用不完整（2/4 项）', () => {
    writeFixture(RECORD, `# 变更记录\n${META}\n## 变更概述\n概述\n## 变更原因\n原因\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: abc\n- plan.md diff: def`);
    const f = check(RECORD);
    hasWarn(f, 'Diff 引用不完整');
  });
});

// ────────────────────────────────────────────────────────
suite('change-record.md — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/change-record.md');
    hasFail(f, '无法读取');
  });

  test('pass: 完整合规文档（无回退）', () => {
    writeFixture(RECORD, `# 用户CSV导出变更记录\n${META}\n## 变更概述\n将 CSV 导出改为 Excel 导出，使用 exceljs 库支持流式写入。\n## 变更原因\n用户反馈 CSV 在 Excel 中中文乱码，且 Excel 格式支持公式和样式。\n## 执行结果\n- **执行任务数**: 5\n- **完成数**: 5\n- **失败数**: 0\n- **修改文件数**: 3\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-25\n- **回退次数**: 0\n## Diff 引用\n- spec.md diff: a1b2c3d\n- plan.md diff: e4f5g6h\n- tasks.md diff: i7j8k9l\n- 代码变更: commit-abc123`);
    const f = check(RECORD);
    noFail(f);
    hasPass(f, '元数据完整');
    hasPass(f, '变更概述已填写');
    hasPass(f, '变更原因已填写');
    hasPass(f, '执行结果数字一致');
    hasPass(f, 'Review 结论明确');
    hasPass(f, 'Diff 引用完整');
  });

  test('pass: 完整合规文档（有回退）', () => {
    writeFixture(RECORD, `# 用户认证变更记录\n> 变更编号: CHG-002 | 变更日期: 2026-06-26 | 变更发起人: 李四 | 状态: 已合并\n## 变更概述\n将 session 认证改为 JWT 认证，实现无状态化。\n## 变更原因\n水平扩展需要无状态认证，JWT 适合分布式部署。\n## 执行结果\n- **执行任务数**: 8\n- **完成数**: 8\n- **失败数**: 0\n- **修改文件数**: 5\n## 验收结论\n- **Review 结论**: 通过\n- **Review 日期**: 2026-06-26\n- **回退次数**: 1\n- **回退历史**:\n  - 第 1 次回退: spec 层级 — 影响范围遗漏了前端改造 — 已修复\n## Diff 引用\n- spec.md diff: abc111\n- plan.md diff: def222\n- tasks.md diff: ghi333\n- 代码变更: commit-def456`);
    const f = check(RECORD);
    noFail(f);
    hasPass(f, '回退历史已记录');
  });
});

cleanFixtures(FIXTURES);
summary();
