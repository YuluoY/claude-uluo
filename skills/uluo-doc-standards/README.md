# uluo-doc-standards

AI 辅助编程的文档产出规范——定义 AI 在代码执行前（spec.md 需求规格、plan.md 执行计划、tasks.md 任务分解）和执行后（CHANGELOG 变更日志、验收报告、总结复盘）必须产出的文档模板和质量标准。

## 何时使用

当用户要求 AI 实现功能、修复 bug、重构代码、设计系统，或任何需要规划和跟踪的编码任务时——即使用户没有明确提到文档，也应使用本 skill。

触发关键词：spec、plan、tasks、changelog、验收、复盘、文档规范、产出规范、技术方案。

## 文档模型

七种文档分为五层结构：

| 层级 | 文档 | 产出时机 |
|------|------|---------|
| L1 调研 | research-report.md | 代码执行前，有知识缺口时 |
| L2 需求 | spec.md | 代码执行前 |
| L3 方案 | plan.md / plans/README.md | 代码执行前 |
| L4 执行 | tasks.md / tasks/phaseN.md | 代码执行前/中 |
| L5 复盘 | verification-report.md, retrospective.md, CHANGELOG.md | 代码执行后 |

## 目录结构

```
uluo-doc-standards/
├── .claude-plugin/plugin.json   ← 最小 plugin 包装
├── SKILL.md                     ← 编排器（概念模型 + 执行协议）
├── references/                  ← 方法论（按需加载）
│   ├── file-conventions.md
│   ├── research-protocol.md
│   └── analysis-protocol.md
├── examples/                    ← 文档模板（7 个）
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

## 校验工具

```bash
# 校验单个特性目录
node scripts/validate-docs.js specs/<feature-dir>

# 严格模式（警告视为失败）
node scripts/validate-docs.js specs/<feature-dir> --strict

# CI 模式（扫描所有 specs/ 下的特性）
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
claude plugin install uluo-doc-standards@claude-uluo --scope project
```

## License

MIT
