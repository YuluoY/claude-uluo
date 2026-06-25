# Checklist

## skill 重命名

- [x] `skills/component-creator/` 已重命名为 `skills/ui-component-creator/`
- [x] SKILL.md frontmatter name 为 `ui-component-creator`
- [x] SKILL.md description 明确包含「UI 组件库」限定词，覆盖原子层+业务层
- [x] .claude-plugin/plugin.json name 和 description 已更新
- [x] marketplace.json 条目已更新（name + source + description）
- [x] CLAUDE.md 已注册表已更新

## 触发条件

- [x] description 包含应触发场景（UI 组件、组件库、Button/Input/Modal、业务组件组合）
- [x] description 明确排除非 UI 场景（工具函数、页面组件、业务模块）

## component-layering.md 层次设计

- [x] 文件已创建于 `references/component-layering.md`
- [x] 定义两层模型（原子层/业务层）和职责边界
- [x] 定义各层设计差异
- [x] 定义层次组合关系（业务层通过原子层公开 API 组合）
- [x] 提供各层组件示例
- [x] 定义层次判定流程

## style-architecture.md 三层样式架构

- [x] 文件已创建于 `references/style-architecture.md`
- [x] 定义三层模型（结构层/语义层/风格层）和各层职责
- [x] 定义语义 token 命名规范
- [x] 定义风格切换机制（CSS 变量覆盖 / theme provider / data-theme）
- [x] 提供 Vue/React/WC 三层分离代码示例
- [x] 定义「结构层 vs 语义层」判定规则
- [x] 定义业务层样式继承规则

## style-presets/ 风格预设

- [x] `references/style-presets/apple.md` 已创建（含 token 值 + CSS 变量块 + 暗色模式）
- [x] `references/style-presets/vercel.md` 已创建
- [x] `references/style-presets/github.md` 已创建
- [x] `references/style-presets/material.md` 已创建
- [x] 每个预设包含完整 token 定义（颜色/间距/字号/圆角/阴影/动效）

## SKILL.md 修改

- [x] Phase 1 新增「组件层次定位」决策点
- [x] Phase 3 新增「3.4 样式架构决策」步骤
- [x] Phase 4 主题检查扩展为「样式分离验证」
- [x] 文件索引表新增 component-layering.md 条目
- [x] 文件索引表新增 style-architecture.md 条目
- [x] 文件索引表新增 style-presets/ 条目

## state-quality.md 修改

- [x] 主题检查项从「用 token」扩展为「三层分离 + 风格切换测试」

## checklist-bans.md 修改

- [x] 主题维度新增 5 项样式分离检查项（含业务层继承检查）
- [x] 禁止事项新增第 14 条「禁止硬编码风格层值」（附 ❌/✅ 反例）
- [x] Phase 映射表新增样式分离检查项

## 框架 reference 修改

- [x] vue.md 样式示例改为三层分离架构
- [x] react.md 样式示例改为三层分离架构
- [x] web-component.md 样式示例改为三层分离架构

## examples 模板修改

- [x] README.template.md 元信息表新增「组件层次」字段
- [x] README.template.md 元信息表新增「风格兼容性」字段
- [x] component-spec.md 新增「组件层次定位」节
- [x] component-spec.md 新增「样式架构」节

## validate_output.py 修改

- [x] 新增 README 组件层次字段检查
- [x] 新增 README 风格兼容性字段检查
- [x] 新增禁令 14 检查（README 中无硬编码颜色值）
- [x] 新增 component-spec 样式架构节检查
- [x] 脚本仍可独立运行（纯标准库）
- [x] 合法组件仍通过，违规组件检出

## evals.json 更新

- [x] 用例 prompt 中加入层次定位和风格切换要求
- [x] 新增业务层组件创建用例
- [x] 新增风格切换验证用例

## 引用完整性

- [x] 所有内部链接路径正确（重命名后无断链）
- [x] validate_output.py 可正常运行
- [x] 未破坏现有文件结构
