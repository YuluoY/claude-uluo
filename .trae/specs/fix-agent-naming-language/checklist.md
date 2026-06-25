# Checklist

## Agent 文件重命名与重写
- [x] `agents/skill-quality-grader.md` 已删除
- [x] `agents/grader.md` 已创建
- [x] 文件名简短（单词级，与 skill-creator 风格一致）
- [x] 内容全部为中文（专有名词除外）
- [x] 保持单一职责（只做 skill 质量评分）
- [x] 保留 5 维度评分逻辑（结构合规/流程编排/约束分工/文档质量/测试覆盖）
- [x] JSON 输出格式不变（字段名保留英文，字段值示例改中文）

## agent-creation-guide.md 示例中文化
- [x] 指令式示例改为中文（"Read the transcript" → 中文）
- [x] Guidelines 示例改为中文（"Be objective" → 中文）
- [x] PASS/FAIL 条件示例改为中文（保留 PASS/FAIL 标识）
- [x] JSON 输出示例中的描述改为中文
- [x] 专有名词保留英文（JSON、mermaid、Phase 等）

## agent-template.md 模板中文化
- [x] 模板骨架改为中文
- [x] 占位符说明改为中文
- [x] 使用指引改为中文

## agents-decision.md 引用更新
- [x] `constraint-auditor` 引用更新为 `grader`
- [x] 示例与实际文件一致

## SKILL.md 引用检查
- [x] agents 目录决策章节引用路径正确
- [x] 无残留旧文件名引用

## 测试验证
- [x] 所有测试通过（29 passed, 0 failed, 2 skipped）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)

## 核心纠正验证
- [x] agent 文件名简短（grader.md，非 skill-quality-grader.md）
- [x] agent 内容语言一致（全中文，专有名词除外）
- [x] agent 单一职责（只做评分一件事）
- [x] 规范适用于用户使用 uluo-skill-creator 创建的所有 skill
