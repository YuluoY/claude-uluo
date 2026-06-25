# Checklist

## Phase 1: html-blueprint 职责瘦身

- [ ] scripts/generate-code.js 已删除
- [ ] scripts/convert-to-react.js 已删除
- [ ] scripts/convert-to-vue.js 已删除
- [ ] scripts/convert-lib/ 目录已删除
- [ ] scripts/__tests__/convert.test.js 已删除
- [ ] scripts/__tests__/generate-code.test.js 已删除
- [ ] scripts/__tests__/e2e.test.js 已修改（移除代码生成场景）
- [ ] check-spec-fidelity.js 移除了 Vue/React 语法解析
- [ ] check-spec-fidelity.js 改为框架无关的语义搜索
- [ ] check-spec-fidelity.js CLI 接口改为 `<spec.json> <html-file> [code-dir]`
- [ ] check-spec-fidelity.js 测试用例已更新
- [ ] html-blueprint 的 `npx vitest run` 通过

## Phase 2: 创建结合文档

- [ ] references/code-generation-guide.md 已创建
- [ ] code-generation-guide.md 包含 Spec 字段到代码概念的映射规则
- [ ] code-generation-guide.md 框架无关
- [ ] code-generation-guide.md 强调结合项目上下文
- [ ] references/integration-guide.md 已创建
- [ ] integration-guide.md 说明与 uluo-doc-standards 的协作关系
- [ ] integration-guide.md 标注五层流程中的注入点
- [ ] integration-guide.md 说明 Design Spec 嵌入 spec.md 的方式

## Phase 3: uluo-doc-standards 扩展

- [ ] validate-docs.js 能检测 spec.md 中的 `design-spec` 代码块
- [ ] validate-docs.js 能提取 JSON 内容
- [ ] validate-docs.js 能调用 validate-spec.js 校验
- [ ] 校验失败时在报告中标注
- [ ] validate-docs.js 的测试用例已补充
- [ ] agents/reviewer.md 增加了 html-blueprint 协议合规审查清单
- [ ] reviewer.md 增加了 validate-all.js 和 check-spec-fidelity.js 的检查要求
- [ ] examples/verification-report-template.md 增加了"协议验收"章节
- [ ] 验收报告模板包含对照 Design Spec 验收的表格
- [ ] uluo-doc-standards 的 `npx vitest run` 通过

## Phase 4: 更新 SKILL.md

- [ ] SKILL.md 声明职责边界（只负责协议和校验）
- [ ] SKILL.md 声明与 uluo-doc-standards 的协作关系
- [ ] SKILL.md Spec-First 工作流更新（代码生成改为 AI 职责）
- [ ] SKILL.md 标注 uluo-doc-standards 的 Phase 注入点
- [ ] SKILL.md 移除 generate-code.js 和 convert-to-*.js 的引用
- [ ] SKILL.md 新增 code-generation-guide.md 和 integration-guide.md 引用

## Phase 5: 验证

- [ ] html-blueprint 的 `npx vitest run` 通过
- [ ] uluo-doc-standards 的 `npx vitest run` 通过
- [ ] 编写包含 Design Spec 的 spec.md 能被 validate-docs.js 校验
- [ ] validate-docs.js 自动校验 Design Spec 通过
- [ ] 生成 HTML 骨架 → validate-all.js 通过
- [ ] AI 生成代码 → check-spec-fidelity.js 通过
- [ ] 端到端流程通过

## 核心机制验证

- [ ] 双重保障：uluo-doc-standards 保证流程不可跳过 + html-blueprint 保证产物必须合规
- [ ] Design Spec 嵌入：spec.md 中的 `design-spec` 代码块能被自动校验
- [ ] 转换门禁：tasks.md 中标注的门禁步骤有校验器守卫
- [ ] 框架无关：check-spec-fidelity.js 用语义搜索支持任意框架
- [ ] reviewer 扩展：对抗性审查包含协议合规性
- [ ] 验收对照：验收报告对照 Design Spec 逐条验证
- [ ] 职责边界：html-blueprint 只负责协议和校验，代码生成是 AI 职责
