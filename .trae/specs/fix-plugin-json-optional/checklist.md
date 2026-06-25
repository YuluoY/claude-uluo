# Checklist

## scripts/checks/structure.js 修改
- [x] 删除 plugin.json 必需文件校验代码
- [x] 删除 plugin.json 字段完整性校验代码
- [x] 必需文件仅保留 SKILL.md

## references/skill-anatomy.md 修改
- [x] 删除"plugin.json 字段要求"章节
- [x] 必需文件清单表格中删除 plugin.json 行
- [x] 标准目录结构图中删除 .claude-plugin/plugin.json
- [x] 目录创建顺序中删除 plugin.json 步骤
- [x] 现有 skill 目录结构示例中删除 .claude-plugin/plugin.json

## 项目 CLAUDE.md 修改
- [x] 新增"workspace 打包规范"章节
- [x] 包含 plugin.json 字段规范

## 测试更新
- [x] structure.test.js 删除 plugin.json 相关测试用例
- [x] helpers.js createValidSkill 不再创建 plugin.json
- [x] integration.test.js 调整
- [x] grade-skill.test.js fixture 调整
- [x] grade-skill.js 删除 plugin.json 评分逻辑，重新分配分值（8/6/6）
- [x] 所有测试通过（29 passed, 0 failed, 2 skipped）

## 其他文件检查
- [x] SKILL.md 不再提及 plugin.json
- [x] hard-soft-constraint.md 示例不再提及 plugin.json
- [x] examples/ 模板不再包含 plugin.json
- [x] benchmark-workflow.md 删除 plugin.json 引用
- [x] skill-quality-rubric.md 删除 plugin.json 评分项
- [x] evals/evals.json 删除 plugin.json 相关 assertion

## 核心验证
- [x] skill 中完全无 plugin.json 相关内容
- [x] plugin.json 规范移至项目 CLAUDE.md
- [x] structure.js 仅校验 SKILL.md
- [x] 使用 uluo-skill-creator 创建的 skill 不包含 plugin.json
- [x] validate-skill.js 通过
- [x] grade-skill.js 评分 100/100 (A)
