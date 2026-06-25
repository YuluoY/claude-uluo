# uluo-spec-driven

Spec-Driven 设计稿引擎——覆盖项目全生命周期的设计文档产出：设计稿（战略/领域/组件）+ 细化流程（spec/plan/tasks）+ 记录（changelog/验收/复盘）。

## 何时使用

当用户要求 AI 实现功能、修复 bug、重构代码、设计系统，或任何需要规划和跟踪的编码任务时——即使用户没有明确提到文档，也应使用本 skill。

触发关键词：spec、plan、tasks、changelog、验收、复盘、文档规范、产出规范、技术方案、路线图、技术选型、架构、布局、组件设计、设计稿。

## 文档模型

3 部分文档模型，覆盖项目全生命周期：

**Part 1：设计稿（3 层递进流程，战略→领域→组件）**

| 层级 | 文档 | 产出时机 |
|------|------|---------|
| L0 战略层 | roadmap / tech-selection / architecture | 项目启动期，定方向与技术决策 |
| L1 领域层 | layout-interaction / feature-domain | 设计期，定业务与布局 |
| L2 组件层 | atomic-component / business-component | 设计期，定组件需求清单 |

**Part 2：细化流程（spec/plan/tasks，按需启用）**

| 层级 | 文档 | 产出时机 |
|------|------|---------|
| 调研层 | research-report.md | 代码执行前，有知识缺口时 |
| 定义层 | spec.md | 代码执行前 |
| 设计层 | plan.md / plans/README.md | 代码执行前 |
| 执行层 | tasks.md / tasks/phaseN.md | 代码执行前/中 |

spec/plan/tasks 是对设计稿中某些功能/需求进一步细化的工具流程，按需启用，不强制。

**Part 3：记录层**

| 文档 | 产出时机 |
|------|---------|
| verification-report.md, retrospective.md, CHANGELOG.md | 代码执行后 |

## 目录结构

```
uluo-spec-driven/
├── .claude-plugin/plugin.json   ← 最小 plugin 包装
├── SKILL.md                     ← 编排器（概念模型 + 执行协议）
├── references/                  ← 方法论（按需加载）
│   ├── file-conventions.md
│   ├── research-protocol.md
│   ├── analysis-protocol.md
│   └── design-doc-protocol.md
├── examples/                    ← 文档模板
│   ├── spec-template.md
│   ├── plan-template.md
│   ├── tasks-template.md
│   ├── research-report-template.md
│   ├── verification-report-template.md
│   ├── retrospective-template.md
│   ├── changelog-template.md
│   ├── roadmap.md               ← L0 战略层模板
│   ├── tech-selection.md        ← L0 战略层模板
│   ├── architecture.md          ← L0 战略层模板
│   ├── layout-interaction.md    ← L1 领域层模板
│   ├── feature-domain.md        ← L1 领域层模板
│   ├── atomic-component.md      ← L2 组件层模板
│   └── business-component.md    ← L2 组件层模板
├── agents/                      ← 子代理指令
│   ├── researcher.md
│   └── reviewer.md
├── scripts/                     ← 硬约束校验工具
│   ├── validate-docs.js         ← 主校验入口
│   ├── checks/                  ← 7 个文档类型校验模块
│   ├── lib/utils.js             ← 共享工具函数
│   └── __tests__/               ← 测试（70 个用例）
└── evals/evals.json             ← 评测用例
```

specs/ 下支持三种文档结构：特性文档（含 spec.md，三层递进）、设计文档单文件（`<topic>.md`）、设计文档目录（`<topic>/` 不含 spec.md）。支持单层 `specs/<feature>/` 与领域分层 `specs/<domain>/<feature>/` 两种布局。设计文档按层级划分：L0 战略（roadmap/tech-selection/architecture）、L1 领域（layout-interaction/feature-domain）、L2 组件（atomic-component/business-component 需求清单）。详见 [references/file-conventions.md](references/file-conventions.md)。

## 校验工具

```bash
# 校验单个特性目录
node scripts/validate-docs.js specs/<feature-dir>
# 或领域分层布局：node scripts/validate-docs.js specs/<domain>/<feature-dir>

# 严格模式（警告视为失败）
node scripts/validate-docs.js specs/<feature-dir> --strict

# CI 模式（递归扫描 specs/ 下的所有特性目录，自动跳过设计文档）
node scripts/validate-docs.js --ci <project-root>
```

## 测试

```bash
# 运行所有测试
node scripts/__tests__/spec.test.js
node scripts/__tests__/plan.test.js
node scripts/__tests__/tasks.test.js
node scripts/__tests__/integration.test.js
```

## 安装

```bash
# 通过 marketplace 安装
claude plugin install uluo-spec-driven@claude-uluo --scope project
```

## 迁移指南（从 uluo-doc-standards 升级）

本 skill 前身为 `uluo-doc-standards`，已重新定位为 `uluo-spec-driven`。老用户按以下步骤升级：

```bash
# 1. 卸载旧名
claude plugin uninstall uluo-doc-standards

# 2. 安装新名
claude plugin install uluo-spec-driven@claude-uluo --scope project
```

**specs/ 目录无需迁移**——目录结构与文档内容完全兼容，既有 spec/plan/tasks 三层递进流程行为不变。

## License

MIT
