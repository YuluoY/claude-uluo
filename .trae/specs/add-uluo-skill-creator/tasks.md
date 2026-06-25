# Tasks

- [x] Task 1: 创建 skill 目录结构和 plugin 包装
  - [x] SubTask 1.1: 创建 `skills/uluo-skill-creator/` 目录
  - [x] SubTask 1.2: 创建 `.claude-plugin/plugin.json`（最小 plugin 包装）
  - [x] SubTask 1.3: 在 `marketplace.json` 中注册 `uluo-skill-creator`

- [x] Task 2: 编写 SKILL.md 编排器
  - [x] SubTask 2.1: 定义核心理念（软约束 md + 硬约束 scripts 分工原则）
  - [x] SubTask 2.2: 定义十阶段创建流程（Phase 0-9）
  - [x] SubTask 2.3: 定义场景跳过规则（简单/中等/复杂/紧急）
  - [x] SubTask 2.4: 定义远程引用 skill-creator 的方式（GitHub raw + npx skills + 离线 fallback）
  - [x] SubTask 2.5: 定义质量闸门（Phase 7 本地校验 + Phase 8 远程审计）
  - [x] SubTask 2.6: 明确引用 references/ 文件的时机（progressive disclosure）

- [x] Task 3: 编写 references/ 规范文档
  - [x] SubTask 3.1: `skill-anatomy.md`——skill 目录结构规范（必需文件、可选目录命名、.claude-plugin/plugin.json 字段要求）
  - [x] SubTask 3.2: `skillmd-spec.md`——SKILL.md 内容规范（YAML frontmatter 字段、description 写法含"Use when"、progressive disclosure 三层模型、<500 行约束）
  - [x] SubTask 3.3: `hard-soft-constraint.md`——软硬约束设计原则（分类规则、node/python 生态库推荐、脚本独立执行要求）
  - [x] SubTask 3.4: `remote-skill-creator.md`——远程引用 skill-creator 的方式（GitHub raw URL 清单、npx skills 命令、离线 fallback 规则、选择规则）

- [x] Task 4: 编写 examples/ 模板
  - [x] SubTask 4.1: `skill-template/`——标准 skill 目录模板骨架（含 SKILL.md 骨架、.claude-plugin/plugin.json、references/、scripts/、evals/ 空目录）
  - [x] SubTask 4.2: `evals-template.json`——evals.json 模板（含 skill_name、evals 数组、id/prompt/expected_output/files 字段）

- [x] Task 5: 编写 scripts/ 硬约束校验工具
  - [x] SubTask 5.1: `lib/utils.js`——共享工具函数（文件读取、frontmatter 解析、结果格式化）
  - [x] SubTask 5.2: `checks/structure.js`——目录结构校验（必需文件存在、plugin.json 字段完整、可选目录命名规范）
  - [x] SubTask 5.3: `checks/skillmd.js`——SKILL.md 内容校验（frontmatter name/description 非空、name 与目录名一致、description 含触发条件、行数 <500 警告/<800 fail）
  - [x] SubTask 5.4: `checks/scripts-executable.js`——脚本可执行性校验（.js 执行 node --check、.py 执行 py_compile、检查无非法依赖）
  - [x] SubTask 5.5: `validate-skill.js`——主编排器（4 步管线：结构→SKILL.md→脚本可执行性→汇总结果，输出 JSON 或 pass/fail + 错误清单）

- [x] Task 6: 编写测试
  - [x] SubTask 6.1: `__tests__/helpers.js`——测试工具（创建临时 skill 目录、清理）
  - [x] SubTask 6.2: `__tests__/structure.test.js`——目录结构校验测试（必需文件缺失正反例、plugin.json 字段缺失正反例、非规范目录名 warning）
  - [x] SubTask 6.3: `__tests__/skillmd.test.js`——SKILL.md 内容校验测试（frontmatter 完整正反例、name 不一致 fail、description 无触发条件 fail、行数超限正反例）
  - [x] SubTask 6.4: `__tests__/scripts-executable.test.js`——脚本可执行性测试（语法错误正反例、非法依赖正反例）
  - [x] SubTask 6.5: `__tests__/integration.test.js`——集成测试（完整校验流程：合法 skill 通过、非法 skill 报 fail 并列出错误）

- [x] Task 7: 编写 evals
  - [x] SubTask 7.1: `evals/evals.json`——本 skill 的 evals（2-3 个真实测试用例，如"创建一个 markdown 格式化 skill"、"创建一个 API 文档生成 skill"）

# Task Dependencies

- Task 1 → Task 2（需要目录结构）
- Task 2 → Task 3, Task 4, Task 5（SKILL.md 定义后才能写具体内容）
- Task 3 和 Task 4 可并行
- Task 5 依赖 Task 3（校验工具需要知道 skill-anatomy 和 skillmd-spec 规范）
- Task 5 → Task 6（测试需要校验工具）
- Task 7 依赖 Task 2（evals 需要符合 SKILL.md 定义的流程）
