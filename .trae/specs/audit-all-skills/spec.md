# 批量审查 skills 文件夹 Spec

## Why

claude-uluo workspace 的 skills/ 目录下有 9 个 skill（排除 impeccable、skill-creator）需要按 uluo-skill-creator 的规范进行系统性测试与审查，以发现结构、流程、约束分工、文档质量、测试覆盖等方面的问题并修复。

## What Changes

- 对 9 个 skill 逐个执行 uluo-skill-creator 的 Phase 7 本地硬约束校验（`validate-skill.js`）
- 对 9 个 skill 逐个执行 Phase 8 质量评分（`grade-skill.js`，5 维度 100 分）
- 运行各 skill 已有的 `__tests__/` 测试套件
- 人工审查 SKILL.md 内容是否符合 uluo-skill-creator 写作规范（指令式、边界约束保留、加粗规则、frontmatter 规范）
- 汇总每个 skill 的问题清单，按优先级分类（P0/P1/P2/P3）
- 采用循环任务模式：完成一个 skill 审查后通过 AskUserQuestion 询问用户下一步，直到用户输出【结束】

## Impact

- Affected specs: 无（审查任务，不直接修改 spec）
- Affected code: skills/ 下 9 个 skill 目录（diagram-compiler、frontend-visual-qa、html-blueprint、spirit-forge、ui-component-creator、uluo-change-flow、uluo-doc-standards、uluo-skill-creator、uluo-web-standards）

## 并行策略

**阶段一（并行）**：批量运行 `validate-skill.js` + `grade-skill.js` 于全部 9 个 skill，快速收集自动化数据。使用子代理并行执行，每个子代理负责 2-3 个 skill 的自动化校验+评分+测试运行。

**阶段二（串行循环）**：逐个 skill 人工审查 + 汇报结果 + AskUserQuestion 询问下一步。每个 skill 审查作为一个独立任务单元，完成后弹出 AQ 对话框。

## ADDED Requirements

### Requirement: 批量自动化校验
系统 SHALL 对 9 个 skill 并行运行 `validate-skill.js` 和 `grade-skill.js`，收集硬约束校验结果和 5 维度质量评分。

#### Scenario: 自动化校验完成
- **WHEN** 阶段一并行子代理全部完成
- **THEN** 汇总 9 个 skill 的校验状态（pass/fail）、评分（A/B/C/D）、扣分项清单

### Requirement: 逐个 skill 人工审查
系统 SHALL 对每个 skill 执行人工审查，包括 SKILL.md 内容规范、references 引用、agents 写作规范、evals 完整性。

#### Scenario: 单个 skill 审查完成
- **WHEN** 某个 skill 的自动化数据 + 人工审查完成
- **THEN** 输出该 skill 的审查报告（问题清单 + 优先级 + 修复建议），并通过 AskUserQuestion 询问用户下一步

### Requirement: 循环任务模式
系统 SHALL 在完成每个 skill 审查任务后，通过 AskUserQuestion 工具询问用户下一步操作，直到用户输出【结束】关键字。

#### Scenario: 用户继续下一个 skill
- **WHEN** 用户在 AQ 对话框选择继续下一个 skill 或指定修复当前 skill 问题
- **THEN** 执行用户指定的任务，完成后再次弹出 AQ 对话框

#### Scenario: 用户结束循环
- **WHEN** 用户输出【结束】关键字
- **THEN** 终止循环，返回最终汇总报告

## 审查维度（对齐 uluo-skill-creator rubric）

| 维度 | 分值 | 检查内容 |
|------|------|---------|
| 结构合规 | 20 | SKILL.md 存在、目录命名规范、无非规范目录 |
| 流程编排 | 20 | Phase 模型、mermaid flowchart、内部 loop、质量闸门 |
| 约束分工 | 20 | 软硬约束分类、脚本承载、md 精简、脚本可执行 |
| 文档质量 | 20 | frontmatter 规范、行数、references 引用、内容结构化 |
| 测试覆盖 | 20 | evals.json 存在、用例数、assertions 完整、测试通过 |

## 9 个 skill 清单

| # | skill | 复杂度 | 测试文件 |
|---|-------|--------|---------|
| 1 | diagram-compiler | full（Python scripts） | 无 __tests__ |
| 2 | frontend-visual-qa | full（JS scripts） | __tests__/all-checks.test.js |
| 3 | html-blueprint | full（JS scripts） | __tests__/ 多个 |
| 4 | spirit-forge | full（Python scripts） | __tests__/ 多个 |
| 5 | ui-component-creator | full（Python scripts） | 无 __tests__ |
| 6 | uluo-change-flow | full（JS scripts） | __tests__/ 多个 |
| 7 | uluo-doc-standards | full（JS scripts） | __tests__/ 多个 |
| 8 | uluo-skill-creator | full（JS scripts） | __tests__/ 多个 |
| 9 | uluo-web-standards | full（JS scripts） | 无 __tests__ |
