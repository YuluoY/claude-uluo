# Tasks

## Phase 1: html-blueprint 职责瘦身

- [ ] Task 1: 移除框架特定代码生成器
  - [ ] SubTask 1.1: 删除 scripts/generate-code.js
  - [ ] SubTask 1.2: 删除 scripts/convert-to-react.js
  - [ ] SubTask 1.3: 删除 scripts/convert-to-vue.js
  - [ ] SubTask 1.4: 删除 scripts/convert-lib/ 整个目录
  - [ ] SubTask 1.5: 删除 scripts/__tests__/convert.test.js
  - [ ] SubTask 1.6: 删除 scripts/__tests__/generate-code.test.js
  - [ ] SubTask 1.7: 修改 scripts/__tests__/e2e.test.js，移除代码生成场景
  - 验证: `npx vitest run` 通过（剩余测试）

- [ ] Task 2: 修改 check-spec-fidelity.js 为框架无关校验
  - [ ] SubTask 2.1: 移除 specVsCode 中的 Vue/React 语法解析
  - [ ] SubTask 2.2: 改为语义搜索（prop/event 名称在代码文件中的存在性）
  - [ ] SubTask 2.3: CLI 接口改为 `<spec.json> <html-file> [code-dir]`（code-dir 可选）
  - [ ] SubTask 2.4: 更新测试用例
  - 验证: 框架无关校验正确工作

## Phase 2: 创建结合文档

- [ ] Task 3: 创建 AI 代码生成指南
  - [ ] SubTask 3.1: 创建 references/code-generation-guide.md
  - [ ] SubTask 3.2: 编写 Spec 字段到代码概念的映射规则（props→props定义, events→event handlers, states→状态管理）
  - [ ] SubTask 3.3: 提供框架无关的生成原则
  - [ ] SubTask 3.4: 强调 AI 应结合项目上下文（组件库、工具函数）
  - 验证: 指南清晰指导 AI 生成任意框架代码

- [ ] Task 4: 创建协作指南
  - [ ] SubTask 4.1: 创建 references/integration-guide.md
  - [ ] SubTask 4.2: 说明 html-blueprint 与 uluo-doc-standards 的协作关系
  - [ ] SubTask 4.3: 标注五层流程中的注入点
  - [ ] SubTask 4.4: 说明 Design Spec 嵌入 spec.md 的方式
  - 验证: 指南清晰描述两个 skill 的结合方式

## Phase 3: uluo-doc-standards 扩展

- [ ] Task 5: 修改 validate-docs.js 支持 Design Spec 校验
  - [ ] SubTask 5.1: 检测 spec.md 中的 `design-spec` 代码块
  - [ ] SubTask 5.2: 提取 JSON 内容
  - [ ] SubTask 5.3: 调用 html-blueprint 的 validate-spec.js 校验
  - [ ] SubTask 5.4: 校验失败时在报告中标注
  - [ ] SubTask 5.5: 补充测试用例
  - 验证: spec.md 中的 Design Spec 能被自动校验

- [ ] Task 6: 扩展 reviewer 子代理
  - [ ] SubTask 6.1: 修改 agents/reviewer.md
  - [ ] SubTask 6.2: 增加 html-blueprint 协议合规审查清单
  - [ ] SubTask 6.3: 增加 validate-all.js 和 check-spec-fidelity.js 的检查要求
  - 验证: reviewer 能审查协议合规性

- [ ] Task 7: 扩展验收报告模板
  - [ ] SubTask 7.1: 修改 examples/verification-report-template.md
  - [ ] SubTask 7.2: 增加"协议验收"章节
  - [ ] SubTask 7.3: 提供对照 Design Spec 验收的表格模板
  - 验证: 验收报告包含协议验收部分

## Phase 4: 更新 SKILL.md

- [ ] Task 8: 更新 html-blueprint 的 SKILL.md
  - [ ] SubTask 8.1: 声明职责边界（只负责协议和校验）
  - [ ] SubTask 8.2: 声明与 uluo-doc-standards 的协作关系
  - [ ] SubTask 8.3: 更新 Spec-First 工作流（代码生成改为 AI 职责）
  - [ ] SubTask 8.4: 标注 uluo-doc-standards 的 Phase 注入点
  - [ ] SubTask 8.5: 移除 generate-code.js 和 convert-to-*.js 的引用
  - [ ] SubTask 8.6: 新增 code-generation-guide.md 和 integration-guide.md 引用
  - 验证: SKILL.md 清晰反映新定位和协作关系

## Phase 5: 验证

- [ ] Task 9: 运行全部测试
  - [ ] SubTask 9.1: html-blueprint 的 `npx vitest run` 通过
  - [ ] SubTask 9.2: uluo-doc-standards 的 `npx vitest run` 通过
  - 验证: 无测试失败

- [ ] Task 10: 端到端验证
  - [ ] SubTask 10.1: 编写包含 Design Spec 的 spec.md
  - [ ] SubTask 10.2: validate-docs.js 自动校验 Design Spec
  - [ ] SubTask 10.3: 生成 HTML 骨架 → validate-all.js 通过
  - [ ] SubTask 10.4: AI 生成代码 → check-spec-fidelity.js 通过
  - 验证: 端到端流程通过

# Task Dependencies

- Task 1, 2 可并行（html-blueprint 瘦身）
- Task 3, 4 可并行（创建文档）
- Task 5, 6, 7 可并行（uluo-doc-standards 扩展）
- Task 8 依赖 Task 1-4
- Task 9, 10 依赖 Task 5-8
