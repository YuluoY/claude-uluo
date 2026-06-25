# API 设计原则

组件创建 Phase 2 的方法论。定义如何设计组件的对外契约。

---

## 设计顺序

**先想清楚输入输出，再想内部状态。顺序不可调换。**

```
1. 输入（props/attributes）   → 组件接受什么数据？
2. 输出（emits/events）       → 组件传递什么给外部？
3. 插槽（slots/children）     → 哪些内容由调用方注入？
4. 双向绑定（v-model/controlled） → 哪些值需要同步？
5. 状态（internal state）     → 哪些状态内部管理？
```

---

## 核心原则

### 1. 最小 API 表面

**能内部推导的不要做成 prop。**

```typescript
// ❌ 坏：total 可以从 items 推导
<Component :items="items" :total="items.length" />

// ✅ 好：内部推导
<Component :items="items" />  // 内部 computed: items.length
```

**判断标准：** 如果一个值能从其他 props 计算得出，就不要做成独立 prop。例外：当推导成本高或调用方需要覆盖时。

### 2. 合理默认值

**80% 场景零配置可用。**

```typescript
// ❌ 坏：必填太多，简单场景也要写一堆
<Component :data="data" :pageSize="10" :showHeader="true" :bordered="true" />

// ✅ 好：默认值覆盖常见场景
<Component :data="data" />  // pageSize=10, showHeader=true, bordered=true
```

### 3. 正交设计

**props 之间不耦合，不互相暗示。**

```typescript
// ❌ 坏：layout 影响 columns 的含义，耦合
<Component layout="table" :columns="5" />  // columns 是列数
<Component layout="grid" :columns="5" />   // columns 是网格列数？含义变了

// ✅ 好：正交，含义独立
<Component layout="table" :tableColumns="5" />
<Component layout="grid" :gridColumns="5" />
```

### 4. 受控 vs 非受控

**明确每个状态是受控、非受控、还是半受控。**

| 模式 | 特征 | 适用场景 |
|------|------|---------|
| **受控** | 外部传入值 + change 事件 | 需要外部控制状态时 |
| **非受控** | 内部管理状态，通过 ref 暴露 | 简单场景，外部不关心状态 |
| **半受控** | 有默认值，外部可覆盖 | 最灵活，推荐默认 |

```typescript
// 半受控示例：有 defaultValue，也可 value 受控
<Component :defaultValue="foo" />     // 非受控
<Component v-model="foo" />           // 受控
```

### 5. 向后兼容

**新增可选，不破坏已有。**

- 新增 prop → 必须有默认值
- 新增 emit → 不影响现有监听
- 移除 prop → 先标记 deprecated，下个大版本再移除

---

## 命名规范

### Props 命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 布尔 | is/has/can 前缀 | `isLoading`, `hasError`, `canClose` |
| 数组 | 复数名词 | `items`, `columns` |
| 函数 | on 前缀（React）/ handle 前缀（Vue） | `onClose`, `handleSelect` |
| 枚举 | 描述状态/类型 | `size: 'sm' \| 'md' \| 'lg'` |

### Events 命名

- 过去式表示已发生：`changed`, `selected`, `closed`
- 现在时表示正在发生：`changing`, `selecting`
- 命名一致：`close` + `closed` 不要混用

---

## API 审查清单

- [ ] 每个 prop 都有明确的类型定义
- [ ] 每个 prop 都有默认值（除非必填）
- [ ] 必填 prop 数量 ≤ 3（超过说明职责可能过大）
- [ ] props 之间无耦合关系
- [ ] emits/events 命名一致
- [ ] 插槽有默认内容
- [ ] 受控/非受控模式明确
- [ ] 80% 场景零配置可用
