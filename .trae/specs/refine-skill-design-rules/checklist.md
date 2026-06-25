# Checklist

## references/skillmd-spec.md 修改
- [x] 明确规范适用于"产出的 skill"
- [x] 新增"内容结构化描述"规则
- [x] 放宽行数约束（< 300 正常，300-500 警告，≥ 800 fail）
- [x] 补充"流程编排禁止细节"规则——重点内容可放但需结构化

## references/skill-quality-rubric.md 修改
- [x] 文档质量维度行数评分放宽
- [x] 新增"内容结构化"评分项

## scripts/grade-skill.js 修改
- [x] 文档质量维度行数评分逻辑放宽
- [x] 新增内容结构化检查

## scripts/checks/skillmd.js 修改
- [x] 行数校验阈值放宽

## SKILL.md 修改
- [x] 禁止事项中的行数约束描述更新
- [x] 明确 references/ 规范适用于产出的 skill

## 测试更新
- [x] 更新 skillmd.test.js 的行数测试
- [x] 更新 grade-skill.test.js 的行数相关测试
- [x] 所有测试通过（31 passed, 0 failed, 2 skipped）

## 核心纠正验证
- [x] 规范明确适用于"产出的 skill"（不仅自身）
- [x] 内容结构化描述规则已新增
- [x] 行数限制已放宽（不再强制 < 150）
- [x] 重点内容可放 SKILL.md（但需结构化）
