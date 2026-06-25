# Spec: 从 skill 中移除 plugin.json 规范（移至项目 CLAUDE.md）

## Why

`.claude-plugin/plugin.json` 是 claude-uluo workspace 的项目绑定规范，不是 skill 本身的要求。用户使用 uluo-skill-creator 创建 skill 时可能不针对 claude 平台，不应强制或可选地包含 plugin.json。plugin.json 规范应从 skill 中完全移除，移至项目 CLAUDE.md。

## What Changes

- **BREAKING**：从 uluo-skill-creator 中完全移除 plugin.json 相关的校验、规范、示例
- structure.js 不再校验 plugin.json（删除相关代码）
- skill-anatomy.md 不再提及 plugin.json（删除相关章节和示例）
- 测试中不再涉及 plugin.json
- plugin.json 的规则约束移至项目 CLAUDE.md（作为 workspace 级规范，不影响 skill 本身）

## Impact

- Affected specs: skill-anatomy.md（目录结构规范）、structure.js（校验逻辑）
- Affected code: `scripts/checks/structure.js`、`scripts/__tests__/structure.test.js`、`scripts/__tests__/helpers.js`、`scripts/__tests__/integration.test.js`
- Affected docs: `references/skill-anatomy.md`、`SKILL.md`（如提及）、`references/hard-soft-constraint.md`（如示例提及）
- Affected project: `CLAUDE.md`（新增 workspace 打包规范说明）

## ADDED Requirements

### Requirement: 项目 CLAUDE.md 新增 workspace 打包规范

claude-uluo workspace 内的 skill 需创建 `.claude-plugin/plugin.json` 用于 plugin 分发。此规范是 workspace 级别，不影响 uluo-skill-creator 创建的 skill。

## REMOVED Requirements

### Requirement: plugin.json 校验

**Reason**: plugin.json 是 workspace 绑定规范，不是 skill 本身要求
**Migration**: 
- structure.js 删除 plugin.json 校验代码
- skill-anatomy.md 删除 plugin.json 相关章节
- 测试删除 plugin.json 相关用例
- 规则移至 CLAUDE.md

### Requirement: plugin.json 字段规范

**Reason**: 同上
**Migration**: 字段规范移至 CLAUDE.md
