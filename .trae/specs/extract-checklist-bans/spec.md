# 抽取 checklist 与禁止事项为独立 reference 文件 Spec

## Why

当前 `SKILL.md` 中的「质量闸门」和「禁止事项」两节内容简略（各 6-8 条），且与编排逻辑混在一起，导致：
- 检查项不够全面，缺少 WCAG 2.2、性能、安全等维度的细化
- 禁止事项缺乏反例和正确做法对照
- 无法被其他阶段按需加载，要么全读要么不读

抽成独立的 `references/checklist-bans.md`，并基于业界资料（WCAG 2.2、React/Vue 性能最佳实践、a11y 手册）查漏补缺，写成全面详细的检查清单和反模式手册。

## What Changes

- **新增** `skills/component-creator/references/checklist-bans.md`——独立的检查清单 + 禁止事项参考文件，按维度分类，每条附判定标准和反例
- **修改** `skills/component-creator/SKILL.md`——将「质量闸门」和「禁止事项」两节替换为简短引导 + 链接到新文件
- **修改** `skills/component-creator/SKILL.md` 的「文件索引」表——新增 `checklist-bans.md` 条目

## Impact

- Affected specs: component-creator skill
- Affected code:
  - `skills/component-creator/SKILL.md`（删除两节，新增链接）
  - `skills/component-creator/references/checklist-bans.md`（新建）

## ADDED Requirements

### Requirement: 独立检查清单文件

系统 SHALL 提供 `references/checklist-bans.md` 作为组件创建的质量保障参考文件，包含两大模块：检查清单（Checklist）和禁止事项（Bans）。

#### Scenario: 检查清单覆盖维度

- **WHEN** 开发者查阅 checklist-bans.md
- **THEN** 检查清单 SHALL 覆盖以下维度：职责与 API、四态完整性、无障碍（含 WCAG 2.2）、i18n、主题与设计 token、响应式、性能、安全、测试覆盖、可维护性

#### Scenario: 禁止事项附反例

- **WHEN** 开发者查阅禁止事项
- **THEN** 每条禁令 SHALL 附带：错误示例（❌）、正确示例（✅）、判定标准

#### Scenario: 按阶段映射

- **WHEN** 开发者在某个 Phase 需要检查
- **THEN** 文件 SHALL 提供检查项到 Phase 的映射表，标注每项在哪个 Phase 检查

### Requirement: SKILL.md 引用更新

系统 SHALL 在 SKILL.md 中以简短引导段落 + 链接的方式引用 checklist-bans.md，不再内联完整清单。

#### Scenario: 质量闸门节替换

- **WHEN** 查看 SKILL.md 的质量闸门节
- **THEN** 内容 SHALL 为 2-3 句引导 + 链接到 `references/checklist-bans.md`

#### Scenario: 禁止事项节替换

- **WHEN** 查看 SKILL.md 的禁止事项节
- **THEN** 内容 SHALL 为 2-3 句引导 + 链接到 `references/checklist-bans.md`

#### Scenario: 文件索引更新

- **WHEN** 查看 SKILL.md 的 references 文件索引表
- **THEN** 表中 SHALL 新增 `checklist-bans.md` 条目，标注「Phase 4-5 完成前必读」
