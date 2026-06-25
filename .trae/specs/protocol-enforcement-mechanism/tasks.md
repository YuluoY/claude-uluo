# Tasks

## Phase 1: 移除框架特定实现

- [ ] Task 1: 移除代码生成器和转换器脚本
  - [ ] SubTask 1.1: 删除 scripts/generate-code.js
  - [ ] SubTask 1.2: 删除 scripts/convert-to-react.js
  - [ ] SubTask 1.3: 删除 scripts/convert-to-vue.js
  - [ ] SubTask 1.4: 删除 scripts/convert-lib/ 整个目录
  - 验证: 剩余脚本不引用已删除的模块

- [ ] Task 2: 移除相关测试并修复引用
  - [ ] SubTask 2.1: 删除 scripts/__tests__/convert.test.js
  - [ ] SubTask 2.2: 删除 scripts/__tests__/generate-code.test.js
  - [ ] SubTask 2.3: 修改 scripts/__tests__/e2e.test.js，移除代码生成场景
  - 验证: `npx vitest run` 通过（剩余测试）

## Phase 2: 建立转换契约层

- [ ] Task 3: 编写转换契约文档
  - [ ] SubTask 3.1: 创建 references/transformation-contract.md
  - [ ] SubTask 3.2: 定义 Spec→HTML 契约规则（6 条）
  - [ ] SubTask 3.3: 定义 Spec→代码契约规则（4 条，框架无关语义搜索）
  - [ ] SubTask 3.4: 定义 HTML→Spec 逆向契约规则（3 条）
  - [ ] SubTask 3.5: 每条规则标注校验方式和级别
  - 验证: 契约文档清晰、可执行

- [ ] Task 4: 创建转换检查清单模板
  - [ ] SubTask 4.1: 创建 references/conversion-checklist.md
  - [ ] SubTask 4.2: 编写 Spec→HTML 检查清单
  - [ ] SubTask 4.3: 编写 Spec→代码 检查清单
  - 验证: 清单覆盖所有契约规则

- [ ] Task 5: 修改 check-spec-fidelity.js 为框架无关校验
  - [ ] SubTask 5.1: 移除 specVsCode 中的 Vue/React 语法解析
  - [ ] SubTask 5.2: 改为语义搜索（prop/event 名称在代码文件中的存在性）
  - [ ] SubTask 5.3: 支持任意框架（Vue/React/Angular/Svelte）
  - [ ] SubTask 5.4: 更新测试用例
  - 验证: 框架无关校验正确工作

## Phase 3: 建立门禁机制

- [ ] Task 6: 创建 hooks 基础设施
  - [ ] SubTask 6.1: 创建 hooks/hooks.json，注册 PostToolUse 和 Stop hooks
  - [ ] SubTask 6.2: 创建 hooks/lib.py，共享工具函数（文件类型判断、Spec 查找、校验运行）
  - [ ] SubTask 6.3: 更新 .claude-plugin/plugin.json 引用 hooks
  - 验证: hooks 配置正确，Claude Code 能加载

- [ ] Task 7: 实现 PostToolUse hook
  - [ ] SubTask 7.1: 创建 hooks/post_tool_use.py
  - [ ] SubTask 7.2: .html 文件写入后自动运行 validate-all.js
  - [ ] SubTask 7.3: .spec.json 文件写入后自动运行 validate-spec.js
  - [ ] SubTask 7.4: .vue/.tsx/.svelte/.ts 文件写入后，如果存在 Spec 则运行 check-spec-fidelity.js
  - [ ] SubTask 7.5: 校验失败时返回 JSON 警告给 AI
  - 验证: 写入文件后自动触发校验

- [ ] Task 8: 实现 Stop hook
  - [ ] SubTask 8.1: 创建 hooks/stop.py
  - [ ] SubTask 8.2: 检查当前会话是否有未通过的校验
  - [ ] SubTask 8.3: 有未通过校验时阻断结束，返回提示
  - 验证: 交付前最终校验门禁工作

## Phase 4: 协议物化

- [ ] Task 9: 实现代码骨架生成器
  - [ ] SubTask 9.1: 创建 scripts/generate-skeleton.js
  - [ ] SubTask 9.2: 为每个 component 生成空壳文件（.txt）
  - [ ] SubTask 9.3: 文件包含组件名、TODO 注释、Spec 字段引用
  - [ ] SubTask 9.4: 补充测试用例
  - 验证: 骨架文件包含所有 Spec 字段引用

- [ ] Task 10: 调整 generate-html.js 为骨架生成器
  - [ ] SubTask 10.1: 修改文件头注释，定位为"HTML 骨架生成器"
  - [ ] SubTask 10.2: 简化 CSS 生成（类名 + token 引用，不生成具体视觉值）
  - [ ] SubTask 10.3: 输出提示"视觉细节由 AI 基于 Spec.visual 补充"
  - [ ] SubTask 10.4: 更新测试用例
  - 验证: 生成的 HTML 骨架通过 validate-all.js

## Phase 5: 更新文档

- [ ] Task 11: 更新 SKILL.md
  - [ ] SubTask 11.1: 声明职责边界（只负责协议和校验）
  - [ ] SubTask 11.2: 新增门禁机制说明（hooks 自动校验）
  - [ ] SubTask 11.3: 新增转换契约引用
  - [ ] SubTask 11.4: 新增检查清单要求
  - [ ] SubTask 11.5: 更新 Spec-First 工作流（代码生成改为 AI 职责 + 骨架辅助）
  - [ ] SubTask 11.6: 移除 generate-code.js 和 convert-to-*.js 的引用
  - 验证: SKILL.md 清晰反映新机制

- [ ] Task 12: 更新 constraint-tiers.md
  - [ ] SubTask 12.1: 新增转换契约相关的 HARD 规则
  - [ ] SubTask 12.2: 新增门禁机制相关的执行协议
  - 验证: 约束分级包含转换契约

## Phase 6: 验证

- [ ] Task 13: 运行全部测试
  - [ ] SubTask 13.1: 运行 `npx vitest run`
  - [ ] SubTask 13.2: 确认所有剩余测试通过
  - 验证: 无测试失败

- [ ] Task 14: 端到端验证
  - [ ] SubTask 14.1: Spec → HTML 骨架 → 校验 全流程
  - [ ] SubTask 14.2: Spec → 代码骨架 → AI 填充 → 校验 全流程
  - [ ] SubTask 14.3: 验证 hooks 在文件写入后触发校验
  - 验证: 端到端流程通过

# Task Dependencies

- Task 1, 2 可并行（移除文件）
- Task 3, 4 可并行（编写文档）
- Task 5 依赖 Task 1（移除后修改校验器）
- Task 6 是 Task 7, 8 的前置
- Task 7, 8 可并行
- Task 9, 10 可并行（骨架生成器）
- Task 11, 12 依赖 Task 3-10（全部实现后更新文档）
- Task 13, 14 依赖 Task 11, 12
