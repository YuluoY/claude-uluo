# Checklist

## Phase 1: 移除框架特定实现

- [ ] scripts/generate-code.js 已删除
- [ ] scripts/convert-to-react.js 已删除
- [ ] scripts/convert-to-vue.js 已删除
- [ ] scripts/convert-lib/ 目录已删除
- [ ] scripts/__tests__/convert.test.js 已删除
- [ ] scripts/__tests__/generate-code.test.js 已删除
- [ ] scripts/__tests__/e2e.test.js 已修改（移除代码生成场景）
- [ ] 剩余脚本不引用已删除的模块

## Phase 2: 建立转换契约层

- [ ] references/transformation-contract.md 已创建
- [ ] Spec→HTML 契约规则定义（6 条）
- [ ] Spec→代码契约规则定义（4 条，框架无关）
- [ ] HTML→Spec 逆向契约规则定义（3 条）
- [ ] 每条规则标注校验方式和级别
- [ ] references/conversion-checklist.md 已创建
- [ ] 检查清单覆盖所有契约规则
- [ ] check-spec-fidelity.js 移除了 Vue/React 语法解析
- [ ] check-spec-fidelity.js 改为框架无关的语义搜索
- [ ] 语义搜索支持任意框架
- [ ] check-spec-fidelity.js 测试用例已更新

## Phase 3: 建立门禁机制

- [ ] hooks/hooks.json 已创建，注册 PostToolUse 和 Stop hooks
- [ ] hooks/lib.py 已创建，包含共享工具函数
- [ ] .claude-plugin/plugin.json 引用 hooks
- [ ] hooks/post_tool_use.py 已创建
- [ ] .html 文件写入后自动运行 validate-all.js
- [ ] .spec.json 文件写入后自动运行 validate-spec.js
- [ ] .vue/.tsx/.svelte/.ts 文件写入后自动运行 check-spec-fidelity.js（如有 Spec）
- [ ] 校验失败时返回 JSON 警告给 AI
- [ ] hooks/stop.py 已创建
- [ ] Stop hook 检查未通过的校验
- [ ] 有未通过校验时阻断结束

## Phase 4: 协议物化

- [ ] scripts/generate-skeleton.js 已创建
- [ ] 为每个 component 生成空壳文件
- [ ] 空壳文件包含组件名、TODO 注释、Spec 字段引用
- [ ] generate-skeleton.js 测试用例已补充
- [ ] generate-html.js 文件头注释定位为"骨架生成器"
- [ ] generate-html.js CSS 生成简化（类名 + token 引用）
- [ ] generate-html.js 输出提示"视觉细节由 AI 补充"
- [ ] generate-html.js 测试用例已更新
- [ ] 生成的 HTML 骨架通过 validate-all.js

## Phase 5: 更新文档

- [ ] SKILL.md 声明职责边界（只负责协议和校验）
- [ ] SKILL.md 新增门禁机制说明
- [ ] SKILL.md 新增转换契约引用
- [ ] SKILL.md 新增检查清单要求
- [ ] SKILL.md Spec-First 工作流更新（代码生成改为 AI 职责 + 骨架辅助）
- [ ] SKILL.md 移除 generate-code.js 和 convert-to-*.js 的引用
- [ ] constraint-tiers.md 新增转换契约相关 HARD 规则
- [ ] constraint-tiers.md 新增门禁机制执行协议

## Phase 6: 验证

- [ ] `npx vitest run` 全部通过
- [ ] Spec → HTML 骨架 → 校验 全流程通过
- [ ] Spec → 代码骨架 → AI 填充 → 校验 全流程通过
- [ ] hooks 在文件写入后触发校验
- [ ] 端到端流程通过

## 核心机制验证

- [ ] 转换契约：Spec↔HTML↔代码 的映射规则已定义且可校验
- [ ] 门禁机制：hooks 在文件写入后自动运行校验
- [ ] 协议物化：HTML 骨架 + 代码骨架减少 AI 自由发挥空间
- [ ] 框架无关：校验器不依赖任何框架特定语法
- [ ] 检查清单：AI 每次转换后必须填写
- [ ] 职责边界：skill 只负责协议和校验，不负责框架代码生成
