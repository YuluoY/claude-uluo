# Checklist

## 目录结构
- [x] `skills/uluo-skill-creator/` 目录已创建
- [x] `.claude-plugin/plugin.json` 存在且包含 name/version/description/skills 字段
- [x] `marketplace.json` 已注册 `uluo-skill-creator` 条目

## SKILL.md 编排器
- [x] 定义了核心理念（软约束 md + 硬约束 scripts 分工）
- [x] 定义了十阶段创建流程（Phase 0-9）
- [x] 定义了场景跳过规则（简单/中等/复杂/紧急）
- [x] 定义了远程引用 skill-creator 的方式（GitHub raw + npx skills + 离线 fallback）
- [x] 定义了质量闸门（Phase 7 本地校验 + Phase 8 远程审计）
- [x] SKILL.md 行数 < 500
- [x] frontmatter 的 description 包含"Use when"触发条件
- [x] 明确引用 references/ 文件的时机

## references/ 规范文档
- [x] `skill-anatomy.md`——skill 目录结构规范（必需文件、可选目录命名、plugin.json 字段）
- [x] `skillmd-spec.md`——SKILL.md 内容规范（frontmatter、description、progressive disclosure、行数约束）
- [x] `hard-soft-constraint.md`——软硬约束设计原则（分类规则、node/python 生态库、脚本独立执行）
- [x] `remote-skill-creator.md`——远程引用方式（GitHub raw URL 清单、npx skills 命令、离线 fallback、选择规则）

## examples/ 模板
- [x] `skill-template/`——标准 skill 目录模板骨架（含 SKILL.md、plugin.json、references/、scripts/、evals/）
- [x] `evals-template.json`——evals.json 模板（含 skill_name、evals 数组、字段说明）

## scripts/ 硬约束校验工具
- [x] `lib/utils.js`——共享工具函数（文件读取、frontmatter 解析、结果格式化）
- [x] `checks/structure.js`——目录结构校验（必需文件、plugin.json 字段、可选目录命名）
- [x] `checks/skillmd.js`——SKILL.md 内容校验（frontmatter、name 一致性、description 触发条件、行数）
- [x] `checks/scripts-executable.js`——脚本可执行性校验（node --check、py_compile、非法依赖检查）
- [x] `validate-skill.js`——主编排器（4 步管线，输出 JSON 或 pass/fail + 错误清单）
- [x] 脚本可独立执行（`node scripts/validate-skill.js <path>`），不依赖 AI 上下文
- [x] 脚本利用 node/python 生态降低 token 消耗——采用零依赖方案（首选），用 Node.js 内置模块替代外部库，references/hard-soft-constraint.md 已更新为零依赖首选 + 外部库备选

## 测试
- [x] `__tests__/helpers.js`——测试工具
- [x] `__tests__/structure.test.js`——目录结构校验测试（正反例）
- [x] `__tests__/skillmd.test.js`——SKILL.md 内容校验测试（正反例）
- [x] `__tests__/scripts-executable.test.js`——脚本可执行性测试（正反例）
- [x] `__tests__/integration.test.js`——集成测试（完整校验流程）
- [x] 所有测试通过——structure 8/8、skillmd 8/8、scripts-executable 4/6（2 个 .py 测试因环境无 python 命令跳过）、integration 3/3，合计 23 passed 0 failed 2 skipped

## evals
- [x] `evals/evals.json`——本 skill 的 evals（2-3 个真实测试用例）

## 核心理念验证
- [x] 软硬约束分工明确（能用脚本的不用 md）
- [x] md 只写需要 AI 判断的部分（决策逻辑、流程编排）
- [x] 脚本利用 node/python 生态降低 token 消耗
- [x] 远程引用 skill-creator 不依赖本地相对路径（离线 fallback 除外）
- [x] 本地 skill-creator 保持原样，两者并存
