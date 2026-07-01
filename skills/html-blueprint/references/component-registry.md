# 组件注册表协议

> **Phase**: Phase 1b（注册） / Phase 2b（查表）

component-registry.json 是跨页面组件的**共享索引**。不存储完整 props/events 定义（详情从 HTML data-* 属性读取），只记录"谁在哪、被谁用"。

---

## Schema

```json
{
  "version": "1.0",
  "project": "MyProject",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "atomicComponents": {
    "Button": {
      "type": "atomic",
      "category": "button",
      "htmlFile": "components/button.html",
      "usedInPages": ["login.html", "settings.html"],
      "status": "confirmed"
    }
  },
  "businessComponents": {
    "UserProfileCard": {
      "type": "business",
      "htmlFile": "components/user-profile-card.html",
      "usedInPages": ["dashboard.html"],
      "status": "pending"
    }
  },
  "statistics": {
    "total": 0,
    "atomic": 0,
    "business": 0,
    "confirmed": 0,
    "pending": 0
  }
}
```

---

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `version` | 是 | 固定 `"1.0"` |
| `project` | 是 | 项目名称 |
| `updatedAt` | 是 | ISO-8601 更新时间 |
| `atomicComponents.<Name>.type` | 是 | 固定 `"atomic"` |
| `atomicComponents.<Name>.category` | 否 | 分类：button/input/card/badge/avatar/... |
| `atomicComponents.<Name>.htmlFile` | 是 | 相对于 design/ 的路径 |
| `atomicComponents.<Name>.usedInPages` | 是 | 使用此组件的页面文件名列表 |
| `atomicComponents.<Name>.status` | 是 | `pending` 或 `confirmed` |
| `businessComponents` | 是 | 同 atomic 结构，type 固定 `"business"`，无 category |

---

## 分类规则

| 分类 | 判定 | 示例 |
|------|------|------|
| **atomic** | 无业务逻辑，可映射到任何 UI 库 | Button, Input, Card, Badge, Avatar |
| **business** | 包含业务数据和领域逻辑 | UserProfileCard, OrderTable, LoginForm |

---

## 状态生命周期

```
pending ──（跨页面校验通过）──→ confirmed
pending ──（签名冲突）────────→ 需重命名或合并
```

- **pending**：新注册，仅出现在一个页面中，尚未跨页面验证
- **confirmed**：跨页面签名一致，或手动审批通过

---

## AI 查表复用工作流（HARD）

### Phase 1 Step 4：注册原子组件

生成完所有原子组件后：

```bash
node scripts/flow.js design/ complete phase1-components
```

自动执行门禁：
- 所有原子组件 HTML 存在
- 全部注册到 component-registry.json（status: confirmed）
- statistics 更新

### Phase 2：生成页面前读表

每次生成新页面前：

1. 读取 `design/component-registry.json`
2. 对页面需要的每个组件：
   - 在 `atomicComponents` 或 `businessComponents` 中按 name 匹配
   - **已存在** → 复用（`<!-- @component-ref ../components/<name>.html -->`），追加 `usedInPages`
   - **不存在** → 新建为 business 组件，标记 `status: pending`
3. 页面生成后更新 registry（`usedInPages` + statistics + `updatedAt`）

### Phase 2 完成后校验

```bash
node scripts/flow.js design/ complete phase2
```

门禁：
- component-registry.js 校验通过（含跨页面一致性）
- 所有 pending 组件无 props/events 冲突

---

## 校验脚本（component-registry.js）

### HARD 规则

- JSON 解析成功，version = `"1.0"`
- `atomicComponents` / `businessComponents` 必须是 object（key = PascalCase）
- 每个 entry：name（PascalCase）、type（atomic|business）、htmlFile（存在）、status（pending|confirmed）
- `design/pages/` 和 `design/components/` 中所有 `data-component` 声明必须在 registry 有对应 entry
- 跨页面一致性：同名组件在不同页面中的 data-prop/data-event 签名必须一致

### WARN 规则

- 有 pages 存在但 registry 缺失
- `pending` 状态的组件仅被一个页面引用

---

## 引用时机

| Phase | 何时读取 |
|-------|---------|
| Phase 1 Step 4 | 注册原子组件时写入 |
| Phase 2 | 每页生成前读取查表 |
| Phase 2 完成后 | 脚本校验 |
| Phase 3 | 最终校验 |
