// Integration tests for the full validation pipeline
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { test, suite, summary, writeFixture, cleanFixtures } = require('./helpers');
const { findFeatureDirs, findDesignDocs } = require('../lib/utils');

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

function runValidatorCI(projectRoot) {
  try {
    const out = execSync(`node "${VALIDATOR}" --ci "${projectRoot}"`, {
      encoding: 'utf-8',
      cwd: FIXTURES,
      env: { ...process.env, PROJECT_ROOT: projectRoot },
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

  writeFixture(path.join(dir, 'spec.md'), `# 用户CSV导出\n> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n## 背景与动机\n当前每月耗时4小时。\n## 用户故事\n| US-1 | 运营人员 | 作为运营人员，我希望一键导出CSV，以便快速报表 | FR-1 |\n| US-2 | 管理员 | 作为管理员，我希望限制数量，以便保护服务器 | FR-2 |\n### 非目标\n- 不支持自定义字段\n- 不支持Excel\n## 功能需求\n### FR-1: 导出\n- **优先级**: P0\n- **触发条件**: 点击按钮\n- **预期行为**: 下载CSV\n- **边界条件**: 无数据时空CSV\n### FR-2: 限制\n- **优先级**: P0\n- **触发条件**: 超上限\n- **预期行为**: 提示\n- **边界条件**: 刚好上限可导出\n## 验收标准\n- [ ] FR-1: 点击按钮后浏览器自动下载CSV文件\n- [ ] FR-2: 超过10万条显示提示\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| 流式 | 可行 | Context7 | 高 |\n### 业界方案\n| 调研项 | 参考 | 发现 |\n|--------|------|------|\n| 导出 | GitHub | 流式 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\n- 项目\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);

  writeFixture(path.join(plansDir, 'README.md'), `# Plan\n> 日期: 2026-06-25 | 作者: 张三 | 关联 spec: ../spec.md\n## 架构概览\n前端调后端流式导出接口，游标分页逐批写入响应流。\n## 关键设计决策\n### 决策1: 流式\n- **选择**: 流式\n- **原因**: 省内存\n- **替代方案**: 全量——OOM\n- **影响**: StreamingResponse\n## 代码库分析\n参考 \`user/service/UserService.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| UserRepo | repo/ | 注入 |\n## 模块设计\n### Controller\n- **职责**: 导出\n- **对外接口**: GET /api/export\n- **依赖**: Service\n- **数据流**: Request → Export\n## API 契约\n**请求**: JSON\n**响应**: CSV\n**错误码**:\n| 状态码 | 错误码 | 说明 |\n|--------|--------|------|\n| 403 | FORBIDDEN | 无权限 |\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 逻辑 | JUnit |\n| 集成测试 | 链路 | SpringBoot |\n## 回滚方案\n可直接回滚。`);

  writeFixture(path.join(tasksDir, 'phase1-infra.md'), `# Phase 1\n> 日期: 2026-06-25 | 作者: 张三 | 关联: ../plans/README.md\n## 本阶段任务\n- [ ] **T1.1**: 建表\n  - **产出物**: \`db/V1.sql\`（新增）\n  - **参考**: 参考 V0_init.sql\n  - **复用**: 已有 DataSource\n  - **验收**: 表创建成功\n  - **预估**: 1h\n  - **依赖**: 无`);
  writeFixture(path.join(tasksDir, 'phase2-logic.md'), `# Phase 2\n> 日期: 2026-06-25 | 作者: 张三 | 关联: ../plans/README.md\n## 本阶段任务\n- [ ] **T2.1**: 实现导出\n  - **产出物**: \`user/service/UserService.java\`（修改）\n  - **参考**: 参考 OrderService\n  - **复用**: T1.1 产出\n  - **验收**: 单元测试通过\n  - **预估**: 2h\n  - **依赖**: T1.1`);

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

  writeFixture(path.join(dir, 'spec.md'), `# Bug Fix\n> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n## 背景与动机\n修复并发问题。\n## 用户故事\n| US-1 | 用户 | 作为用户，我希望数据不错，以便正常使用 | FR-1 |\n### 非目标\n- 不重构\n## 功能需求\n### FR-1: 修复\n- **优先级**: P0\n- **触发条件**: 并发写入\n- **预期行为**: 数据正确\n- **边界条件**: 单线程正常\n## 验收标准\n- [ ] FR-1: 并发写入数据正确\n## 调研依据\n### 技术可行性\n| 调研项 | 结论 | 来源 | 可信度 |\n|--------|------|------|--------|\n| 锁方案 | 乐观锁 | Context7 | 高 |\n## 参考资料\n### Context7\n- 文档\n### GitHub\nN/A\n### WebSearch\nN/A\n### Stack Overflow\nN/A`);

  writeFixture(path.join(dir, 'plan.md'), `# Plan\n> 日期: 2026-06-25 | 作者: 张三 | 关联 spec: spec.md\n## 架构概览\n在写入路径加乐观锁，冲突时自动重试。\n## 关键设计决策\n### 决策1: 乐观锁\n- **选择**: 乐观锁\n- **原因**: 冲突少\n- **替代方案**: 悲观锁——性能差\n- **影响**: Entity 加 version 字段\n## 代码库分析\n参考 \`common/lock/OptimisticLock.java\`。\n### 可复用清单\n| 模块 | 路径 | 方式 |\n|------|------|------|\n| Lock | lock/ | 注入 |\n## 模块设计\n### Service\n- **职责**: 加锁\n- **对外接口**: update()\n- **依赖**: Lock\n- **数据流**: Request → Lock → Update\n## API 契约\nN/A\n## 测试策略\n| 测试层级 | 覆盖 | 工具 |\n|---------|------|------|\n| 单元测试 | 锁逻辑 | JUnit |\n| 集成测试 | 并发 | SpringBoot |\n## 回滚方案\nfeature flag 控制。`);

  writeFixture(path.join(dir, 'tasks.md'), `# Tasks\n> 日期: 2026-06-25 | 作者: 张三 | 关联: plan.md\n## Phase 1: 数据层\n## 本阶段任务\n- [ ] **T1.1**: 加 version 字段\n  - **产出物**: \`db/V2.sql\`（新增）\n  - **参考**: 参考 V1_init.sql\n  - **复用**: 已有 migration 工具\n  - **验收**: 字段创建成功\n  - **预估**: 0.5h\n  - **依赖**: 无\n\n## Phase 2: 核心逻辑\n## 本阶段任务\n- [ ] **T2.1**: 加乐观锁\n  - **产出物**: \`user/service/UserService.java\`（修改）\n  - **参考**: 参考 OptimisticLock\n  - **复用**: 已有 Lock 模块\n  - **验收**: 并发测试通过\n  - **预估**: 2h\n  - **依赖**: T1.1`);

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

// ────────────────────────────────────────────────────────
// CI 模式测试套件 —— 验证弹性 specs 布局的新行为

// 合规的 spec.md / tasks.md fixture 内容（bug-fix 变体：spec.md + tasks.md）
const CI_SPEC = `# Feature
> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿
## 背景与动机
需要实现该功能。
## 用户故事
| US-1 | 运营 | 作为运营人员，我希望使用该功能，以便提效 | FR-1 |
### 非目标
- 不支持其他范围
## 功能需求
### FR-1: 核心功能
- **优先级**: P0
- **触发条件**: 用户请求
- **预期行为**: 返回正确结果
- **边界条件**: 空输入返回空
## 验收标准
- [ ] FR-1: 请求后返回正确结果
## 调研依据
### 技术可行性
| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| 方案A | 可行 | Context7 | 高 |
| 方案B | 备选 | GitHub | 中 |
## 参考资料
### Context7
- 文档
### GitHub
- 项目`;

const CI_TASKS = `# Tasks
> 日期: 2026-06-25 | 作者: 张三 | 关联: spec.md
## Phase 1: 实现
## 本阶段任务
- [ ] **T1.1**: 实现核心功能
  - **产出物**: \`src/Feature.java\`（新增）
  - **参考**: 参考 Service.java
  - **复用**: 已有 Repo
  - **验收**: 测试通过
  - **预估**: 2h
  - **依赖**: 无`;

// ────────────────────────────────────────────────────────
suite('集成 — CI 模式领域分层布局', () => {
  const projectRoot = path.join(FIXTURES, 'ci-domain');
  const specsDir = path.join(projectRoot, 'specs');

  // specs/user/feature-a/
  const featureADir = path.join(specsDir, 'user', 'feature-a');
  fs.mkdirSync(featureADir, { recursive: true });
  writeFixture(path.join(featureADir, 'spec.md'), CI_SPEC);
  writeFixture(path.join(featureADir, 'tasks.md'), CI_TASKS);

  // specs/payment/feature-b/
  const featureBDir = path.join(specsDir, 'payment', 'feature-b');
  fs.mkdirSync(featureBDir, { recursive: true });
  writeFixture(path.join(featureBDir, 'spec.md'), CI_SPEC);
  writeFixture(path.join(featureBDir, 'tasks.md'), CI_TASKS);

  test('findFeatureDirs 返回 2 个特性目录（feature-a + feature-b）', () => {
    const dirs = findFeatureDirs(specsDir);
    if (dirs.length !== 2) {
      throw new Error(`Expected 2 feature dirs, got ${dirs.length}: ${dirs.map(d => path.relative(specsDir, d)).join(', ')}`);
    }
    const names = dirs.map(d => path.basename(d));
    if (!names.includes('feature-a') || !names.includes('feature-b')) {
      throw new Error(`Expected feature-a and feature-b, got: ${names.join(', ')}`);
    }
  });

  test('CI 模式识别两个特性', () => {
    const r = runValidatorCI(projectRoot);
    if (!r.stdout.includes('feature-a')) {
      throw new Error(`Expected stdout to include feature-a:\n${r.stdout}`);
    }
    if (!r.stdout.includes('feature-b')) {
      throw new Error(`Expected stdout to include feature-b:\n${r.stdout}`);
    }
  });
});

// ────────────────────────────────────────────────────────
suite('集成 — CI 模式跳过设计文档', () => {
  const projectRoot = path.join(FIXTURES, 'ci-skip-design');
  const specsDir = path.join(projectRoot, 'specs');

  // architecture/ —— 设计文档目录（不含 spec.md，应跳过）
  const archDir = path.join(specsDir, 'architecture');
  fs.mkdirSync(archDir, { recursive: true });
  writeFixture(path.join(archDir, 'system-layout.md'), `# 系统架构\n系统布局描述。`);

  // roadmap-2024.md —— 设计文档单文件（应跳过）
  writeFixture(path.join(specsDir, 'roadmap-2024.md'), `# Roadmap 2024\n本年度路线图。`);

  // real-feature/ —— 特性文档（含 spec.md，应识别）
  const realDir = path.join(specsDir, 'real-feature');
  fs.mkdirSync(realDir, { recursive: true });
  writeFixture(path.join(realDir, 'spec.md'), CI_SPEC);
  writeFixture(path.join(realDir, 'tasks.md'), CI_TASKS);

  test('findFeatureDirs 只返回 real-feature（跳过设计文档）', () => {
    const dirs = findFeatureDirs(specsDir);
    if (dirs.length !== 1) {
      throw new Error(`Expected 1 feature dir, got ${dirs.length}: ${dirs.map(d => path.relative(specsDir, d)).join(', ')}`);
    }
    if (path.basename(dirs[0]) !== 'real-feature') {
      throw new Error(`Expected real-feature, got: ${path.basename(dirs[0])}`);
    }
  });

  test('CI 模式不因设计文档失败，且只校验 real-feature', () => {
    const r = runValidatorCI(projectRoot);
    if (r.exitCode !== 0) {
      throw new Error(`Expected exitCode 0, got ${r.exitCode}:\n${r.stdout}\n${r.stderr || ''}`);
    }
    if (!r.stdout.includes('real-feature')) {
      throw new Error(`Expected stdout to include real-feature:\n${r.stdout}`);
    }
    if (r.stdout.includes('architecture')) {
      throw new Error(`Did not expect stdout to include architecture:\n${r.stdout}`);
    }
    if (r.stdout.includes('roadmap')) {
      throw new Error(`Did not expect stdout to include roadmap:\n${r.stdout}`);
    }
  });
});

// ────────────────────────────────────────────────────────
suite('集成 — CI 模式冲突隔离', () => {
  const projectRoot = path.join(FIXTURES, 'ci-conflict');
  const specsDir = path.join(projectRoot, 'specs');

  // openapi.yaml —— 已有 API 规格（冲突标志，应跳过）
  writeFixture(path.join(specsDir, 'openapi.yaml'), `openapi: 3.0.0\ninfo:\n  title: existing-api`);

  // features/feature-a/ —— 冲突隔离子目录中的特性文档
  const featureDir = path.join(specsDir, 'features', 'feature-a');
  fs.mkdirSync(featureDir, { recursive: true });
  writeFixture(path.join(featureDir, 'spec.md'), CI_SPEC);
  writeFixture(path.join(featureDir, 'tasks.md'), CI_TASKS);

  // designs/ —— 冲突隔离子目录中的设计文档（应跳过）
  const designsDir = path.join(specsDir, 'designs');
  fs.mkdirSync(designsDir, { recursive: true });
  writeFixture(path.join(designsDir, 'tech-selection.md'), `# 技术选型\n技术方案对比。`);

  test('findFeatureDirs 识别 features/feature-a/（递归进入冲突隔离子目录）', () => {
    const dirs = findFeatureDirs(specsDir);
    if (dirs.length !== 1) {
      throw new Error(`Expected 1 feature dir, got ${dirs.length}: ${dirs.map(d => path.relative(specsDir, d)).join(', ')}`);
    }
    if (path.basename(dirs[0]) !== 'feature-a') {
      throw new Error(`Expected feature-a, got: ${path.basename(dirs[0])}`);
    }
  });

  test('CI 模式校验 feature-a，跳过 openapi.yaml 和 designs/', () => {
    const r = runValidatorCI(projectRoot);
    if (!r.stdout.includes('feature-a')) {
      throw new Error(`Expected stdout to include feature-a:\n${r.stdout}`);
    }
    if (r.stdout.includes('openapi')) {
      throw new Error(`Did not expect stdout to include openapi:\n${r.stdout}`);
    }
    if (r.stdout.includes('designs')) {
      throw new Error(`Did not expect stdout to include designs:\n${r.stdout}`);
    }
  });
});

// ────────────────────────────────────────────────────────
// findDesignDocs 测试套件 —— 验证 7 类设计文档识别
suite('集成 — findDesignDocs 识别 7 类设计文档', () => {
  const projectRoot = path.join(FIXTURES, 'design-docs');
  const specsDir = path.join(projectRoot, 'specs');

  // 构造完整 specs/ 目录：
  //   specs/
  //   ├── roadmap-2026.md              (L0 roadmap)
  //   ├── tech-selection-state.md      (L0 tech-selection)
  //   ├── architecture/                (L0 architecture 目录)
  //   │   └── system.md
  //   ├── components/                  (L2 组件清单)
  //   │   ├── atomic.md
  //   │   └── business.md
  //   ├── user/                        (L1 领域: user)
  //   │   ├── layout.md
  //   │   ├── feature-profile.md
  //   │   └── coupon-module/           (特性目录，含 spec.md)
  //   │       └── spec.md
  //   └── payment/                     (L1 领域: payment)
  //       └── feature-payment.md
  writeFixture(path.join(specsDir, 'roadmap-2026.md'), `# Roadmap 2026\n年度路线图。`);
  writeFixture(path.join(specsDir, 'tech-selection-state.md'), `# 技术选型\n状态管理方案对比。`);
  writeFixture(path.join(specsDir, 'architecture', 'system.md'), `# 系统架构\n整体架构描述。`);
  writeFixture(path.join(specsDir, 'components', 'atomic.md'), `# 原子组件清单\nButton、Input 等。`);
  writeFixture(path.join(specsDir, 'components', 'business.md'), `# 业务组件清单\nUserCard 等。`);
  writeFixture(path.join(specsDir, 'user', 'layout.md'), `# 用户域布局\n页面交互布局。`);
  writeFixture(path.join(specsDir, 'user', 'feature-profile.md'), `# 个人主页特性\n领域特性描述。`);
  writeFixture(path.join(specsDir, 'user', 'coupon-module', 'spec.md'), `# 优惠券模块\n> 日期: 2026-06-25 | 作者: 张三 | 状态: 草稿\n## 背景与动机\n文本。`);
  writeFixture(path.join(specsDir, 'payment', 'feature-payment.md'), `# 支付特性\n领域特性描述。`);

  const docs = findDesignDocs(specsDir);

  test('L0 战略层：识别 roadmap / tech-selection / architecture', () => {
    const l0 = docs.filter(d => d.layer === 'L0');
    const types = l0.map(d => d.type).sort();
    const expected = ['architecture', 'roadmap', 'tech-selection'];
    if (JSON.stringify(types) !== JSON.stringify(expected)) {
      throw new Error(`L0 types mismatch: got ${JSON.stringify(types)}, expected ${JSON.stringify(expected)}`);
    }
    // architecture 路径应为目录（不含 system.md）
    const arch = l0.find(d => d.type === 'architecture');
    if (arch.path !== 'architecture') {
      throw new Error(`architecture path should be 'architecture', got '${arch.path}'`);
    }
  });

  test('L1 领域层：识别 layout-interaction / feature-domain', () => {
    const l1 = docs.filter(d => d.layer === 'L1');
    const types = l1.map(d => d.type).sort();
    const expected = ['feature-domain', 'feature-domain', 'layout-interaction'];
    if (JSON.stringify(types) !== JSON.stringify(expected)) {
      throw new Error(`L1 types mismatch: got ${JSON.stringify(types)}, expected ${JSON.stringify(expected)}`);
    }
    // layout-interaction 路径校验
    const layout = l1.find(d => d.type === 'layout-interaction');
    if (layout.path !== 'user/layout.md') {
      throw new Error(`layout path should be 'user/layout.md', got '${layout.path}'`);
    }
    // feature-domain 路径校验（含两个领域）
    const featureDocs = l1.filter(d => d.type === 'feature-domain').map(d => d.path).sort();
    const expectedPaths = ['payment/feature-payment.md', 'user/feature-profile.md'];
    if (JSON.stringify(featureDocs) !== JSON.stringify(expectedPaths)) {
      throw new Error(`feature-domain paths mismatch: got ${JSON.stringify(featureDocs)}, expected ${JSON.stringify(expectedPaths)}`);
    }
  });

  test('L2 组件层：识别 atomic-component / business-component', () => {
    const l2 = docs.filter(d => d.layer === 'L2');
    const types = l2.map(d => d.type).sort();
    const expected = ['atomic-component', 'business-component'];
    if (JSON.stringify(types) !== JSON.stringify(expected)) {
      throw new Error(`L2 types mismatch: got ${JSON.stringify(types)}, expected ${JSON.stringify(expected)}`);
    }
    const atomic = l2.find(d => d.type === 'atomic-component');
    if (atomic.path !== 'components/atomic.md') {
      throw new Error(`atomic path should be 'components/atomic.md', got '${atomic.path}'`);
    }
    const business = l2.find(d => d.type === 'business-component');
    if (business.path !== 'components/business.md') {
      throw new Error(`business path should be 'components/business.md', got '${business.path}'`);
    }
  });

  test('特性目录（含 spec.md）不被误判为设计文档', () => {
    // coupon-module 含 spec.md，不应出现在设计文档清单中
    const couponInDocs = docs.some(d => d.path.includes('coupon-module'));
    if (couponInDocs) {
      throw new Error(`coupon-module should NOT be in design docs, but found: ${docs.filter(d => d.path.includes('coupon-module')).map(d => d.path).join(', ')}`);
    }
    // spec.md 本身也不应出现
    const specInDocs = docs.some(d => d.path.endsWith('spec.md'));
    if (specInDocs) {
      throw new Error(`spec.md should NOT be in design docs, but found: ${docs.filter(d => d.path.endsWith('spec.md')).map(d => d.path).join(', ')}`);
    }
  });

  test('findDesignDocs 总计返回 8 项设计文档', () => {
    // 7 类设计文档类型 + 1 个额外的 feature-domain（user + payment 两个领域）
    // 即: roadmap, tech-selection, architecture, atomic, business, layout, feature-profile, feature-payment
    if (docs.length !== 8) {
      const list = docs.map(d => `${d.layer}/${d.type}: ${d.path}`).join('\n  ');
      throw new Error(`Expected 8 design docs, got ${docs.length}:\n  ${list}`);
    }
  });

  test('findFeatureDirs 不识别设计文档，只返回 coupon-module', () => {
    const dirs = findFeatureDirs(specsDir);
    if (dirs.length !== 1) {
      throw new Error(`Expected 1 feature dir, got ${dirs.length}: ${dirs.map(d => path.relative(specsDir, d)).join(', ')}`);
    }
    if (path.basename(dirs[0]) !== 'coupon-module') {
      throw new Error(`Expected coupon-module, got: ${path.basename(dirs[0])}`);
    }
  });

  test('findFeatureDirs 与 findDesignDocs 互不重叠', () => {
    const featureDirs = findFeatureDirs(specsDir);
    const featureRelPaths = new Set(featureDirs.map(d => path.relative(specsDir, d)));
    // 设计文档路径不应与特性目录路径重叠
    for (const doc of docs) {
      if (featureRelPaths.has(doc.path)) {
        throw new Error(`Overlap found: '${doc.path}' is both a design doc and a feature dir`);
      }
    }
  });
});

cleanFixtures(FIXTURES);
summary();
