// verification-report.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/verification-report');

const FIXTURES = path.join(__dirname, 'fixtures');
const REPORT = path.join(FIXTURES, 'verification-report-test.md');

cleanFixtures(FIXTURES);

const META = '> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n';

// ────────────────────────────────────────────────────────
suite('verification-report.md — 验收概要', () => {
  test('pass: 含通过率数据', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 95%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能正常\n  - **验证方式**: 手动测试\n  - **证据**: 截图1.png\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasPass(f, '验收概要有通过率');
  });

  test('fail: 验收概要缺少通过率', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n全部通过\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能正常\n  - **验证方式**: 手动测试\n  - **证据**: 截图1.png\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasFail(f, '验收概要缺少通过率');
  });
});

// ────────────────────────────────────────────────────────
suite('verification-report.md — 验收标准逐条对照', () => {
  test('pass: 每条含验证方式和证据', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 导出功能\n  - **验证方式**: 手动测试\n  - **证据**: 截图1.png\n- [x] **[FR-2]** 限制功能\n  - **验证方式**: 自动化测试\n  - **证据**: test.log\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasPass(f, '验收标准逐条对照完整');
  });

  test('fail: 缺少验证方式或证据', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 50%\n## 验收标准逐条对照\n- [x] **[FR-1]** 导出功能\n  - **验证方式**: 手动测试\n- [x] **[FR-2]** 限制功能\n  - **证据**: test.log\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasFail(f, '缺少验证方式或证据');
  });

  test('fail: 缺少验收标准逐条对照章节', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasFail(f, '缺少.*验收标准逐条对照.*章节');
  });

  test('fail: 未通过项缺少处理计划', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 50%\n## 验收标准逐条对照\n- [x] **[FR-1]** 导出功能\n  - **验证方式**: 手动测试\n  - **证据**: 截图1.png\n- [ ] **[FR-2]** 限制功能 ⚠️\n  - **验证方式**: 手动测试\n  - **证据**: 无\n## 结论\n⚠️ 有条件通过`);
    const f = check(REPORT);
    hasFail(f, '未通过的验收项缺少处理计划');
  });
});

// ────────────────────────────────────────────────────────
suite('verification-report.md — 测试结果汇总', () => {
  test('pass: 含数字和覆盖率', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 测试结果汇总\n总用例: 50, 通过: 48, 失败: 2\n覆盖率: 85%\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasPass(f, '测试结果含数据');
    hasPass(f, '标注了测试覆盖率');
  });

  test('fail: 测试结果缺少数字', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 测试结果汇总\n全部通过\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasFail(f, '测试结果缺少数字');
  });

  test('warn: 未标注测试覆盖率', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 测试结果汇总\n总用例: 50, 通过: 50\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasWarn(f, '未标注测试覆盖率');
  });
});

// ────────────────────────────────────────────────────────
suite('verification-report.md — 结论', () => {
  test('pass: 结论为通过', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    hasPass(f, '结论明确');
  });

  test('pass: 结论为有条件通过', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 80%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 结论\n⚠️ 有条件通过`);
    const f = check(REPORT);
    hasPass(f, '结论明确');
  });

  test('pass: 结论为不通过', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 30%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 结论\n❌ 不通过`);
    const f = check(REPORT);
    hasPass(f, '结论明确');
  });

  test('fail: 结论不明确', () => {
    writeFixture(REPORT, `# 验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 功能\n  - **验证方式**: 手动\n  - **证据**: 截图\n## 结论\n基本完成`);
    const f = check(REPORT);
    hasFail(f, '结论不明确');
  });
});

// ────────────────────────────────────────────────────────
suite('verification-report.md — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/verification-report.md');
    hasFail(f, '无法读取');
  });

  test('pass: 完整合规文档', () => {
    writeFixture(REPORT, `# 用户CSV导出验收报告\n${META}\n## 验收概要\n通过率: 100%\n## 验收标准逐条对照\n- [x] **[FR-1]** 点击导出按钮后浏览器下载 CSV\n  - **验证方式**: 手动测试\n  - **证据**: 截图 export.png\n- [x] **[FR-2]** 超过 10 万条显示提示\n  - **验证方式**: 自动化测试\n  - **证据**: test-export.log\n## 测试结果汇总\n总用例: 20, 通过: 20, 失败: 0\n覆盖率: 92%\n## 结论\n✅ 通过`);
    const f = check(REPORT);
    noFail(f);
    hasPass(f, '验收概要有通过率');
    hasPass(f, '验收标准逐条对照完整');
    hasPass(f, '测试结果含数据');
    hasPass(f, '标注了测试覆盖率');
    hasPass(f, '结论明确');
  });
});

cleanFixtures(FIXTURES);
summary();
