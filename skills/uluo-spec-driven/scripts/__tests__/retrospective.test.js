// retrospective.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/retrospective');

const FIXTURES = path.join(__dirname, 'fixtures');
const REPORT = path.join(FIXTURES, 'retrospective-test.md');

cleanFixtures(FIXTURES);

const META = '> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n';

// ────────────────────────────────────────────────────────
suite('retrospective.md — What Went Well', () => {
  test('pass: 含具体内容', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 使用 Context7 查询文档，节省 2 小时调研时间\n## What Could Be Better\n- 🔧 应该先写 spec 再编码\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n| AI-1 | 下次先写 spec | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快速生成代码框架\n### AI 犯的错\n漏掉了边界条件\n### 对后续的建议\n先确认需求再编码`);
    const f = check(REPORT);
    hasPass(f, 'What Went Well.*具体内容');
  });

  test('fail: What Went Well 为空', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n## What Could Be Better\n- 🔧 应该先写 spec\n## Action Items\n| AI-1 | 措施 | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n好\n### AI 犯的错\n错\n### 对后续的建议\n建议`);
    const f = check(REPORT);
    hasFail(f, 'What Went Well 为空');
  });

  test('warn: 含泛泛而谈', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 很好\n## What Could Be Better\n- 🔧 应该先写 spec\n## Action Items\n| AI-1 | 措施 | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n好\n### AI 犯的错\n错\n### 对后续的建议\n建议`);
    const f = check(REPORT);
    hasWarn(f, '泛泛而谈');
  });
});

// ────────────────────────────────────────────────────────
suite('retrospective.md — Action Items', () => {
  test('pass: 所有 Action Items 有 owner + deadline', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n| AI-1 | 下次先写 spec | P1 | 张三 | 2026-07-01 | 待开始 |\n| AI-2 | 补充测试用例 | P2 | 李四 | 2026-07-15 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快\n### AI 犯的错\n慢\n### 对后续的建议\n改进`);
    const f = check(REPORT);
    hasPass(f, 'Action Items.*负责人.*截止日期');
  });

  test('fail: Action Item 缺少负责人', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n| AI-1 | 下次先写 spec | P1 | - | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快\n### AI 犯的错\n慢\n### 对后续的建议\n改进`);
    const f = check(REPORT);
    hasFail(f, 'AI-1.*缺少.*负责人');
  });

  test('fail: Action Item 缺少截止日期', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n| AI-1 | 下次先写 spec | P1 | 张三 | 无 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快\n### AI 犯的错\n慢\n### 对后续的建议\n改进`);
    const f = check(REPORT);
    hasFail(f, 'AI-1.*缺少.*截止日期');
  });

  test('fail: Action Items 为空', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n## AI 执行反思\n### AI 做得好的\n快\n### AI 犯的错\n慢\n### 对后续的建议\n改进`);
    const f = check(REPORT);
    hasFail(f, 'Action Items 为空');
  });
});

// ────────────────────────────────────────────────────────
suite('retrospective.md — AI 执行反思', () => {
  test('pass: 三部分完整', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| AI-1 | 措施 | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快速生成代码\n### AI 犯的错\n漏掉边界条件\n### 对后续的建议\n先确认需求再编码`);
    const f = check(REPORT);
    hasPass(f, 'AI 执行反思三部分完整');
  });

  test('warn: 缺少部分内容', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| AI-1 | 措施 | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快速生成代码`);
    const f = check(REPORT);
    hasWarn(f, 'AI 执行反思缺少');
  });
});

// ────────────────────────────────────────────────────────
suite('retrospective.md — 基本数据偏差', () => {
  test('warn: 偏差超过 50%', () => {
    writeFixture(REPORT, `# 复盘\n${META}\n## 基本数据\n| 指标 | 计划 | 实际 | 偏差 |\n|------|------|------|------|\n| 工时 | 10h | 20h | +100% |\n## What Went Well\n- ✅ 具体成果\n## What Could Be Better\n- 🔧 改进点\n## Action Items\n| AI-1 | 措施 | P1 | 张三 | 2026-07-01 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快\n### AI 犯的错\n慢\n### 对后续的建议\n改进`);
    const f = check(REPORT);
    hasWarn(f, '偏差超过 50%');
  });
});

// ────────────────────────────────────────────────────────
suite('retrospective.md — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/retrospective.md');
    hasFail(f, '无法读取');
  });

  test('pass: 完整合规文档', () => {
    writeFixture(REPORT, `# 用户CSV导出复盘\n${META}\n## 基本数据\n| 指标 | 计划 | 实际 | 偏差 |\n|------|------|------|------|\n| 工时 | 10h | 12h | +20% |\n## What Went Well\n- ✅ 使用 Context7 查询文档，节省 2 小时调研时间\n- ✅ 流式查询方案选型正确，性能达标\n## What Could Be Better\n- 🔧 应该先写 spec 再编码\n- 🔧 边界条件考虑不周\n## Action Items\n| 编号 | 措施 | 优先级 | 负责人 | 截止日期 | 状态 |\n|------|------|--------|--------|----------|------|\n| AI-1 | 下次先写 spec | P1 | 张三 | 2026-07-01 | 待开始 |\n| AI-2 | 补充边界测试用例 | P2 | 李四 | 2026-07-15 | 待开始 |\n## AI 执行反思\n### AI 做得好的\n快速生成代码框架，节省 50% 编码时间\n### AI 犯的错\n漏掉了空数据边界条件\n### 对后续的建议\n先确认需求边界再编码`);
    const f = check(REPORT);
    noFail(f);
    hasPass(f, 'What Went Well.*具体内容');
    hasPass(f, 'Action Items.*负责人.*截止日期');
    hasPass(f, 'AI 执行反思三部分完整');
  });
});

cleanFixtures(FIXTURES);
summary();
