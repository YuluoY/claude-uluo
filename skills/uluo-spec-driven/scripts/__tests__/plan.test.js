// plan.js check module tests
const path = require('path');
const { test, suite, summary, hasFail, noFail, hasWarn, hasPass, writeFixture, cleanFixtures } = require('./helpers');
const { check } = require('../checks/plan');

const FIXTURES = path.join(__dirname, 'fixtures');
const PLAN = path.join(FIXTURES, 'plan-test.md');

cleanFixtures(FIXTURES);

// ────────────────────────────────────────────────────────
const PLAN_BASE = `\n## 代码库分析\n参考 \`src/Service.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| X | x/ | 注入 |\n## 回滚方案\n可直接回滚部署。`;

suite('plan — 关键设计决策', () => {
  test('pass: 完整四段（选择/原因/替代方案/影响）', () => {
    writeFixture(PLAN, `# Plan\n## 关键设计决策\n### 决策 1: 流式导出\n- **选择**: 流式\n- **原因**: 省内存\n- **替代方案**: 全量加载——OOM\n- **影响**: Controller 返回 StreamingResponse\n### 决策 2: 用 commons-csv\n- **选择**: commons-csv\n- **原因**: 已有依赖\n- **替代方案**: 手写——易出错\n- **影响**: 无额外依赖${PLAN_BASE}`);
    const f = check(PLAN);
    hasPass(f, '2 个设计决策均含完整四段');
  });

  test('fail: 决策缺少替代方案和影响', () => {
    writeFixture(PLAN, `# Plan\n## 关键设计决策\n### 决策 1: 简单\n- **选择**: A\n- **原因**: 快${PLAN_BASE}`);
    const f = check(PLAN);
    hasFail(f, '缺少.*替代方案');
    hasFail(f, '缺少.*影响');
  });

  test('fail: 决策缺少选择', () => {
    writeFixture(PLAN, `# Plan\n## 关键设计决策\n### 决策 1: 空的\n- **原因**: 因为\n- **替代方案**: B\n- **影响**: 无${PLAN_BASE}`);
    const f = check(PLAN);
    hasFail(f, '缺少.*选择');
  });

  test('fail: 缺少关键设计决策章节', () => {
    writeFixture(PLAN, `# Plan\n## 架构概览\n足够长的架构概述文本描述系统整体方案。${PLAN_BASE}`);
    const f = check(PLAN);
    hasFail(f, '缺少.*关键设计决策');
  });

  test('warn: 章节为空', () => {
    writeFixture(PLAN, `# Plan\n## 关键设计决策\n暂无。${PLAN_BASE}`);
    const f = check(PLAN);
    hasWarn(f, '关键设计决策章节为空');
  });
});

// ────────────────────────────────────────────────────────
suite('plan — 代码库分析', () => {
  test('pass: 含源码路径引用 + 可复用清单', () => {
    writeFixture(PLAN, `# Plan\n## 代码库分析\n参考 src/main/java/user/UserService.java。\n### 可复用清单\n| 已有模块 | 路径 | 复用方式 |\n|---------|------|---------|\n| UserService | user/ | 注入 |`);
    const f = check(PLAN);
    hasPass(f, '代码库分析含');
    hasPass(f, '包含可复用清单');
  });

  test('pass: 含 backtick 格式源码引用', () => {
    writeFixture(PLAN, `# Plan\n## 代码库分析\n参考 \`user/service/UserService.java\` 实现。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| UserRepo | repo/ | 注入 |`);
    const f = check(PLAN);
    hasPass(f, '代码库分析含');
  });

  test('fail: 无源码引用', () => {
    writeFixture(PLAN, `# Plan\n## 代码库分析\n没有读任何源码。`);
    const f = check(PLAN);
    hasFail(f, '缺少源码引用');
  });

  test('warn: 无复用清单', () => {
    writeFixture(PLAN, `# Plan\n## 代码库分析\n参考 src/main/Service.java`);
    const f = check(PLAN);
    hasWarn(f, '未找到可复用清单');
  });

  test('fail: 缺少代码库分析章节', () => {
    writeFixture(PLAN, `# Plan\n## 架构概览\n内容`);
    const f = check(PLAN);
    hasFail(f, '缺少.*代码库分析');
  });
});

