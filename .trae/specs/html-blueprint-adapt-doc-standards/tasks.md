# Tasks

## Phase 1: 移除框架特定实现

- [ ] Task 1: 移除代码生成器和转换器
  - [ ] SubTask 1.1: 删除 scripts/generate-code.js
  - [ ] SubTask 1.2: 删除 scripts/convert-to-react.js
  - [ ] SubTask 1.3: 删除 scripts/convert-to-vue.js
  - [ ] SubTask 1.4: 删除 scripts/convert-lib/ 整个目录
  - [ ] SubTask 1.5: 删除 scripts/__tests__/convert.test.js
  - [ ] SubTask 1.6: 删除 scripts/__tests__/generate-code.test.js
  - [ ] SubTask 1.7: 修改 scripts/__tests__/e2e.test.js，移除代码生成场景，保留 HTML 生成和校验场景
  - 验证: `npx vitest run` 通过（剩余测试）

- [ ] Task 2: 修改 check-spec-fidelity.js 为框架无关校验
  - [ ] SubTask 2.1: 移除 specVsCode 中的 Vue/React 语法解析（interface Props、defineEmits 正则）
  - [ ] SubTask 2.2: 改为语义搜索——在代码文件中搜索 prop/event 名称的存在性（camelCase 精确匹配）
  - [ ] SubTask 2.3: CLI 接口改为 `<spec.json> <html-file> [code-dir]`（code-dir 可选，不传时跳过代码校验）
  - [ ] SubTask 2.4: 更新测试用例，验证支持 Vue/React/Angular/Svelte 代码
  - 验证: 框架无关校验正确工作

## Phase 2: 创建适配文档

- [ ] Task 3: 创建 AI 代码生成指南
  - [ ] SubTask 3.1: 创建 references/code-generation-guide.md
  - [ ] SubTask 3.2: 编写 Spec 字段到代码概念的映射规则（props→props定义, events→event handlers, states→状态管理, dataSource→API调用）
  - [ ] SubTask 3.3: 提供框架无关的生成原则（适用于 Vue/React/Angular/Svelte）
  - [ ] SubTask 3.4: 强调 AI 应结合项目上下文（已有组件库、工具函数、代码风格）
  - [ ] SubTask 3.5: 提供各框架的映射示例（Vue defineProps、React interface、Angular @Input、Svelte export let）
  - 验证: 指南清晰指导 AI 生成任意框架代码

- [ ] Task 4: 创建与 uluo-doc-standards 协作指南
  - [ ] SubTask 4.1: 创建 references/integration-guide.md
  - [ ] SubTask 4.2: 说明 html-blueprint 单向适配 uluo-doc-standards 的原则（不改对方文件）
  - [ ] SubTask 4.3: 列出 uluo-doc-standards 五层流程中的注入点
  - [ ] SubTask 4.4: 说明 Design Spec 嵌入 spec.md 的方式（design-spec 代码块）
  - [ ] SubTask 4.5: 说明转换门禁嵌入 tasks.md 的方式（★ 标记）
  - [ ] SubTask 4.6: 说明验收报告追加协议验收内容的方式
  - 验证: 指南清晰描述单向适配方式

## Phase 3: 更新 SKILL.md

- [ ] Task 5: 更新 SKILL.md
  - [ ] SubTask 5.1: 声明职责边界（只负责协议和校验，不负责框架代码生成）
  - [ ] SubTask 5.2: 新增"与 uluo-doc-standards 协作"章节（引用 integration-guide.md）
  - [ ] SubTask 5.3: 更新 Spec-First 工作流（代码生成改为 AI 职责，引用 code-generation-guide.md）
  - [ ] SubTask 5.4: 标注门禁步骤（validate-all.js、check-spec-fidelity.js）
  - [ ] SubTask 5.5: 移除 generate-code.js 和 convert-to-*.js 的引用
  - [ ] SubTask 5.6: 更新模块加载表（新增 code-generation-guide.md、integration-guide.md）
  - [ ] SubTask 5.7: 更新一票否决项（移除框架生成器相关，新增协议合规相关）
  - 验证: SKILL.md 清晰反映新定位和协作关系

## Phase 4: 验证

- [ ] Task 6: 运行全部测试
  - [ ] SubTask 6.1: `npx vitest run` 通过
  - [ ] SubTask 6.2: 确认无测试失败
  - 验证: 所有剩余测试通过

- [ ] Task 7: 端到端验证
  - [ ] SubTask 7.1: 编写 Design Spec JSON
  - [ ] SubTask 7.2: 运行 validate-spec.js 校验通过
  - [ ] SubTask 7.3: 运行 generate-html.js 生成 HTML 骨架
  - [ ] SubTask 7.4: 运行 validate-all.js 校验 HTML 通过
  - [ ] SubTask 7.5: 模拟 AI 生成代码（手写一个简单的 Vue 组件）
  - [ ] SubTask 7.6: 运行 check-spec-fidelity.js 校验 Spec↔HTML↔代码通过
  - 验证: 端到端流程通过

# Task Dependencies

- Task 1, 2 可并行（移除 + 修改校验器）
- Task 3, 4 可并行（创建文档）
- Task 5 依赖 Task 1-4
- Task 6, 7 依赖 Task 5
