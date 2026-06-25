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
  - [ ] SubTask 2.1: 移除 specVsCode 中的 Vue/React 语法解析
  - [ ] SubTask 2.2: 改为语义搜索（prop/event 名称在代码文件中的存在性）
  - [ ] SubTask 2.3: CLI 接口改为 `<spec.json> <html-file> [code-dir]`（code-dir 可选）
  - [ ] SubTask 2.4: 更新测试用例
  - 验证: 框架无关校验正确工作

## Phase 2: 创建需求提取指南

- [ ] Task 3: 创建需求提取指南
  - [ ] SubTask 3.1: 创建 references/requirement-extraction-guide.md
  - [ ] SubTask 3.2: 编写从 uluo-doc-standards spec.md 提取 Design Spec 的对齐规则
    - 功能需求 FR → component
    - 预期行为 → props/events
    - 验收标准 → 验证覆盖度
    - 非功能性需求 → dataSource/states
  - [ ] SubTask 3.3: 编写从自然语言需求提取的模式匹配规则
    - "显示/展示 XX" → props
    - "点击/提交 XX" → events
    - "加载中/错误态" → states
    - "调用 XX 接口" → dataSource
    - "图表/趋势图" → manual + chart
  - [ ] SubTask 3.4: 编写 Design Spec 展示确认流程
  - [ ] SubTask 3.5: 提供两个完整示例（spec.md 提取 + 自然语言提取）
  - 验证: 指南清晰指导 AI 从需求提取 Design Spec

- [ ] Task 4: 创建 AI 代码生成指南
  - [ ] SubTask 4.1: 创建 references/code-generation-guide.md
  - [ ] SubTask 4.2: 编写 Spec 字段到代码概念的映射规则
  - [ ] SubTask 4.3: 提供框架无关的生成原则
  - [ ] SubTask 4.4: 提供各框架映射示例（Vue/React/Angular/Svelte）
  - 验证: 指南清晰指导 AI 生成任意框架代码

## Phase 3: 更新文档

- [ ] Task 5: 更新 SKILL.md
  - [ ] SubTask 5.1: 重新定位为"需求到设计稿转换协议"
  - [ ] SubTask 5.2: 新增两条工作路径说明（协作/独立）
  - [ ] SubTask 5.3: 新增 Design Spec 提取规则引用
  - [ ] SubTask 5.4: 新增门禁步骤为 HARD 约束（validate-spec.js、validate-all.js、check-spec-fidelity.js）
  - [ ] SubTask 5.5: 更新 Spec-First 工作流（AI 提取 Spec → 用户确认 → 生成）
  - [ ] SubTask 5.6: 移除 generate-code.js 和 convert-to-*.js 的引用
  - [ ] SubTask 5.7: 更新模块加载表
  - [ ] SubTask 5.8: 更新一票否决项
  - 验证: SKILL.md 清晰反映新定位

- [ ] Task 6: 更新 design-spec.md
  - [ ] SubTask 6.1: 强调 Design Spec 是 AI 提取的中间契约，非用户手写输入
  - [ ] SubTask 6.2: 新增"从需求提取"的说明章节
  - [ ] SubTask 6.3: 移除框架特定的生成规则说明
  - 验证: 文档反映 Design Spec 的新定位

## Phase 4: 验证

- [ ] Task 7: 运行全部测试
  - [ ] SubTask 7.1: `npx vitest run` 通过
  - 验证: 无测试失败

- [ ] Task 8: 端到端验证
  - [ ] SubTask 8.1: 路径 A — 从 spec.md 提取 Design Spec → 生成 HTML → 校验
  - [ ] SubTask 8.2: 路径 B — 从自然语言需求提取 Design Spec → 生成 HTML → 校验
  - [ ] SubTask 8.3: 门禁校验（validate-spec.js、validate-all.js、check-spec-fidelity.js）全部通过
  - 验证: 两条路径都能走通

# Task Dependencies

- Task 1, 2 可并行
- Task 3, 4 可并行
- Task 5, 6 依赖 Task 3, 4
- Task 7, 8 依赖 Task 5, 6
