// spec.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/spec');

const FIXTURES = path.join(__dirname, 'fixtures');
const SPEC = path.join(FIXTURES, 'spec-test.md');

cleanFixtures(FIXTURES);

// ────────────────────────────────────────────────────────
suite('spec.md — 用户故事', () => {
  test('pass: 标准格式含运营+管理员角色', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n| 编号 | 角色 | 故事 | 验收线索 |\n|------|------|------|---------|\n| US-1 | 运营人员 | 作为运营人员，我希望导出数据，以便做报表 | FR-1 |\n| US-2 | 系统管理员 | 作为系统管理员，我希望限制导出，以便保护服务器 | FR-2 |`);
    const f = check(SPEC);
    hasPass(f, '用户故事覆盖 2 个故事');
    hasPass(f, '2 种角色');
  });

  test('fail: 用户故事表格为空', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n`);
    const f = check(SPEC);
    hasFail(f, '用户故事表格为空');
  });

  test('warn: 角色全是"用户"', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n| 编号 | 角色 | 故事 | 验收线索 |\n|------|------|------|---------|\n| US-1 | 用户 | 作为用户，我希望导出，以便报表 | FR-1 |\n| US-2 | 用户 | 作为用户，我希望筛选，以便查找 | FR-2 |`);
    const f = check(SPEC);
    hasWarn(f, '所有角色都是.*用户');
  });

  test('warn: 格式不符合"作为...我希望...以便"', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n| US-1 | 运营 | 可以导出数据 | FR-1 |`);
    const f = check(SPEC);
    hasWarn(f, '格式不符合');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 非目标', () => {
  test('pass: 非目标含具体条目', () => {
    writeFixture(SPEC, `# Test\n### 非目标\n- 不支持自定义字段\n- 不支持 Excel 导出`);
    const f = check(SPEC);
    hasPass(f, '非目标含 2 项');
  });

  test('fail: 非目标不存在', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n内容`);
    const f = check(SPEC);
    hasFail(f, '缺少.*非目标.*章节');
  });

  test('fail: 非目标为空', () => {
    writeFixture(SPEC, `# Test\n### 非目标\n`);
    const f = check(SPEC);
    hasFail(f, '非目标为空');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 功能需求(FR)', () => {
  const FR_BASE = `### 非目标\n- N/A\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| X | 可行 | Context7 | 高 |\n## 参考资料\n### Context7\nN/A\n### GitHub\nN/A\n### WebSearch\nN/A\n### Stack Overflow\nN/A\n`;

  test('pass: 全部 FR 含四项完整字段', () => {
    writeFixture(SPEC, `# Test\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击按钮\n- **预期行为**: 下载文件\n- **边界条件**: 无数据时空 CSV\n### FR-2: 筛选\n- **优先级**: P1\n- **触发条件**: 设置条件\n- **预期行为**: 导出筛选结果\n- **边界条件**: 无匹配时空 CSV\n${FR_BASE}`);
    const f = check(SPEC);
    hasPass(f, '2/2.*FR 字段完整');
  });

  test('fail: FR 缺少边界条件', () => {
    writeFixture(SPEC, `# Test\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击\n- **预期行为**: 下载\n${FR_BASE}`);
    const f = check(SPEC);
    hasFail(f, 'FR-1.*缺少.*边界条件');
  });

  test('fail: FR 缺少多个字段', () => {
    writeFixture(SPEC, `# Test\n## 功能需求\n### FR-1: 最小\n- **优先级**: P0\n${FR_BASE}`);
    const f = check(SPEC);
    hasFail(f, 'FR-1.*缺少');
    hasFail(f, '触发条件');
    hasFail(f, '预期行为');
    hasFail(f, '边界条件');
  });

  test('fail: 没有定义 FR', () => {
    writeFixture(SPEC, `# Test\n## 功能需求\n暂无\n${FR_BASE}`);
    const f = check(SPEC);
    hasFail(f, '没有定义任何功能需求');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 验收标准', () => {
  test('pass: 验收标准均可验证', () => {
    writeFixture(SPEC, `# Test\n## 验收标准\n- [ ] FR-1: 点击按钮后浏览器自动下载 CSV 文件\n- [ ] FR-2: CSV 内容与筛选结果一致`);
    const f = check(SPEC);
    hasPass(f, '验收标准均可验证');
  });

  test('fail: "用户体验好"不可验证', () => {
    writeFixture(SPEC, `# Test\n## 验收标准\n- [ ] 用户体验好\n- [ ] 操作流畅`);
    const f = check(SPEC);
    hasFail(f, '验收标准不可验证.*用户体验好');
    hasFail(f, '验收标准不可验证.*操作流畅');
  });

  test('fail: "界面美观""响应快"不可验证', () => {
    writeFixture(SPEC, `# Test\n## 验收标准\n- [ ] 界面美观\n- [ ] 响应快`);
    const f = check(SPEC);
    hasFail(f, '不可验证.*界面美观');
    hasFail(f, '不可验证.*响应快');
  });

  test('fail: 验收标准为空', () => {
    writeFixture(SPEC, `# Test\n## 验收标准\n`);
    const f = check(SPEC);
    hasFail(f, '验收标准为空');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 调研依据', () => {
  test('pass: 多源含可信度', () => {
    writeFixture(SPEC, `# Test\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| Cursor | 可行 | Context7 | 高 |\n### 业界方案\n| 调研项 | 参考 | 发现 |\n|--------|------|------|\n| 导出 | GitHub项目 | 流式 |`);
    const f = check(SPEC);
    hasPass(f, '调研依据覆盖 Context7, GitHub');
    hasPass(f, '标注了可信度');
  });

  test('fail: 未标注信息源', () => {
    writeFixture(SPEC, `# Test\n## 调研依据\n方案可行。`);
    const f = check(SPEC);
    hasFail(f, '未标注信息源');
  });

  test('warn: 有信息源但无可信度', () => {
    writeFixture(SPEC, `# Test\n## 调研依据\n参考了 Context7 文档。`);
    const f = check(SPEC);
    hasWarn(f, '未标注可信度');
  });

  test('fail: 缺少调研依据章节', () => {
    writeFixture(SPEC, `# Test\n## 验收标准\n- [ ] 通过`);
    const f = check(SPEC);
    hasFail(f, '缺少.*调研依据');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 参考资料', () => {
  test('pass: 四源分组', () => {
    writeFixture(SPEC, `# Test\n## 参考资料\n### Context7\n- 文档\n### GitHub\n- 项目\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);
    const f = check(SPEC);
    hasPass(f, '参考资料按 4 个信息源分组');
  });

  test('warn: 未分组', () => {
    writeFixture(SPEC, `# Test\n## 参考资料\n- [链接1]\n- [链接2]`);
    const f = check(SPEC);
    hasWarn(f, '未按信息源类型分组');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 完整合规文档', () => {
  test('pass: 零失败', () => {
    writeFixture(SPEC, `# 用户CSV导出\n## 背景与动机\n当前需要手动操作，每月耗时 4 小时。\n## 用户故事\n| US-1 | 运营人员 | 作为运营人员，我希望一键导出 CSV，以便快速完成数据分析 | FR-1 |\n| US-2 | 管理员 | 作为管理员，我希望限制导出上限，以便保护服务器性能 | FR-2 |\n### 非目标\n- 不支持自定义字段\n- 不支持 Excel\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击按钮\n- **预期行为**: 下载文件\n- **边界条件**: 无数据时空 CSV\n### FR-2: 限制\n- **优先级**: P0\n- **触发条件**: 超过上限\n- **预期行为**: 提示缩小范围\n- **边界条件**: 刚好上限可导出\n## 验收标准\n- [ ] FR-1: 点击按钮后浏览器自动下载 CSV 文件\n- [ ] FR-2: 超过 10 万条时显示提示\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| 流式查询 | 可行 | Context7 | 高 |\n### 业界方案\n| 调研项 | 参考 | 发现 |\n|--------|------|------|\n| 导出方案 | GitHub项目 | 流式 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\n- 项目\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '用户故事');
    hasPass(f, '非目标含');
    hasPass(f, 'FR 字段完整');
    hasPass(f, '验收标准均可验证');
    hasPass(f, '调研依据覆盖');
    hasPass(f, '标注了可信度');
    hasPass(f, '参考资料按');
  });
});

// ────────────────────────────────────────────────────────
suite('spec.md — 边界情况', () => {
  test('fail: 文件不存在', () => {
    const f = check('/nonexistent/spec.md');
    hasFail(f, '无法读取');
  });

  test('pass: FR 含优先级 P0/P1/P2 均合法', () => {
    writeFixture(SPEC, `# Test\n## 功能需求\n### FR-1: A\n- **优先级**: P0\n- **触发条件**: x\n- **预期行为**: y\n- **边界条件**: z\n### FR-2: B\n- **优先级**: P1\n- **触发条件**: x\n- **预期行为**: y\n- **边界条件**: z\n### FR-3: C\n- **优先级**: P2\n- **触发条件**: x\n- **预期行为**: y\n- **边界条件**: z\n### 非目标\n- N/A\n## 调研依据\n### 技术可行性\n| X | 可行 | Context7 | 高 |\n## 参考资料\n### Context7\nN/A\n### GitHub\nN/A\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);
    const f = check(SPEC);
    noFail(f);
    hasPass(f, '3/3.*FR 字段完整');
  });

  test('pass: 用户故事含多种角色（运营/管理/合规）', () => {
    writeFixture(SPEC, `# Test\n## 用户故事\n| US-1 | 运营人员 | 作为运营人员，我希望导出，以便报表 | FR-1 |\n| US-2 | 合规审计员 | 作为合规审计员，我希望记录日志，以便追溯 | FR-2 |\n| US-3 | 系统管理员 | 作为系统管理员，我希望限制上限，以便保护 | FR-3 |`);
    const f = check(SPEC);
    hasPass(f, '3 个故事');
    hasPass(f, '3 种角色');
  });
});

cleanFixtures(FIXTURES);
summary();
