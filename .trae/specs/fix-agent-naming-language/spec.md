# Spec: Agent 命名与语言一致性

## 背景

用户指出 uluo-skill-creator 的 agents 结构存在三个问题：
1. **命名太长**——`skill-quality-grader.md` 命名冗长，应像 skill-creator 的 `grader.md` 一样简短
2. **语言不一致**——agent md 文件中英混用（标题/Role/Process 是英文，维度名称/示例是中文），违反"一个 skill 必须保持语言一致"原则
3. **一个 agent 一件事一身份**——确认当前 grader 只做评分一件事（符合），但需在重写时保持单一职责

skill-creator 的 agents（grader/analyzer/comparator）全部使用简短英文名 + 全英文内容。uluo-skill-creator 的 SKILL.md 和 references 全部是中文，因此 agent 也应统一为中文。

## 目标

### 纠正 1：Agent 文件重命名

**当前**：`agents/skill-quality-grader.md`（冗长）
**目标**：`agents/grader.md`（简短，与 skill-creator 命名风格一致）

**规则**：agent 文件名用一个单词概括职责（grader/analyzer/comparator），不加 skill 名前缀。

### 纠正 2：Agent 内容统一为中文

**当前问题**：`skill-quality-grader.md` 混合中英文：
- 英文：标题（`# Skill Quality Grader Agent`）、Role 段落、Process 步骤描述、Guidelines
- 中文：维度名称（结构合规/流程编排等）、扣分原因示例、字段说明

**目标**：全部改写为中文（专有名词除外，如 JSON、Phase、mermaid、PASS/FAIL）。

**专有名词白名单**（可保留英文）：
- 技术术语：JSON、mermaid、Phase、frontmatter、semver、token、loop
- 文件名/路径：SKILL.md、references/、scripts/、agents/
- 判定标识：PASS/FAIL（作为判定结果标识）
- 工具名：node、py_compile

### 纠正 3：agent-creation-guide.md 示例统一为中文

**当前问题**：指南说明是中文，但所有示例是英文：
- "Read the transcript file completely"
- "Be objective: Base verdicts on evidence, not assumptions"
- "Stay blind: DO NOT try to infer which skill produced which output"

**目标**：示例改写为中文，与指南说明语言一致。

### 纠正 4：agent-template.md 模板统一为中文

**当前问题**：模板骨架是英文：
- "You receive these parameters in your prompt"
- "Save results to `{output_path}`"
- "Write a JSON file with this structure"

**目标**：模板改为中文骨架。

### 纠正 5：agents-decision.md 示例引用更新

**当前问题**：第 111 行示例引用 `constraint-auditor`，但实际创建的是 `grader.md`。

**目标**：更新示例引用为 `grader`，与实际文件一致。

## 修改范围

| 文件 | 修改内容 |
|------|---------|
| `agents/skill-quality-grader.md` | 删除，重命名为 `grader.md`，内容改写为全中文 |
| `references/agent-creation-guide.md` | 所有英文示例改写为中文 |
| `examples/agent-template.md` | 模板骨架改写为中文 |
| `references/agents-decision.md` | 更新 `constraint-auditor` 引用为 `grader` |
| `SKILL.md` | 检查 agents 目录决策章节引用是否需更新 |

## 非目标

- 不修改 scripts/（脚本逻辑不变）
- 不修改测试用例（除非内容变化导致断言失败）
- 不修改 skill-creator 的 agents（那是参考资源，不修改）
- 不改变 agent 的职责范围（仍然只做评分一件事）

## 规范适用范围

**关键**：本 spec 的规范不仅适用于 uluo-skill-creator 自身，更适用于**用户使用 uluo-skill-creator 创建的所有 skill**。

| 规范 | 适用对象 |
|------|---------|
| agent 文件名简短（单词级） | uluo-skill-creator 自身 + 产出的 skill |
| agent 内容语言一致（全中文或全英文） | uluo-skill-creator 自身 + 产出的 skill |
| agent 单一职责一件事 | uluo-skill-creator 自身 + 产出的 skill |

**agent-creation-guide.md 更新后**：用户创建 skill 时，按更新后的指南编写的 agent md 文件将自动遵循语言一致性规范。
