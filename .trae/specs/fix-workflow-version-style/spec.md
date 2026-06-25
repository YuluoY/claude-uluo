# Spec: 修复流程终点 + 写作风格 + 版本号

## 背景

用户纠正 3 个问题：
1. **流程最后不需要打包发布**——Phase 9 "打包发布" 应移除
2. **"短重点"是写作结构，不是标签**——用户原意是"提取重点意思+展开描述"的写作模式，不是到处贴 `**短重点**：` 标签
3. **skill 需要有版本号**——SKILL.md frontmatter 应包含 version 字段

## 目标

### 纠正 1：移除"打包发布"阶段

- Phase 9 "打包发布" 移除，流程从十阶段改为九阶段（Phase 0-8）
- Phase 8 benchmark 满意后即为流程终点（可选手动发布，不在流程内）
- Mermaid 流程图终点改为"完成"

### 纠正 2：修复"短重点"写作风格

**用户原意**：`【短重点：相关描述/细节展开】` 是一种写作结构——先提取重点意思，再展开描述/细节。

**当前错误**：在每个章节标题下贴 `**短重点**：xxx` 标签，这是对结构的机械化误解。

**修复方案**：
- 移除所有 `**短重点**：` 标签
- 改为"重点先行+展开描述"的写作风格：每个章节第一句/第一段先概括重点，后续用表格/列表/mermaid 展开
- skillmd-spec.md 中的"短重点：描述/细节展开"章节重写为"重点先行写作模式"
- 不再要求机械贴标签

### 纠正 3：新增 version 字段

- SKILL.md frontmatter 新增 `version` 必需字段（语义化版本号，如 `0.1.0`）
- skillmd-spec.md frontmatter 规范新增 version 字段
- skillmd.js 新增 version 校验（非空、符合 semver 格式）
- skill-anatomy.md 更新 frontmatter 字段说明
- grade-skill.js 文档质量维度新增 version 评分项
- 测试更新

## 修改范围

| 文件 | 修改内容 |
|------|---------|
| `SKILL.md` | 移除 Phase 9、移除所有"短重点"标签、frontmatter 加 version、mermaid 更新 |
| `references/skillmd-spec.md` | frontmatter 加 version、重写"短重点"章节为"重点先行写作模式" |
| `references/skill-anatomy.md` | frontmatter 字段说明加 version |
| `references/skill-quality-rubric.md` | 移除"短重点"相关表述、文档质量维度加 version 评分 |
| `references/benchmark-workflow.md` | mermaid 终点"打包发布"→"完成" |
| `scripts/checks/skillmd.js` | 新增 version 校验 |
| `scripts/grade-skill.js` | 文档质量维度加 version 评分 |
| `scripts/__tests__/skillmd.test.js` | 新增 version 测试 |
| `scripts/__tests__/grade-skill.test.js` | 更新 fixture 加 version |

## 非目标

- 不修改 plugin.json（已有 version 字段）
- 不修改 validate-skill.js 主编排器（子检查自动生效）
- 不修改 structure.js（plugin.json version 已校验）
