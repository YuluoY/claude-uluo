# Checklist

## researcher agent md 文件
- [x] `agents/researcher.md` 已创建
- [x] 文件名简短（researcher.md，与 grader.md 风格一致）
- [x] 内容全部为中文（专有名词除外）
- [x] 单一职责（只做综合调研，不设计/编写/评分）
- [x] 内置领域识别关键词 → 推荐渠道规则
- [x] 定义输入（skill 需求描述）、输出（调研报告 JSON）、流程（5 步骤）
- [x] JSON 输出格式包含 skill_domain/similar_skills/technical_solutions/best_practices/recommended_channels

## 通用渠道调研脚本
- [x] `scripts/research.js` 已创建
- [x] 支持本地 skill 扫描（扫描 skills/ 目录）
- [x] 支持 anthropics/skills 参考（本地缓存或提示 GitHub raw 获取）
- [x] 输入 skill 需求关键词
- [x] 输出类似 skill 列表 JSON
- [x] 支持 `--json` 参数
- [x] 通过 `node --check` 语法校验

## 脚本测试
- [x] `scripts/__tests__/research.test.js` 已创建
- [x] 测试本地 skill 扫描功能
- [x] 测试关键词匹配逻辑
- [x] 测试通过（8 passed）

## agents-decision.md 更新
- [x] 运行时 agent 示例增加 researcher（与 grader 并列）
- [x] 决策树更新（Phase 1 调研环节可引用 researcher）
- [x] 两类 agent 对比表更新（运行时 agent 增加 researcher 示例）

## SKILL.md 更新
- [x] Phase 1 调研引用 researcher agent
- [x] references 引用时机表更新（Phase 1 标注 researcher agent）
- [x] agents 目录决策章节更新（grader + researcher 两个运行时 agent）

## agent-creation-guide.md 检查
- [x] 检查是否需补充多 agent 协作说明
- [x] 添加多 agent 协作章节（grader + researcher 分工）

## 测试验证
- [x] 所有测试通过（37 passed, 0 failed, 2 skipped）
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)

## 核心纠正验证
- [x] researcher agent 文件名简短（researcher.md）
- [x] researcher 内容语言一致（全中文，专有名词除外）
- [x] researcher 单一职责（只做调研一件事）
- [x] 分层调研渠道设计（L1 通用脚本固化 + L2 专业 agent 推荐 + L3 按需扩展）
- [x] 解决"领域不确定"问题（按需求关键词匹配领域，推荐对应渠道）
- [x] 规范适用于用户使用 uluo-skill-creator 创建的所有 skill
