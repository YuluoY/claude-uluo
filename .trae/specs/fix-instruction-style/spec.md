# Spec: 指令式写作 + skill-creator 环节化 + 加粗规则

## 背景

用户纠正 3 个问题（含二次纠正）：
1. **Skill 应写指令为主**——告诉 AI"怎么做、怎么做得更好、禁止做什么"。但**不是完全移除解释**——在需要稳固边界时，解释作为**条件行约束表述**的结构化内容保留。
2. **skill-creator 是创建新 skill 必须走的环节**——不是"可选引用方式"，而是流程中必须经过的环节（如同 Phase 7 校验）。不需要专门描述"如何引用 skill-creator"。
3. **重点先行需加粗规则**——重点先行表述应配合 md 加粗，结构为 `**关键词**：展开描述`。

## 目标

### 纠正 1：指令式写作（含边界约束保留）

**原则**：skill 内容以指令为主（怎么做、怎么做得更好、禁止做什么）。

**关键区分**——两种"解释"：
| 类型 | 特征 | 处理 |
|------|------|------|
| 纯解释 | 解释"为什么这样设计"，无约束作用 | 删除或改写为指令 |
| 边界约束 | 解释作为禁止事项/约束的条件依据 | **保留**，结构化为条件行约束 |

**边界约束表述示例**：
```markdown
- **禁止用 md 写能用脚本确定的校验**——目录结构、frontmatter、脚本可执行性必须用 scripts/ 硬约束
```
这里"——"后的内容是约束条件（稳固边界），应保留。

**纯解释表述示例**（应删除）：
```markdown
降低 token 是核心目标。md 内容占用 AI 上下文 token，脚本独立执行不占用。
```
这是纯设计理由，无约束作用。

**判断标准**：每句话检查——
- 是指令/最佳实践/禁止事项吗？→ 保留
- 是禁止事项的**条件依据**吗？→ 保留为结构化约束
- 是纯设计理由/背景解释吗？→ 删除或改写

### 纠正 2：skill-creator 环节化（非引用方式）

**当前错误**：SKILL.md 有"远程引用 skill-creator"独立章节 + references/remote-skill-creator.md 独立文档，把 skill-creator 当作"可选引用"。

**正确理解**：skill-creator 是创建新 skill **必须经过的环节**（Phase 8 测试/benchmark 必须用 skill-creator 的脚本）。如同 Phase 7 必须用 validate-skill.js，不需要专门描述"如何引用"。

**修正方案**：
- SKILL.md 移除"远程引用 skill-creator"独立章节
- Phase 8 描述中直接说明"使用 skill-creator 的脚本"（如同 Phase 7 说"使用 validate-skill.js"）
- `references/remote-skill-creator.md` 精简或合并到 benchmark-workflow.md（因为 skill-creator 是 Phase 8 环节的一部分）
- 不再区分"本地优先/远程备选"——这是环境适配问题，不是流程问题

### 纠正 3：重点先行 + 加粗规则

**结构**：`**关键词**：展开描述`

**示例**：
- `**软约束**：md 写 AI 判断部分（决策逻辑、流程编排）`
- `**硬约束**：scripts 写确定性校验（结构、格式、固定流程）`

**规则**：
- 关键词加粗（`**xxx**`），后接冒号，再展开描述
- 关键词是内容相关的具体词（不是统一的"短重点"标签）
- 章节开头用此结构概括重点，后续用表格/列表/mermaid 展开

## 修改范围

| 文件 | 修改内容 |
|------|---------|
| `SKILL.md` | 移除纯解释、保留边界约束、移除"远程引用"独立章节、加粗规则 |
| `references/skillmd-spec.md` | 移除纯解释、保留边界约束、加粗规则 |
| `references/hard-soft-constraint.md` | 移除纯解释（如"降低 token 是核心目标"）、保留约束条件、精简为指令 |
| `references/skill-quality-rubric.md` | 移除纯解释 |
| `references/benchmark-workflow.md` | 移除纯解释、skill-creator 作为环节直接引用 |
| `references/remote-skill-creator.md` | 精简或合并到 benchmark-workflow.md（不再独立描述引用方式） |
| `references/skill-anatomy.md` | 检查并移除纯解释 |

## 非目标

- 不修改 scripts/（脚本逻辑不变）
- 不修改测试用例（除非内容变化导致断言失败）
- 不删除用于稳固边界的约束性表述

## 规范适用范围

**关键**：本 spec 的所有规范不仅适用于 uluo-skill-creator 自身，更适用于**用户使用 uluo-skill-creator 创建的所有 skill**。

| 规范 | 适用对象 |
|------|---------|
| 指令式写作（纯解释删除，边界约束保留） | uluo-skill-creator 自身 + 产出的 skill |
| skill-creator 环节化（不独立描述引用方式） | uluo-skill-creator 自身（产出 skill 不涉及） |
| 重点先行 + 加粗规则（**关键词**：展开描述） | uluo-skill-creator 自身 + 产出的 skill |

**Phase 7 校验扩展**：validate-skill.js 校验产出 skill 时，需检查：
- SKILL.md 是否以指令为主（无纯解释段落）
- 边界约束是否保留（禁止事项后的约束条件）
- 重点先行是否配合加粗规则

**references/ 规范文档**：skillmd-spec.md、hard-soft-constraint.md 中的写作规范是产出 skill 必须遵守的标准。Phase 4 编写 SKILL.md 时按这些规范执行，Phase 7 校验时检查。
