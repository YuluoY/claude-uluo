# Checklist

## SKILL.md 精简
- [x] 移除纯解释段落
- [x] 保留边界约束条件依据（如禁止事项后的"——"约束条件）
- [x] 移除"远程引用 skill-creator"独立章节
- [x] Phase 8 直接说明"使用 skill-creator 脚本"
- [x] 加粗规则应用（**关键词**：展开描述）

## references/skillmd-spec.md 精简
- [x] 移除纯解释
- [x] 保留边界约束
- [x] 加粗规则应用

## references/hard-soft-constraint.md 精简
- [x] 移除纯解释（如"降低 token 是核心目标"）
- [x] 保留约束条件
- [x] 精简为指令式

## references/skill-quality-rubric.md 精简
- [x] 移除纯解释
- [x] 保留评分标准

## references/benchmark-workflow.md 精简
- [x] 移除纯解释
- [x] skill-creator 作为环节直接引用

## references/remote-skill-creator.md 处理
- [x] 精简为必需环节说明

## references/skill-anatomy.md 检查
- [x] 检查并应用加粗规则

## 测试验证
- [x] 所有测试通过（34 passed, 0 failed, 2 skipped）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)

## 规范适用范围
- [x] skillmd-spec.md 明确"本规范适用于用户创建的所有 skill"
- [x] hard-soft-constraint.md 明确"本规范适用于用户创建的所有 skill"
- [x] Phase 7 校验说明包含"检查产出 skill 是否符合写作规范"

## 核心纠正验证
- [x] skill 内容以指令为主（怎么做/怎么做得更好/禁止做什么）
- [x] 边界约束条件依据保留（不删除约束性表述）
- [x] 纯设计理由/背景解释已移除
- [x] skill-creator 作为必须环节，不再独立描述引用方式
- [x] 重点先行配合加粗规则（**关键词**：展开描述）
- [x] 规范明确适用于用户使用 uluo-skill-creator 创建的所有 skill
