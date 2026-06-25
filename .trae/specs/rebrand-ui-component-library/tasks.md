# Tasks

- [x] Task 1: 重命名 skill 目录和更新所有引用
  - [x] SubTask 1.1: `skills/component-creator/` → `skills/ui-component-creator/`
  - [x] SubTask 1.2: 更新 SKILL.md frontmatter（name + description，限定 UI 组件库，覆盖原子层+业务层）
  - [x] SubTask 1.3: 更新 .claude-plugin/plugin.json（name + description + keywords）
  - [x] SubTask 1.4: 更新 marketplace.json（name + source + description）
  - [x] SubTask 1.5: 更新 CLAUDE.md 已注册表

- [x] Task 2: 创建 references/component-layering.md——组件库层次设计指南
  - [x] SubTask 2.1: 定义两层模型（原子层/业务层）和职责边界
  - [x] SubTask 2.2: 定义各层设计差异（原子层：通用性/样式分离/a11y；业务层：组合/业务语义/领域抽象）
  - [x] SubTask 2.3: 定义层次组合关系（业务层通过原子层公开 API 组合，不访问内部）
  - [x] SubTask 2.4: 提供各层组件示例（原子层：Button/Input/Modal；业务层：UserSelect/OrderTable）
  - [x] SubTask 2.5: 定义层次判定流程（如何确定新组件属于哪层）

- [x] Task 3: 创建 references/style-architecture.md——三层样式架构指南
  - [x] SubTask 3.1: 定义三层模型（结构层/语义层/风格层）和各层职责
  - [x] SubTask 3.2: 定义语义 token 命名规范（--color-primary / --spacing-md / --radius-button 等）
  - [x] SubTask 3.3: 定义风格切换机制（CSS 变量覆盖 / theme provider / data-theme 属性）
  - [x] SubTask 3.4: 提供三层分离的代码示例（Vue/React/WC 各一个）
  - [x] SubTask 3.5: 定义「结构层 vs 语义层」判定规则
  - [x] SubTask 3.6: 定义业务层样式继承规则

- [x] Task 4: 创建 references/style-presets/ 目录和 4 个风格预设
  - [x] SubTask 4.1: apple.md——Apple HIG 风格（token 值 + CSS 变量块 + 暗色模式）
  - [x] SubTask 4.2: vercel.md——Vercel 风格（token 值 + CSS 变量块 + 暗色模式）
  - [x] SubTask 4.3: github.md——GitHub 风格（token 值 + CSS 变量块 + 暗色模式）
  - [x] SubTask 4.4: material.md——Material Design 风格（token 值 + CSS 变量块 + 暗色模式）

- [x] Task 5: 修改 SKILL.md
  - [x] SubTask 5.1: Phase 1 新增「组件层次定位」决策点
  - [x] SubTask 5.2: Phase 3 新增「3.4 样式架构决策」步骤
  - [x] SubTask 5.3: Phase 4 主题检查扩展为「样式分离验证」
  - [x] SubTask 5.4: 文件索引表新增 component-layering.md、style-architecture.md、style-presets/ 条目

- [x] Task 6: 修改 references/state-quality.md——主题检查扩展为样式分离验证
  - [x] SubTask 6.1: 主题检查项从「用 token」扩展为「三层分离 + 风格切换测试」

- [x] Task 7: 修改 references/checklist-bans.md
  - [x] SubTask 7.1: 主题维度新增 5 项样式分离检查项（含业务层继承检查）
  - [x] SubTask 7.2: 禁止事项新增第 14 条「禁止硬编码风格层值」（附 ❌/✅ 反例）
  - [x] SubTask 7.3: Phase 映射表新增样式分离检查项

- [x] Task 8: 修改三个框架 reference 的样式示例
  - [x] SubTask 8.1: vue.md 样式示例改为三层分离架构
  - [x] SubTask 8.2: react.md 样式示例改为三层分离架构
  - [x] SubTask 8.3: web-component.md 样式示例改为三层分离架构

- [x] Task 9: 修改 examples 模板
  - [x] SubTask 9.1: README.template.md 元信息表新增「组件层次」和「风格兼容性」字段
  - [x] SubTask 9.2: component-spec.md 新增「组件层次定位」和「样式架构」节

- [x] Task 10: 修改 scripts/validate_output.py
  - [x] SubTask 10.1: 新增 README 组件层次字段检查
  - [x] SubTask 10.2: 新增 README 风格兼容性字段检查
  - [x] SubTask 10.3: 新增禁令 14 检查（README 中无硬编码颜色值 #XXXXXX）
  - [x] SubTask 10.4: 新增 component-spec 样式架构节检查（如存在）
  - [x] SubTask 10.5: 重新运行脚本验证（合法组件仍通过，违规组件检出）

- [x] Task 11: 更新 evals/evals.json
  - [x] SubTask 11.1: 用例 prompt 中加入层次定位和风格切换要求
  - [x] SubTask 11.2: 新增 1 个用例：业务层组件创建（组合原子组件 + 业务语义）
  - [x] SubTask 11.3: 新增 1 个用例：验证风格切换零代码改动

# Task Dependencies

- Task 2-4 可与 Task 1 并行（新文件不依赖目录名）
- Task 5-9 依赖 Task 1（需要新目录路径）和 Task 2-4（需要新 reference 存在）
- Task 10 依赖 Task 9
- Task 11 依赖 Task 10
