# Tasks

- [x] Task 1: 创建 references/checklist-bans.md 文件
  - [x] SubTask 1.1: 编写「检查清单」模块，覆盖 10 个维度（职责与 API、四态、a11y、i18n、主题、响应式、性能、安全、测试、可维护性），每项附判定标准
  - [x] SubTask 1.2: 编写「禁止事项」模块，每条附 ❌ 反例 + ✅ 正例 + 判定标准
  - [x] SubTask 1.3: 编写「检查项到 Phase 映射表」，标注每项在哪个 Phase 检查
  - [x] SubTask 1.4: 融入 MCP 调研结论（WCAG 2.2 焦点可见性/拖拽替代、React.memo 性能阈值、Vue props 不可变、触摸目标 44px 等）

- [x] Task 2: 修改 SKILL.md 替换内联清单为链接
  - [x] SubTask 2.1: 将「质量闸门」节替换为简短引导 + 链接到 references/checklist-bans.md
  - [x] SubTask 2.2: 将「禁止事项」节替换为简短引导 + 链接到 references/checklist-bans.md
  - [x] SubTask 2.3: 在「文件索引」的 references 表中新增 checklist-bans.md 条目

- [x] Task 3: 验证链接和引用完整性
  - [x] SubTask 3.1: 确认 SKILL.md 中所有链接路径正确
  - [x] SubTask 3.2: 确认 checklist-bans.md 内部对其他 reference 的交叉引用正确

# Task Dependencies

- Task 2 依赖 Task 1（需要文件存在才能链接）
- Task 3 依赖 Task 1 和 Task 2
