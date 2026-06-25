# Checklist

## Phase 1: 移除框架特定实现

- [ ] scripts/generate-code.js 已删除
- [ ] scripts/convert-to-react.js 已删除
- [ ] scripts/convert-to-vue.js 已删除
- [ ] scripts/convert-lib/ 目录已删除（含所有 .js 文件）
- [ ] scripts/__tests__/convert.test.js 已删除
- [ ] scripts/__tests__/generate-code.test.js 已删除
- [ ] scripts/__tests__/e2e.test.js 已修改（移除代码生成场景）
- [ ] 剩余脚本不引用已删除的模块

## Phase 2: 调整边界脚本

- [ ] generate-html.js 文件头注释明确定位为"骨架生成器"
- [ ] generate-html.js 的 CSS 生成简化为类名 + 空规则或 token 引用
- [ ] generate-html.js 输出提示"视觉细节由 AI 补充"
- [ ] generate-html.js 的测试用例已适配
- [ ] 生成的 HTML 骨架通过 validate-all.js
- [ ] check-spec-fidelity.js 移除了 specVsCode 校验
- [ ] check-spec-fidelity.js 移除了 htmlVsCode 校验
- [ ] check-spec-fidelity.js 保留 specVsHtml 校验
- [ ] check-spec-fidelity.js CLI 接口改为 `<spec.json> <html-file>`
- [ ] check-spec-fidelity.js 的测试用例已适配

## Phase 3: 更新文档

- [ ] SKILL.md 简介明确声明职责边界（只负责协议和校验）
- [ ] SKILL.md Spec-First 工作流中代码生成改为 AI 职责
- [ ] SKILL.md 移除 generate-code.js 和 convert-to-*.js 的引用
- [ ] SKILL.md 模块加载表已更新
- [ ] references/code-generation-guide.md 已创建
- [ ] code-generation-guide.md 包含 Spec 字段到代码的映射规则
- [ ] code-generation-guide.md 框架无关（适用于 Vue/React/Angular/Svelte）
- [ ] code-generation-guide.md 强调结合项目上下文
- [ ] references/conversion-guide.md 改为 AI 转换指南
- [ ] conversion-guide.md 移除对 convert-to-*.js 的引用
- [ ] references/design-spec.md 移除框架特定内容
- [ ] design-spec.md 强调 Spec 是框架无关契约

## Phase 4: 验证

- [ ] `npx vitest run` 全部通过
- [ ] Spec → HTML 骨架 → 校验 全流程通过
- [ ] HTML 骨架通过 validate-all.js
- [ ] check-spec-fidelity.js 的 Spec↔HTML 校验工作正常

## 职责边界验证

- [ ] skill 不包含任何框架特定代码生成器（无 Vue/React 生成逻辑）
- [ ] skill 不包含任何框架语法细节（无 defineEmits、useCallback 等）
- [ ] skill 只提供协议定义、校验器、骨架生成器、逆向工具
- [ ] 代码生成是 AI 职责，AI 参考 code-generation-guide.md 生成
- [ ] skill 支持任意框架（Vue/React/Angular/Svelte/Solid/Web Components）
