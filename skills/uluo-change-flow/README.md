# uluo-change-flow

需求变更管理工作流——三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制，解决需求变更后文档/设计稿/代码同步更新和变更留痕。

## 何时使用

当 spec/设计稿/代码已存在后需求发生变化，需要同步更新文档并留痕时使用。

触发关键词：变更、需求变化、改需求、文档同步、变更留痕、change management、spec update。

## 文档模型

三级递进 + 独立验收：

| 层级 | 文档 | 职责 | 不含 |
|------|------|------|------|
| L1 | spec.md | 变更范围（背景 + 影响清单 + 决策） | 实施细节 |
| L2 | plan.md | 变更方案（delta 格式 + 技术选型） | 文件路径/行号 |
| L3 | tasks.md | 变更执行（文件级任务 + 调研标注） | 验收检查点 |
| 独立 | checklist.md | Review 机制（三分组检查点 + 回退） | 各层正文内容 |

### Checklist Review 机制

- `[ ]` 待审 / `[x]` 通过 / `[-]` 不通过
- 不通过项必须标注回退层级（spec/plan/tasks/执行）
- 全部通过才能归档

## 目录结构

```
uluo-change-flow/
├── .claude-plugin/plugin.json   ← 最小 plugin 包装
├── SKILL.md                     ← 编排器（三级模型 + 执行协议）
├── references/                  ← 方法论
│   ├── impact-analysis-protocol.md
│   └── sync-protocol.md
├── examples/                    ← 模板（5 个）
├── agents/impact-analyzer.md    ← 影响分析子代理
├── scripts/                     ← 硬约束校验工具
│   ├── validate-change.js       ← 主校验入口（7 步管线）
│   ├── checks/                  ← 6 个校验模块
│   ├── lib/utils.js             ← 共享工具函数
│   └── __tests__/               ← 测试（89 个用例）
└── evals/evals.json             ← 评测用例
```

## 校验工具

```bash
# 校验单个变更目录
node scripts/validate-change.js specs/<feature>/changes/CHG-NNN

# 严格模式（警告视为失败）
node scripts/validate-change.js specs/<feature>/changes/CHG-NNN --strict

# 代码对齐校验（需指定项目根目录）
PROJECT_ROOT=/path/to/project node scripts/validate-change.js specs/<feature>/changes/CHG-NNN
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PROJECT_ROOT` | 项目根目录路径（用于 Step 6 代码对齐校验） | `process.cwd()` |

## 测试

```bash
# 运行所有测试
node scripts/__tests__/change-spec.test.js
node scripts/__tests__/change-plan.test.js
node scripts/__tests__/change-tasks.test.js
node scripts/__tests__/change-checklist.test.js
node scripts/__tests__/integration.test.js
```

## Benchmark 结果

| 配置 | Pass Rate | 时间 |
|------|----------|------|
| With Skill | 100% ± 0% | 43.7s ± 6.5s |
| Without Skill | 11.2% ± 1.3% | 30.3s ± 6.5s |
| **Delta** | **+89%** | +13.3s |

详见 `evals/workspaces/uluo-change-flow/iteration-1/benchmark.json`。

## 安装

```bash
# 通过 marketplace 安装
claude plugin install uluo-change-flow@claude-uluo --scope project
```

## License

MIT
