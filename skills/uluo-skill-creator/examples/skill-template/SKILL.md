---
name: <skill-name>
description: >-
  <一句话说明 skill 用途>。Use this skill whenever <触发场景描述>. Also use when the user
  mentions any of: <关键词列表>. <可适当 pushy 的触发说明，例如"即使没有明确说 X 也应使用本 skill">。
---

# <skill-name>

<1-2 段概述：说明 skill 的定位、核心理念、与相关 skill 的差异。本文件是编排器——规范细节见 references/，硬约束校验见 scripts/，模板见 examples/。>

---

## 执行流程

<按 Phase 模型组织。每个 Phase 简述目标 + 关键产出。按 skill 复杂度增删 Phase。>

```
Phase 0: <阶段名>
         ├ <子步骤>
         ├ <子步骤>
         └ <产出>

Phase 1: <阶段名>
         ├ <子步骤>
         └ <产出>

Phase 2: <阶段名>
         ├ <子步骤>
         └ <产出>
```

---

## references 引用时机（progressive disclosure）

<SKILL.md 是 L2 层（skill 触发时加载，建议 <500 行）。规范细节按需加载到 references/。>

| references 文件 | 何时读取 |
|----------------|---------|
| [<file>.md](references/<file>.md) | <Phase X 何时读取> |
| [<file>.md](references/<file>.md) | <Phase X 何时读取> |

---

## 禁止事项

- **禁止 <具体禁止项>**——<理由>
- **禁止 <具体禁止项>**——<理由>
- **禁止 <具体禁止项>**——<理由>