// ────────────────────────────────────────────────────────
suite('plan — API 契约', () => {
  test('pass: 含错误码定义 + 请求响应', () => {
    writeFixture(PLAN, `# Plan\n## API 契约\n**请求**:\n\`\`\`json\n{"field":"value"}\n\`\`\`\n**响应**:\n\`\`\`json\n{"result":"ok"}\n\`\`\`\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 403 | FORBIDDEN | 非管理员 |\n| 413 | TOO_MANY | 超上限 |`);
    const f = check(PLAN);
    hasPass(f, '含 2 个错误码定义');
    hasPass(f, '含请求/响应定义');
  });

  test('fail: 缺少错误码', () => {
    writeFixture(PLAN, `# Plan\n## API 契约\n**请求**: JSON\n**响应**: JSON`);
    const f = check(PLAN);
    hasFail(f, '缺少错误码');
  });

  test('fail: 缺少请求/响应示例', () => {
    writeFixture(PLAN, `# Plan\n## API 契约\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 400 | BAD | 错误 |`);
    const f = check(PLAN);
    hasFail(f, '缺少请求/响应示例');
  });
});

// ────────────────────────────────────────────────────────
suite('plan — 回滚方案', () => {
  test('pass: 已填写', () => {
    writeFixture(PLAN, `# Plan\n## 回滚方案\n可直接回滚部署。前端 feature flag 控制。`);
    const f = check(PLAN);
    hasPass(f, '回滚方案已填写');
  });

  test('pass: 标注 N/A', () => {
    writeFixture(PLAN, `# Plan\n## 回滚方案\nN/A`);
    const f = check(PLAN);
    hasPass(f, '回滚方案标注 N/A');
  });

  test('fail: 为空', () => {
    writeFixture(PLAN, `# Plan\n## 回滚方案\n`);
    const f = check(PLAN);
    hasFail(f, '回滚方案为空');
  });

  test('fail: 缺少章节', () => {
    writeFixture(PLAN, `# Plan\n## 架构概览\n内容`);
    const f = check(PLAN);
    hasFail(f, '缺少.*回滚方案');
  });
});

// ────────────────────────────────────────────────────────
suite('plan — 测试策略 + 架构概览', () => {
  test('pass: 覆盖单元+集成', () => {
    writeFixture(PLAN, `# Plan\n## 测试策略\n| 测试层级 | 覆盖范围 | 工具 |\n|---------|---------|------|\n| 单元测试 | 逻辑 | JUnit |\n| 集成测试 | 链路 | SpringBootTest |`);
    const f = check(PLAN);
    hasPass(f, '覆盖单元测试');
    hasPass(f, '集成测试');
  });

  test('warn: 只能集成测试', () => {
    writeFixture(PLAN, `# Plan\n## 测试策略\n| 集成测试 | 链路 | SpringBootTest |`);
    const f = check(PLAN);
    hasWarn(f, '缺少.*单元测试');
  });

  test('fail: 架构概览过短', () => {
    writeFixture(PLAN, `# Plan\n## 架构概览\n短。`);
    const f = check(PLAN);
    hasFail(f, '架构概览内容过短');
  });
});

// ────────────────────────────────────────────────────────
suite('plan — 完整合规', () => {
  test('pass: 零失败', () => {
    writeFixture(PLAN, `# Plan\n> 日期: 2026-06-25 | 作者: 张三 | 关联 spec: spec.md\n## 架构概览\n前端调用后端流式导出接口，后端游标分页查询逐批写入响应流。\n## 关键设计决策\n### 决策 1: 流式\n- **选择**: 流式\n- **原因**: 省内存\n- **替代方案**: 全量——OOM\n- **影响**: 返回 StreamingResponse\n## 代码库分析\n参考 \`user/service/UserService.java\` 实现。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| UserRepo | repo/ | 注入 |\n## 模块设计\n### Controller\n- **职责**: 导出\n- **对外接口**: GET /api/export\n- **依赖**: Service\n- **数据流**: Request → Export\n## API 契约\n**请求**: JSON\n**响应**: JSON\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 403 | FORBIDDEN | 无权限 |\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 逻辑 | JUnit |\n| 集成测试 | 链路 | SpringBoot |\n## 回滚方案\n可直接回滚。`);
    const f = check(PLAN);
    noFail(f);
  });
});

cleanFixtures(FIXTURES);
summary();
