# Checklist

## Phase 1: 修复当前架构 P0 Bug

- [x] html-parser.js 的 innerHTML 字段存储真正的 inner content，而非 outerHTML
- [x] cloneHTML 函数不再产生双重嵌套
- [x] getInnerHTML 导出函数返回正确的内部 HTML
- [x] react-generator.js 的 useCallback 依赖数组包含正确的 handler 引用
- [x] vue-generator.js 的 defineEmits 类型语法合法
- [x] package.json 存在且声明了 type: module、prettier（可选）、vitest（dev）
- [x] `npx vitest run` 全部通过（134 测试）
- [x] 生成的 React 代码无 react-hooks/exhaustive-deps 警告
- [x] 生成的 Vue SFC 通过 vue-tsc 类型检查

## Phase 2: 引入 Design Spec 层

- [x] references/design-spec.md 存在且定义了完整的 Spec 结构
- [x] Spec 包含组件、props、events、states、dataSource、visual 字段定义
- [x] 提供 3 个完整示例（统计卡片、表单、图表）
- [x] scripts/validate-spec.js 存在且能校验 Spec 格式合法性
- [x] scripts/generate-html.js 能从 Spec 生成可独立渲染的 HTML
- [x] 生成的 HTML 通过 validate-all.js 所有校验
- [x] scripts/generate-code.js 能从 Spec 生成 Vue/React 代码
- [x] 生成的代码包含 props 接口、events 定义、状态管理、API 骨架
- [x] 生成的代码通过 TypeScript 类型检查
- [x] scripts/check-spec-fidelity.js 能执行三角校验（Spec ↔ HTML ↔ 代码）
- [x] 三角校验能检测出三者任一的不一致
- [x] scripts/html-to-spec.js 能从现有 HTML 逆向生成 Spec
- [x] 逆向生成的 Spec 标记了缺失字段为 TODO
- [x] SKILL.md 更新了 Spec-First 工作流说明
- [x] SKILL.md 保留了 HTML-First 作为快速预览模式

## Phase 3: 替换转换器核心（AST 化）

- [x] lib/html-parser.js 修复边界情况（自闭合标签、属性值 > 字符、HTML 实体、注释处理）
- [x] 所有 check-*.js 脚本测试通过
- [x] convert-lib/parser.js 测试通过
- [x] convert-to-react.js 标记为 @deprecated，指向 generate-code.js
- [x] convert-to-vue.js 标记为 @deprecated，指向 generate-code.js
- [x] 3 层嵌套组件正确解析，无双重嵌套
- [x] 自闭合标签与 data-prop 组合正确处理
- [x] check-convert-fidelity.js 用精确正则比对替代子串匹配
- [x] CSS 选择器比对用边界字符正则（替代 postcss AST，无外部依赖）
- [x] class 保留率校验用引号边界正则
- [x] 子串匹配的假阳性用例现在正确报告失败
- [x] 新增 CSS 属性值校验（关键属性值比对）

## Phase 4: 工程化补全

- [x] schemas/design-spec.schema.json 存在且可被编辑器识别
- [x] VSCode 打开 Spec 文件有自动补全（.vscode/settings.json 配置）
- [x] scripts/__tests__/e2e.test.js 包含 4 个端到端测试场景
- [x] Spec → HTML → 代码 → 校验全流程测试通过
- [x] Spec 变更 → 同步更新 → 校验通过 测试通过
- [x] HTML → Spec 逆向 → 补充 → 生成 → 校验通过 测试通过
- [x] iteration-2 创建 3 个 eval 定义（Spec-First dashboard/form + migration）
- [x] benchmark.md 对比 iteration-1 vs iteration-2
- [x] 测试覆盖 134 个，全部通过

## 核心问题修复验证

- [x] C-1: cloneHTML 双重嵌套已修复
- [x] C-2: innerHTML 语义已修正
- [x] C-3: useCallback 依赖数组已修正
- [x] C-4: defineEmits 类型语法已修正
- [x] C-5: benchmark 已更新，iteration-2 eval 定义已创建
- [x] M-1: package.json 已添加
- [x] M-2: CSS 提取在 Spec-First 工作流中不再依赖 split('}')（从 Spec 直接生成）
- [x] M-3: 保真度校验不再用子串匹配（改为精确正则）
- [x] M-4: 主题校验在 generate-html.js 中直接从 Spec.theme 引用
- [x] M-5: SHOULD 级别违规在 validate-spec.js 中不影响 exit code
- [x] M-6: GENERIC_NAMES 检查在 Spec-First 工作流中由 validate-spec.js 的 PascalCase 正则替代
- [x] M-7: Spec-First 工作流中 check-spec-fidelity.js 是必执行步骤（SKILL.md 第 18 条）
