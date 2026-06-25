# Tasks

## Phase 1: 修复当前架构 P0 Bug（阻断级）✅ 已完成

- [x] Task 1: 修复 html-parser.js 的 innerHTML 语义错误
  - [x] SubTask 1.1: 修正 buildTree 中 innerHTML 字段存储 outerHTML 的问题，改为存储真正的 inner content
  - [x] SubTask 1.2: 修正 cloneHTML 函数，避免重复包裹外层标签
  - [x] SubTask 1.3: 修正 getInnerHTML 导出函数，返回正确的内部 HTML
  - [x] SubTask 1.4: 补充测试用例覆盖嵌套同标签场景
  - 验证: 运行 `npx vitest run` 全部通过，且生成的代码无双重嵌套

- [x] Task 2: 修复 react-generator.js 的 useCallback 依赖数组
  - [x] SubTask 2.1: 修正 `}, [${ev.payload ? '' : ''}])` 为包含正确依赖项的数组
  - [x] SubTask 2.2: 补充测试用例验证依赖数组包含 handler 引用
  - 验证: 生成的 React 代码无 react-hooks/exhaustive-deps 警告

- [x] Task 3: 修复 vue-generator.js 的 defineEmits 类型语法
  - [x] SubTask 3.1: 修正 emits 类型生成，使用合法的 Vue 3 defineEmits 重载语法
  - [x] SubTask 3.2: 补充测试用例验证有 payload 和无 payload 两种场景
  - 验证: 生成的 Vue SFC 通过 vue-tsc 类型检查

- [x] Task 4: 添加 package.json 声明依赖
  - [x] SubTask 4.1: 创建 package.json，声明 type: module
  - [x] SubTask 4.2: 将 prettier 声明为可选依赖
  - [x] SubTask 4.3: 将 vitest 声明为 devDependency
  - 验证: `npm install` 后 `npx vitest run` 正常工作

## Phase 2: 引入 Design Spec 层 ✅ 已完成

- [x] Task 5: 编写 Design Spec 格式规范
  - [x] SubTask 5.1: 创建 `references/design-spec.md`，定义 Spec 的 YAML/JSON 结构
  - [x] SubTask 5.2: 定义组件结构、props、events、states、dataSource、visual 完整字段
  - [x] SubTask 5.3: 提供 3 个完整示例（统计卡片、表单、图表）
  - 验证: 规范文档通过同行评审，示例可被人类理解

- [x] Task 6: 实现 Spec 校验器
  - [x] SubTask 6.1: 创建 `scripts/validate-spec.js`，校验 Spec 格式合法性
  - [x] SubTask 6.2: 校验必填字段（name、convertMode、props 类型）
  - [x] SubTask 6.3: 校验引用完整性（typeRef 指向的文件存在）
  - [x] SubTask 6.4: 补充测试用例覆盖合法和非法 Spec
  - 验证: 合法 Spec 通过，非法 Spec 报告具体错误

- [x] Task 7: 实现 Spec → HTML 生成器
  - [x] SubTask 7.1: 创建 `scripts/generate-html.js`，从 Spec 生成 HTML 设计稿
  - [x] SubTask 7.2: 生成含 data-* 标注的完整 HTML（含 viewport、theme 声明）
  - [x] SubTask 7.3: 生成对应的 CSS（BEM 命名 + var() token 引用）
  - [x] SubTask 7.4: 补充测试用例验证生成的 HTML 通过 validate-all.js
  - 验证: 生成的 HTML 通过所有 check-*.js 校验

- [x] Task 8: 实现 Spec → 代码生成器
  - [x] SubTask 8.1: 创建 `scripts/generate-code.js`，从 Spec 生成 Vue/React 代码
  - [x] SubTask 8.2: 生成 props 接口（含类型、必填、默认值）
  - [x] SubTask 8.3: 生成 events/emits 定义（含 payload 类型）
  - [x] SubTask 8.4: 生成状态管理代码（useState/reactive + loading/error 态）
  - [x] SubTask 8.5: 生成 API 调用骨架（基于 dataSource 契约）
  - [x] SubTask 8.6: 生成 CSS Module（从 visual 规格）
  - 验证: 生成的代码通过 TypeScript 类型检查

- [x] Task 9: 实现三角一致性校验
  - [x] SubTask 9.1: 创建 `scripts/check-spec-fidelity.js`
  - [x] SubTask 9.2: 校验 HTML 的 data-component 与 Spec 的 component 一致
  - [x] SubTask 9.3: 校验代码的 props 接口与 Spec 的 props 一致
  - [x] SubTask 9.4: 校验代码的 CSS 与 HTML 的 CSS 一致（AST 级比对）
  - [x] SubTask 9.5: 补充测试用例覆盖三者不一致的场景
  - 验证: 三者一致时通过，任一不一致时报告具体差异

