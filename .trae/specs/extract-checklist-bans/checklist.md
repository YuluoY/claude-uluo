# Checklist

## 文件结构

- [x] `skills/component-creator/references/checklist-bans.md` 文件已创建
- [x] 文件包含两大模块：检查清单（Checklist）和禁止事项（Bans）

## 检查清单模块

- [x] 覆盖 10 个维度：职责与 API、四态、a11y、i18n、主题、响应式、性能、安全、测试、可维护性
- [x] 每个检查项附判定标准（如何判断通过）
- [x] 融入 WCAG 2.2 新增标准（焦点不被遮挡、焦点外观、拖拽替代、目标尺寸）
- [x] 融入性能阈值（React.memo 适用场景、虚拟化阈值 50/100、防抖节流场景）
- [x] 融入 Vue/React 特定检查项（props 不可变、key 稳定、依赖数组完整）

## 禁止事项模块

- [x] 每条禁令附 ❌ 错误示例
- [x] 每条禁令附 ✅ 正确示例
- [x] 每条禁令附判定标准
- [x] 覆盖原 SKILL.md 的 6 条禁令并扩展

## Phase 映射

- [x] 提供「检查项 → Phase」映射表
- [x] 标注每项在哪个 Phase 检查（Phase 2/3/4/5）

## SKILL.md 修改

- [x] 「质量闸门」节替换为简短引导（2-3 句）+ 链接
- [x] 「禁止事项」节替换为简短引导（2-3 句）+ 链接
- [x] 「文件索引」references 表新增 checklist-bans.md 条目
- [x] 链接路径正确（相对路径 `references/checklist-bans.md`）

## 引用完整性

- [x] SKILL.md 中所有链接可解析
- [x] checklist-bans.md 内部交叉引用正确
- [x] 未破坏 SKILL.md 其他章节内容
