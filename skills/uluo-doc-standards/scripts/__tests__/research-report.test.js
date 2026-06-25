// research-report.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/research-report');

const FIXTURES = path.join(__dirname, 'fixtures');
const REPORT = path.join(FIXTURES, 'research-report-test.md');

cleanFixtures(FIXTURES);

const META = '> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n';

// ────────────────────────────────────────────────────────
suite('research-report.md — 知识缺口', () => {
  test('pass: 全部知识缺口闭合', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 流式查询性能 | L2 | Context7 | 可行，1万条/秒 | 高 |\n| KG-2 | 内存限制 | L1 | 官方文档 | 2GB 上限 | 高 |\n## 业界方案对比\n| 方案 | 优点 | 缺点 | 本项目适用性 |\n|------|------|------|-------------|\n| A | 快 | 复杂 | 适用 |\n## 综合建议\n推荐方案 A，因为性能满足需求且实现复杂度可控。\n### Context7\n- 文档\n### GitHub\n- 项目`);
    const f = check(REPORT);
    hasPass(f, '知识缺口.*全部闭合');
  });

  test('fail: 知识缺口未闭合（无结论）', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 流式查询 | L2 | Context7 | - | - |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasFail(f, 'KG-1.*未闭合');
  });

  test('fail: 缺少知识缺口章节', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasFail(f, '缺少.*知识缺口与结论.*章节');
  });

  test('warn: 知识缺口未标注可信度', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 流式查询 | L2 | Context7 | 可行 | - |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasWarn(f, 'KG-1.*未标注可信度');
  });
});

// ────────────────────────────────────────────────────────
suite('research-report.md — L3 三源交叉验证', () => {
  test('warn: L3 缺口仅含 1 个来源', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 性能基准 | L3 | Context7 | 可行 | 高 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasWarn(f, 'L3.*仅含 1 个来源');
  });

  test('pass: L3 缺口含 3 个来源', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 性能基准 | L3 | Context7、GitHub、WebSearch | 可行 | 高 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasPass(f, 'L3 深度缺口');
  });
});

// ────────────────────────────────────────────────────────
suite('research-report.md — 方案对比', () => {
  test('pass: 含"本项目适用性"列', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 业界方案对比\n| 方案 | 优点 | 缺点 | 本项目适用性 |\n|------|------|------|-------------|\n| A | 快 | 复杂 | 适用 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasPass(f, '本项目适用性');
  });

  test('warn: 方案对比缺少"本项目适用性"列', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 业界方案对比\n| 方案 | 优点 | 缺点 |\n|------|------|------|\n| A | 快 | 复杂 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasWarn(f, '缺少.*本项目适用性');
  });
});

// ────────────────────────────────────────────────────────
suite('research-report.md — 综合建议', () => {
  test('pass: 含推荐方案', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 综合建议\n推荐方案 A，因为性能满足需求且实现复杂度可控，适合当前团队规模。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasPass(f, '综合建议含推荐方案');
  });

  test('fail: 综合建议未给出明确推荐方案', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 综合建议\n待定\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasFail(f, '综合建议未给出明确推荐方案');
  });

  test('fail: 缺少综合建议章节', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasFail(f, '缺少.*综合建议.*章节');
  });
});

// ────────────────────────────────────────────────────────
suite('research-report.md — 参考资料分组', () => {
  test('pass: 按 2+ 信息源分组', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档\n### GitHub\n- 项目`);
    const f = check(REPORT);
    hasPass(f, '参考资料按.*信息源分组');
  });

  test('warn: 仅含 1 个信息源', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 综合建议\n推荐方案 A。\n### Context7\n- 文档`);
    const f = check(REPORT);
    hasWarn(f, '参考资料仅含 1 个信息源');
  });

  test('fail: 未按信息源类型分组', () => {
    writeFixture(REPORT, `# 调研报告\n${META}\n## 知识缺口与结论\n| KG-1 | 缺口 | L1 | Context7 | 结论 | 高 |\n## 综合建议\n推荐方案 A。\n- 链接1\n- 链接2`);
    const f = check(REPORT);
    hasFail(f, '参考资料未按信息源类型分组');
  });
});

// ────────────────────────────────────────────────────────
suite('research-report.md — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/research-report.md');
    hasFail(f, '无法读取');
  });

  test('pass: 完整合规文档', () => {
    writeFixture(REPORT, `# 用户CSV导出调研报告\n${META}\n## 知识缺口与结论\n| 编号 | 缺口 | 深度 | 来源 | 结论 | 可信度 |\n|------|------|------|------|------|--------|\n| KG-1 | 流式查询性能 | L3 | Context7、GitHub、WebSearch | 可行，1万条/秒 | 高 |\n| KG-2 | 内存限制 | L1 | 官方文档 | 2GB 上限 | 高 |\n## 业界方案对比\n| 方案 | 优点 | 缺点 | 本项目适用性 |\n|------|------|------|-------------|\n| 流式 | 快 | 复杂 | 适用 |\n| 分页 | 简单 | 慢 | 不适用 |\n## 综合建议\n推荐方案 A（流式），因为性能满足需求且实现复杂度可控，适合当前团队规模。\n### Context7\n- Node.js stream 文档\n### GitHub\n- exceljs 项目`);
    const f = check(REPORT);
    noFail(f);
    hasPass(f, '知识缺口.*全部闭合');
    hasPass(f, 'L3 深度缺口');
    hasPass(f, '本项目适用性');
    hasPass(f, '综合建议含推荐方案');
    hasPass(f, '参考资料按');
  });
});

cleanFixtures(FIXTURES);
summary();
