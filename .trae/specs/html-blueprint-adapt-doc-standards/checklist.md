# Checklist

## Phase 1: 移除框架特定实现

- [ ] scripts/generate-code.js 已删除
- [ ] scripts/convert-to-react.js 已删除
- [ ] scripts/convert-to-vue.js 已删除
- [ ] scripts/convert-lib/ 目录已删除
- [ ] scripts/__tests__/convert.test.js 已删除
- [ ] scripts/__tests__/generate-code.test.js 已删除
- [ ] scripts/__tests__/e2e.test.js 已修改（移除代码生成场景，保留 HTML 生成和校验）
- [ ] 剩余脚本不引用已删除的模块
- [ ] check-spec-fidelity.js 移除了 Vue/React 语法解析
- [ ] check-spec-fidelity.js 改为框架无关的语义搜索
- [ ] check-spec-fidelity.js CLI 接口改为 `<spec.json> <html-file> [code-dir]`
- [ ] check-spec-fidelity.js 测试用例已更新
- [ ] `npx vitest run` 通过

## Phase 2: 创建适配文档

- [ ] references/code-generation-guide.md 已创建
- [ ] code-generation-guide.md 包含 Spec 字段到代码概念的映射规则
- [ ] code-generation-guide.md 框架无关（适用于 Vue/React/Angular/Svelte）
- [ ] code-generation-guide.md 强调结合项目上下文
- [ ] code-generation-guide.md 提供各框架映射示例
- [ ] references/integration-guide.md 已创建
- [ ] integration-guide.md 说明单向适配原则（不改 uluo-doc-standards）
- [ ] integration-guide.md 列出五层流程注入点
- [ ] integration-guide.md 说明 Design Spec 嵌入 spec.md 的方式
- [ ] integration-guide.md 说明转换门禁嵌入 tasks.md 的方式
- [ ] integration-guide.md 说明验收报告追加协议验收的方式

## Phase 3: 更新 SKILL.md

- [ ] SKILL.md 声明职责边界（只负责协议和校验）
- [ ] SKILL.md 新增"与 uluo-doc-standards 协作"章节
- [ ] SKILL.md Spec-First 工作流更新（代码生成改为 AI 职责）
- [ ] SKILL.md 标注门禁步骤
- [ ] SKILL.md 移除 generate-code.js 和 convert-to-*.js 的引用
- [ ] SKILL.md 模块加载表新增 code-generation-guide.md 和 integration-guide.md
- [ ] SKILL.md 一票否决项更新

## Phase 4: 验证

- [ ] `npx vitest run` 全部通过
- [ ] Design Spec JSON 校验通过
- [ ] HTML 骨架生成通过 validate-all.js
- [ ] check-spec-fidelity.js 校验 Spec↔HTML↔代码通过
- [ ] 端到端流程通过

## 核心机制验证

- [ ] 不改动 uluo-doc-standards 的任何文件
- [ ] html-blueprint 单向适配 uluo-doc-standards（在 SKILL.md 中引用其流程）
- [ ] html-blueprint 只负责协议和校验，不负责框架代码生成
- [ ] check-spec-fidelity.js 框架无关（语义搜索支持任意框架）
- [ ] AI 代码生成指南指导 AI 生成任意框架代码
- [ ] 转换门禁（validate-all.js、check-spec-fidelity.js）作为流程中的强制校验点