- [x] Task 10: 实现 HTML → Spec 逆向生成器（迁移工具）
  - [x] SubTask 10.1: 创建 `scripts/html-to-spec.js`，从现有 HTML 提取 Spec
  - [x] SubTask 10.2: 提取 data-component/data-prop/data-event 为 Spec 结构
  - [x] SubTask 10.3: 标记缺失字段（API、状态机）为 TODO
  - 验证: 逆向生成的 Spec 经人工补充后可通过 validate-spec.js

- [x] Task 11: 更新 SKILL.md 工作流
  - [x] SubTask 11.1: 新增 Spec-First 工作流说明
  - [x] SubTask 11.2: 保留 HTML-First 作为快速预览模式
  - [x] SubTask 11.3: 更新模块加载表
  - 验证: SKILL.md 清晰描述两种工作流的适用场景

## Phase 3: 替换转换器核心（AST 化）✅ 已完成

- [x] Task 12: 改进 HTML 解析器边界处理
  - [x] SubTask 12.1: 修复自闭合标签属性读取
  - [x] SubTask 12.2: 修复属性值中的 > 字符处理
  - [x] SubTask 12.3: 添加 HTML 实体解码
  - [x] SubTask 12.4: 修复注释处理（不误解析为元素）
  - 验证: 所有现有测试通过，新增 13 个边界测试通过

- [x] Task 13: 标记旧转换器为 deprecated
  - [x] SubTask 13.1: convert-to-react.js 添加 @deprecated 注释，指向 generate-code.js
  - [x] SubTask 13.2: convert-to-vue.js 添加 @deprecated 注释，指向 generate-code.js
  - 说明: Phase 2 的 generate-code.js 已从 Spec 直接生成代码，替代旧路径
  - 验证: 旧脚本仍可用，但用户被引导到 Spec-First 工作流

- [x] Task 14: 重写保真度校验为精确比对
  - [x] SubTask 14.1: 修复 CSS 选择器比对的子串匹配假阳性
  - [x] SubTask 14.2: 修复 class 保留率校验的子串匹配假阳性
  - [x] SubTask 14.3: 新增 CSS 属性值校验（关键属性值比对）
  - [x] SubTask 14.4: 补充测试用例验证不再有假阳性
  - 验证: 15 个新测试通过，子串匹配的假阳性用例现在正确报告失败

## Phase 4: 工程化补全 ✅ 已完成

- [x] Task 15: 定义 Spec 的 JSON Schema
  - [x] SubTask 15.1: 创建 `schemas/design-spec.schema.json`
  - [x] SubTask 15.2: 支持编辑器自动补全和校验
  - [x] SubTask 15.3: 配置 .vscode/settings.json 关联 schema
  - 验证: VSCode 打开 Spec 文件有自动补全

- [x] Task 16: 端到端测试
  - [x] SubTask 16.1: 创建 `scripts/__tests__/e2e.test.js`
  - [x] SubTask 16.2: 测试 Spec → HTML → 代码 → 校验全流程（React + Vue）
  - [x] SubTask 16.3: 测试 Spec 变更 → 同步更新 → 校验通过
  - [x] SubTask 16.4: 测试 HTML → Spec 逆向 → 补充 → 生成 → 校验通过
  - 验证: 端到端测试 4 个场景全部通过

- [x] Task 17: 更新 benchmark 评测
  - [x] SubTask 17.1: 创建 iteration-2 目录和 3 个 eval 定义
  - [x] SubTask 17.2: 新增 Spec-First 工作流的 eval（dashboard + form）
  - [x] SubTask 17.3: 新增 HTML→Spec 迁移 eval
  - [x] SubTask 17.4: 编写 benchmark.md 对比 iteration-1 vs iteration-2
  - 验证: 测试覆盖 134 个，端到端验证通过

# Task Dependencies

- Task 2, 3, 4 可与 Task 1 并行
- Task 5 是 Task 6, 7, 8, 9, 10, 11 的前置
- Task 6, 7, 8 可并行（都依赖 Task 5）
- Task 9 依赖 Task 7 和 Task 8（需要两者的输出做校验）
- Task 10 依赖 Task 5（需要 Spec 格式定义）
- Task 12 是 Task 13, 14 的前置
- Task 13, 14 可并行
- Task 15 依赖 Task 5
- Task 16 依赖 Phase 2 和 Phase 3 全部完成
- Task 17 依赖 Task 16
