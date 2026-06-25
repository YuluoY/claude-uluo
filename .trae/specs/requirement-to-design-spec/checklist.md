# Checklist

## Phase 1: 移除框架特定实现

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
- [ ] `npx vitest run` 通过

## Phase 2: 创建需求提取指南

- [ ] references/requirement-extraction-guide.md 已创建
- [ ] 包含从 uluo-doc-standards spec.md 提取的对齐规则
- [ ] 包含从自然语言需求提取的模式匹配规则
- [ ] 包含 Design Spec 展示确认流程
- [ ] 提供两个完整示例（spec.md 提取 + 自然语言提取）
- [ ] references/code-generation-guide.md 已创建
- [ ] 包含 Spec 字段到代码概念的映射规则
- [ ] 框架无关
- [ ] 提供各框架映射示例

## Phase 3: 更新文档

- [ ] SKILL.md 重新定位为"需求到设计稿转换协议"
- [ ] SKILL.md 新增两条工作路径说明（协作/独立）
- [ ] SKILL.md 新增 Design Spec 提取规则引用
- [ ] SKILL.md 新增门禁步骤为 HARD 约束
- [ ] SKILL.md Spec-First 工作流更新（AI 提取 → 用户确认 → 生成）
- [ ] SKILL.md 移除 generate-code.js 和 convert-to-*.js 的引用
- [ ] SKILL.md 模块加载表已更新
- [ ] SKILL.md 一票否决项已更新
- [ ] design-spec.md 强调 Design Spec 是 AI 提取的中间契约
- [ ] design-spec.md 新增"从需求提取"说明
- [ ] design-spec.md 移除框架特定内容

## Phase 4: 验证

- [ ] `npx vitest run` 全部通过
- [ ] 路径 A（从 spec.md 提取）端到端通过
- [ ] 路径 B（从自然语言提取）端到端通过
- [ ] 门禁校验全部通过

## 核心机制验证

- [ ] Design Spec 是 AI 提取的中间契约，非用户手写输入
- [ ] 两条工作路径（协作/独立）下游流程一致
- [ ] 与 uluo-doc-standards 对齐口径（spec.md 的 FR → component，验收标准 → props/events）
- [ ] html-blueprint 能独立工作（不依赖 uluo-doc-standards）
- [ ] 不改动 uluo-doc-standards 的任何文件
- [ ] 门禁步骤为 HARD 约束（validate-spec.js、validate-all.js、check-spec-fidelity.js）
- [ ] html-blueprint 只负责协议和校验，不负责框架代码生成
- [ ] check-spec-fidelity.js 框架无关
