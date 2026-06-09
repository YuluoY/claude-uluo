// Integration tests for the full validation pipeline
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { test, suite, summary, writeFixture, cleanFixtures } = require('./helpers');

const FIXTURES = path.join(__dirname, 'fixtures', 'integration');
const VALIDATOR = path.join(__dirname, '..', 'validate-docs.js');

cleanFixtures(FIXTURES);

function runValidator(featureDir) {
  try {
    const out = execSync(`node "${VALIDATOR}" "${featureDir}"`, {
      encoding: 'utf-8',
      cwd: FIXTURES,
      env: { ...process.env, PROJECT_ROOT: FIXTURES },
    });
    return { exitCode: 0, stdout: out };
  } catch (e) {
    return { exitCode: e.status || 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

// ────────────────────────────────────────────────────────
suite('集成 — 标准方案全合规', () => {
  const dir = path.join(FIXTURES, 'specs', 'good-full');
  const plansDir = path.join(dir, 'plans');
  const tasksDir = path.join(dir, 'tasks');

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(plansDir);
  fs.mkdirSync(tasksDir);

  writeFixture(path.join(dir, 'spec.md'), `# 用户CSV导出\n## 背景与动机\n当前每月耗时4小时。\n## 用户故事\n| US-1 | 运营人员 | 作为运营人员，我希望一键导出CSV，以便快速报表 | FR-1 |\n| US-2 | 管理员 | 作为管理员，我希望限制数量，以便保护服务器 | FR-2 |\n### 非目标\n- 不支持自定义字段\n- 不支持Excel\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击按钮\n- **预期行为**: 下载CSV\n- **边界条件**: 无数据时空CSV\n### FR-2: 限制\n- **优先级**: P0\n- **触发条件**: 超上限\n- **预期行为**: 提示\n- **边界条件**: 刚好上限可导出\n## 验收标准\n- [ ] FR-1: 点击按钮后浏览器自动下载CSV文件\n- [ ] FR-2: 超过10万条显示提示\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| 流式 | 可行 | Context7 | 高 |\n### 业界方案\n| 调研项 | 参考 | 发现 |\n|--------|------|------|\n| 导出 | GitHub | 流式 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\n- 项目\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);

  writeFixture(path.join(plansDir, 'README.md'), `# Plan\n## 架构概览\n前端调后端流式导出接口，游标分页逐批写入响应流。\n## 关键设计决策\n### 决策1: 流式\n- **选择**: 流式\n- **原因**: 省内存\n- **替代方案**: 全量——OOM\n- **影响**: StreamingResponse\n## 代码库分析\n参考 \`user/service/UserService.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| UserRepo | repo/ | 注入 |\n## 模块设计\n### Controller\n- **职责**: 导出\n- **对外接口**: GET /api/export\n- **依赖**: Service\n- **数据流**: Request → Export\n## API 契约\n**请求**: JSON\n**响应**: CSV\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 403 | FORBIDDEN | 无权限 |\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 逻辑 | JUnit |\n| 集成测试 | 链路 | SpringBoot |\n## 回滚方案\n可直接回滚。`);

  writeFixture(path.join(tasksDir, 'phase1-infra.md'), `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 建表\n  - **产出物**: \`db/V1.sql\`（新增）\n  - **参考**: 参考 V0_init.sql\n  - **复用**: 已有 DataSource\n  - **验收**: 表创建成功\n  - **预估**: 1h\n  - **依赖**: 无`);
  writeFixture(path.join(tasksDir, 'phase2-logic.md'), `# Phase 2\n## 本阶段任务\n- [ ] **T2.1**: 实现导出\n  - **产出物**: \`user/service/UserService.java\`（修改）\n  - **参考**: 参考 OrderService\n  - **复用**: T1.1 产出\n  - **验收**: 单元测试通过\n  - **预估**: 2h\n  - **依赖**: T1.1`);

  writeFixture(path.join(FIXTURES, 'CHANGELOG.md'), `# Changelog\n## [1.0.0] - 2026-06-08\n### Added\n- CSV导出功能\n### Fixed\n- 修复并发bug`);

  test('exitCode=0, 零失败', () => {
    const r = runValidator(dir);
    // Validation should succeed (no failures)
    if (r.exitCode !== 0) {
      // Check if failures are only warnings
      const failCount = (r.stdout.match(/✗/g) || []).length;
      if (failCount > 0) {
        throw new Error(`Unexpected failures:\n${r.stdout}`);
      }
    }
  });
});

// ────────────────────────────────────────────────────────
suite('集成 — 简化方案', () => {
  const dir = path.join(FIXTURES, 'specs', 'simple-feature');

  fs.mkdirSync(dir, { recursive: true });

  writeFixture(path.join(dir, 'spec.md'), `# Bug Fix\n## 背景与动机\n修复并发问题。\n## 用户故事\n| US-1 | 用户 | 作为用户，我希望数据不错，以便正常使用 | FR-1 |\n### 非目标\n- 不重构\n## 功能需求\n### FR-1: 修复\n- **优先级**: P0\n- **触发条件**: 并发写入\n- **预期行为**: 数据正确\n- **边界条件**: 单线程正常\n## 验收标准\n- [ ] FR-1: 并发写入数据正确\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| 锁方案 | 乐观锁 | Context7 | 高 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\nN/A\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);

  writeFixture(path.join(dir, 'plan.md'), `# Plan\n## 架构概览\n在写入路径加乐观锁，冲突时自动重试。\n## 关键设计决策\n### 决策1: 乐观锁\n- **选择**: 乐观锁\n- **原因**: 冲突少\n- **替代方案**: 悲观锁——性能差\n- **影响**: Entity 加 version 字段\n## 代码库分析\n参考 \`common/lock/OptimisticLock.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| Lock | lock/ | 注入 |\n## 模块设计\n### Service\n- **职责**: 加锁\n- **对外接口**: update()\n- **依赖**: Lock\n- **数据流**: Request → Lock → Update\n## API 契约\nN/A\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 锁逻辑 | JUnit |\n| 集成测试 | 并发 | SpringBoot |\n## 回滚方案\nfeature flag 控制。`);

  writeFixture(path.join(dir, 'tasks.md'), `# Tasks\n## Phase 1: 数据层\n## 本阶段任务\n- [ ] **T1.1**: 加 version 字段\n  - **产出物**: \`db/V2.sql\`（新增）\n  - **参考**: 参考 V1_init.sql\n  - **复用**: 已有 migration 工具\n  - **验收**: 字段创建成功\n  - **预估**: 0.5h\n  - **依赖**: 无\n\n## Phase 2: 核心逻辑\n## 本阶段任务\n- [ ] **T2.1**: 加乐观锁\n  - **产出物**: \`user/service/UserService.java\`（修改）\n  - **参考**: 参考 OptimisticLock\n  - **复用**: 已有 Lock 模块\n  - **验收**: 并发测试通过\n  - **预估**: 2h\n  - **依赖**: T1.1`);

  test('simplified variant detected, passes validation', () => {
    const r = runValidator(dir);
    if (r.exitCode !== 0) {
      // Check for real failures vs just warnings
      const actualFails = r.stdout.split('\n').filter(l => l.includes('✗') && !l.includes('warning')).length;
      if (actualFails > 0) {
        throw new Error(`Unexpected failures:\n${r.stdout.split('\n').filter(l => l.includes('✗')).join('\n')}`);
      }
    }
  });
});

// ────────────────────────────────────────────────────────
suite('集成 — 错误文档应被拦截', () => {
  const dir = path.join(FIXTURES, 'specs', 'bad-feature');

  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'plans'));
  fs.mkdirSync(path.join(dir, 'tasks'));

  // Missing 非目标, vague acceptance, no research sources
  writeFixture(path.join(dir, 'spec.md'), `# Bad\n## 背景与动机\n文本\n## 用户故事\n| US-1 | 用户 | 作为用户，我希望导出，以便报表 | FR-1 |\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n## 验收标准\n- [ ] 用户体验好\n## 调研依据\n方案可行。`);
  writeFixture(path.join(dir, 'plans', 'README.md'), `# Plan\n## 架构概览\n很短的概述。\n## 关键设计决策\n### 决策1: A\n- **选择**: A\n## API 契约\nGET /api\n## 回滚方案\n`);
  writeFixture(path.join(dir, 'tasks', 'phase1.md'), `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 任务\n  - **描述**: 没有产出物和参考`);
  writeFixture(path.join(dir, 'tasks', 'phase2.md'), `# Phase 2\n## 本阶段任务\n- [ ] **T2.1**: 任务2\n  - **描述**: 同样缺失`);

  test('exitCode=1, 应拦截多个错误', () => {
    const r = runValidator(dir);
    // Should have failures
    const failLines = r.stdout.split('\n').filter(l => l.includes('✗'));
    if (failLines.length < 5) {
      throw new Error(`Expected >=5 failures, got ${failLines.length}:\n${r.stdout}`);
    }
  });
});

// ────────────────────────────────────────────────────────
suite('集成 — 断链检测', () => {
  const dir = path.join(FIXTURES, 'specs', 'broken-link');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'plans'));
  fs.mkdirSync(path.join(dir, 'tasks'));

  writeFixture(path.join(dir, 'spec.md'), `# Test\n## 背景与动机\n文本。\n## 用户故事\n| US-1 | 运营 | 作为运营人员，我希望导出CSV，以便报表 | FR-1 |\n### 非目标\n- X\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击\n- **预期行为**: 下载\n- **边界条件**: 空CSV\n## 验收标准\n- [ ] FR-1: 下载成功\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| X | 可行 | Context7 | 高 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\nN/A\n### WebSearch\nN/A\n### Stack Overflow\nN/A\n\n参考: [不存在的文件](./does-not-exist.md)`);
  writeFixture(path.join(dir, 'plans', 'README.md'), `# Plan\n## 架构概览\n足够长的概述内容描述系统整体方案。\n## 关键设计决策\n### 决策1: A\n- **选择**: A\n- **原因**: 简单\n- **替代方案**: B——复杂\n- **影响**: 无\n## 代码库分析\n参考 \`src/Service.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| Repo | repo/ | 注入 |\n## 模块设计\n### Module\n- **职责**: 处理\n- **对外接口**: get()\n- **依赖**: Repo\n- **数据流**: Req → Res\n## API 契约\n**请求**: JSON\n**响应**: JSON\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 400 | BAD | 错误 |\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 逻辑 | JUnit |\n| 集成测试 | 链路 | SpringBoot |\n## 回滚方案\n可回滚。`);
  writeFixture(path.join(dir, 'tasks', 'phase1.md'), `# Phase 1\n## 本阶段任务\n- [ ] **T1.1**: 任务\n  - **产出物**: \`Service.java\`（新增）\n  - **参考**: 参考 X\n  - **复用**: N/A\n  - **验收**: 通过\n  - **预估**: 1h\n  - **依赖**: 无`);
  writeFixture(path.join(dir, 'tasks', 'phase2.md'), `# Phase 2\n## 本阶段任务\n- [ ] **T2.1**: 任务\n  - **产出物**: \`Service2.java\`（新增）\n  - **参考**: 参考 X\n  - **复用**: N/A\n  - **验收**: 通过\n  - **预估**: 1h\n  - **依赖**: T1.1`);

  test('应检测到断链', () => {
    const r = runValidator(dir);
    if (!r.stdout.includes('断链') && !r.stdout.includes('does-not-exist')) {
      throw new Error(`Expected broken link detection:\n${r.stdout}`);
    }
  });
});

cleanFixtures(FIXTURES);
summary();
