# Spec: Agent 创建指南与 uluo-skill-creator 自身 agents

## Why

agents/ 目录放的是 skill **自己使用的子代理 md 文件**（如 skill-creator 的 grader.md/analyzer.md/comparator.md），不是 README.md。当 AI 使用 uluo-skill-creator 时，会根据这些 agent md 文件派生子代理执行任务。当前 agents/README.md 只是引用说明，不是实际 agent，需要替换为 uluo-skill-creator 自己使用的子代理。同时提供 agent 创建指南，让用户使用 uluo-skill-creator 创建新 skill 时能按需创建 agent。

## What Changes

- **删除** `agents/README.md`——不是实际 agent 文件
- **新增** `agents/skill-quality-grader.md`——uluo-skill-creator 自身使用的质量评分子代理（Phase 8 时派生，辅助评估 skill 规范质量）
- **新增** `references/agent-creation-guide.md`——agent md 文件的写作规范和经验总结
- **新增** `examples/agent-template.md`——agent md 文件模板骨架
- **修改** `references/agents-decision.md`——更新决策规则
- **修改** `SKILL.md`——agents 目录决策部分更新

## Impact

- Affected docs: `agents/README.md`（删除）、`agents/skill-quality-grader.md`（新增）、`references/agent-creation-guide.md`（新增）、`examples/agent-template.md`（新增）、`references/agents-decision.md`、`SKILL.md`
- 不影响 scripts/ 和测试

## ADDED Requirements

### Requirement: agents/ 目录放实际 agent md 文件

agents/ 目录放的是 skill 自己使用的子代理 md 文件，不是 README.md。每个 agent md 文件定义一个子代理的角色/输入/输出/流程。

#### Scenario: AI 使用 uluo-skill-creator 时需要质量评分
- **WHEN** Phase 8 需要评估 skill 规范质量（rubric 评分）
- **THEN** AI 读取 agents/skill-quality-grader.md，派生子代理执行评分

### Requirement: agent 创建指南

基于 skill-creator 的 grader.md、analyzer.md、comparator.md 分析，提炼 agent md 文件的写作规范，供用户创建新 skill 时参考。

#### Scenario: 用户使用 uluo-skill-creator 创建新 skill 时需要 agent
- **WHEN** 用户创建的 skill 流程中有并行子任务或专业分析需求
- **THEN** 读取 references/agent-creation-guide.md，按规范创建 agent md 文件

### Requirement: agent 模板

提供通用模板骨架，包含必需章节：
- `# Title` + 一句话副标题（动词开头）
- `## Role`（2-4 段：做什么/怎么做/边界约束）
- `## Inputs`（粗体字段名 + 说明列表）
- `## Process`（Step 编号 + 有序列表）
- `## Output Format`（JSON 代码块）
- `## Guidelines`（粗体关键词列表，5-8 条）

### Requirement: agent 写作规范

- **指令式为主**：动词开头（Read/Examine/Analyze/Save）
- **路径用占位符**：`{outputs_dir}`、`{output_path}`
- **判定逻辑显式化**：PASS/FAIL 条件、优先级列表
- **输出是 JSON 契约**：字段值用真实示例，不用 `<string>` 占位
- **Guidelines 是行为护栏**：5-8 条，首条放最高优先级约束
- **长度控制**：单一模式 200-230 行，多模式可至 270-300 行

## MODIFIED Requirements

### Requirement: agents-decision.md

更新决策规则：
- skill 流程中有并行子任务或专业分析需求 → 创建 agent md 文件
- 仅需 skill-creator 的标准 benchmark agents → Phase 8 引用 skill-creator
- 无并行/专业需求 → 不创建 agents/ 目录

## REMOVED Requirements

### Requirement: agents/README.md

**Reason**: agents/ 目录应放实际 agent md 文件，不是 README.md 说明文件
**Migration**: 删除 README.md，替换为实际 agent md 文件
