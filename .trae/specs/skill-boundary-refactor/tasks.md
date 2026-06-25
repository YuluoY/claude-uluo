# Tasks

## Phase 1: 移除框架特定实现

- [ ] Task 1: 移除代码生成器和转换器脚本
  - [ ] SubTask 1.1: 删除 scripts/generate-code.js
  - [ ] SubTask 1.2: 删除 scripts/convert-to-react.js
  - [ ] SubTask 1.3: 删除 scripts/convert-to-vue.js
  - [ ] SubTask 1.4: 删除 scripts/convert-lib/ 整个目录（react-generator.js, vue-generator.js, parser.js, code-writer.js, report.js, ir.js）
  - 验证: 剩余脚本不引用已删除的模块

- [ ] Task 2: 移除相关测试
  - [ ] SubTask 2.1: 删除 scripts/__tests__/convert.test.js
  - [ ] SubTask 2.2: 删除 scripts/__tests__/generate-code.test.js
  - [ ] SubTask 2.3: 修改 scripts/__tests__/e2e.test.js，移除代码生成场景，保留 HTML 生成和校验场景
  - 验证: `npx vitest run` 通过（剩余测试）

## Phase 2: 调整边界脚本

- [ ] Task 3: 调整 generate-html.js 为骨架生成器
  - [ ] SubTask 3.1: 修改文件头注释，明确定位为"骨架生成器"
  - [ ] SubTask 3.2: 简化 CSS 生成，只生成类名 + 空规则或 token 引用，不生成具体视觉值
  - [ ] SubTask 3.3: 输出提示"视觉细节由 AI 基于 Spec.visual 补充"
  - [ ] SubTask 3.4: 更新测试用例适配骨架生成器的输出
  - 验证: 生成的 HTML 骨架通过 validate-all.js

- [ ] Task 4: 调整 check-spec-fidelity.js 为 Spec↔HTML 双向校验
  - [ ] SubTask 4.1: 移除 specVsCode 校验（代码文件存在性、props 接口完整性）
  - [ ] SubTask 4.2: 移除 htmlVsCode 校验（代码 CSS 类名比对）
  - [ ] SubTask 4.3: 保留 specVsHtml 校验（组件/props/events/convertMode 一致性）
  - [ ] SubTask 4.4: 更新 CLI 接口为 `node scripts/check-spec-fidelity.js <spec.json> <html-file>`
  - [ ] SubTask 4.5: 更新测试用例适配新的校验范围
  - 验证: Spec↔HTML 一致性校验正确工作

## Phase 3: 更新文档

- [ ] Task 5: 更新 SKILL.md 职责边界
  - [ ] SubTask 5.1: 在简介中明确声明 skill 只负责协议和校验，不负责框架代码生成
  - [ ] SubTask 5.2: 更新 Spec-First 工作流，代码生成改为 AI 职责
  - [ ] SubTask 5.3: 移除 generate-code.js 和 convert-to-*.js 的引用
  - [ ] SubTask 5.4: 更新模块加载表
  - 验证: SKILL.md 清晰反映新的职责边界

- [ ] Task 6: 创建 code-generation-guide.md
  - [ ] SubTask 6.1: 创建 references/code-generation-guide.md
  - [ ] SubTask 6.2: 编写 Spec 字段到代码的映射规则（props→interface, events→emits, states→useState 等）
  - [ ] SubTask 6.3: 提供框架无关的生成指南（适用于 Vue/React/Angular/Svelte）
  - [ ] SubTask 6.4: 强调 AI 应结合项目上下文（组件库、工具函数）
  - 验证: 指南清晰指导 AI 生成任意框架代码

- [ ] Task 7: 更新 conversion-guide.md
  - [ ] SubTask 7.1: 从"脚本转换指南"改为"AI 转换指南"
  - [ ] SubTask 7.2: 移除对 convert-to-*.js 的引用
  - [ ] SubTask 7.3: 指导 AI 如何根据 Spec 生成代码
  - 验证: 指南与新的职责边界一致

- [ ] Task 8: 更新 design-spec.md
  - [ ] SubTask 8.1: 移除框架特定的生成规则说明
  - [ ] SubTask 8.2: 强调 Spec 是框架无关的契约
  - 验证: 文档不包含框架特定内容

## Phase 4: 验证

- [ ] Task 9: 运行全部测试
  - [ ] SubTask 9.1: 运行 `npx vitest run`
  - [ ] SubTask 9.2: 确认所有剩余测试通过
  - 验证: 无测试失败

- [ ] Task 10: 端到端验证
  - [ ] SubTask 10.1: 编写 Spec → 生成 HTML 骨架 → 校验 全流程
  - [ ] SubTask 10.2: 验证 HTML 骨架通过 validate-all.js
  - [ ] SubTask 10.3: 验证 check-spec-fidelity.js 的 Spec↔HTML 校验工作
  - 验证: 端到端流程通过

# Task Dependencies

- Task 1, 2 可并行（移除文件）
- Task 3, 4 依赖 Task 1, 2（移除完成后调整剩余脚本）
- Task 5, 6, 7, 8 依赖 Task 1-4（脚本调整完成后更新文档）
- Task 5, 6, 7, 8 可并行
- Task 9, 10 依赖 Task 5-8（全部修改完成后验证）
