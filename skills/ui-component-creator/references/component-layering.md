# 组件库层次设计

UI 组件库分为两层：原子层（Atomic Layer）和业务层（Business Layer）。两层组件都可由 ui-component-creator skill 创建，但设计考量不同。

---

## 一、两层模型

### 原子层（Atomic Layer）

通用基础组件，不包含业务语义。

**职责：**
- 提供通用的 UI 基础能力
- 完整的三层样式分离
- 完整的四态处理
- 完整的 a11y 支持
- 风格预设兼容

**典型组件：** Button、Input、Select、Modal、Table、Tabs、Tooltip、Popover、Drawer、Toast

**设计原则：**
- API 最小化、正交化——每个 prop 只做一件事
- 不包含任何业务概念（不出现 user/order/product 等词）
- 样式完全走语义 token，可被任意风格预设覆盖
- 四态自洽——每个原子组件自己处理 loading/error/empty/success

### 业务层（Business Layer）

基于原子层组件组合封装，包含业务语义。

**职责：**
- 组合原子层组件提供业务场景能力
- 封装业务逻辑和领域概念
- 继承原子层样式架构
- 补充组合交互的 a11y

**典型组件：** UserSelect（组合 Input + Popover + List）、OrderTable（组合 Table + Pagination + Filter）、UserProfileCard（组合 Avatar + Text + Button）

**设计原则：**
- 通过原子层组件的公开 API 组合，不直接访问内部实现
- API 面向业务场景，提供领域语义化 props（如 UserSelect 的 `filterByRole` 而非 `filterByField`）
- 样式继承原子层语义 token，不引入新的硬编码值
- 四态可委托给原子层组件（如 OrderTable 的 loading 委托给 Table 的 loading 态）
- 可定义业务语义 token（如 `--color-user-avatar-border`），但值仍引用语义层

---

## 二、层次组合关系

业务层组件通过组合原子层组件实现业务能力。组合不是简单堆叠，需要遵循以下规则。

### 1. 组合原则：通过公开 API，不访问内部

业务层组件只能使用原子层组件对外公开的 props、events、slots，不能直接访问其内部状态、私有方法或 DOM 结构。

```typescript
// ❌ 坏：业务层直接访问原子层内部
import { InputInternal } from '@/components/Input';
this.$refs.userInput.internalValue = 'xxx';  // 访问内部状态

// ✅ 好：通过公开 API 组合
<AtomicInput
  v-model="userInput"
  :placeholder="t('user.selectPlaceholder')"
  @input="handleSearch"
/>
```

### 2. 样式继承规则：继承语义 token，不覆盖结构层

业务层组件直接使用原子层已定义的语义 token，不重新定义；不覆盖原子层组件的结构层样式（如定位、布局方式）。

```css
/* ❌ 坏：业务层覆盖原子层结构层 */
.user-select .atomic-input {
  display: block;  /* 覆盖了 Input 的 inline-block 结构 */
}

/* ✅ 好：业务层只补充布局，不修改原子层内部 */
.user-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
```

### 3. 四态委托策略

业务层组件不需要重复实现原子层已有的状态处理，应优先委托给原子层组件。

| 状态 | 委托策略 | 示例 |
|------|---------|------|
| Loading | 委托给原子层 | OrderTable 的 loading 委托给 Table 的 loading prop |
| Error | 业务层处理 | UserSelect 搜索失败时，业务层显示错误提示 |
| Empty | 业务层处理 | UserSelect 无匹配用户时，业务层显示「无匹配用户」 |
| Success | 委托给原子层 | OrderTable 数据正常时，直接传给 Table 渲染 |

**判定规则：** 状态的语义是通用的（如表格加载中）→ 委托；状态的语义是业务的（如无匹配用户）→ 业务层处理。

### 4. a11y 补充原则

原子层组件保证自身的基础 a11y（如 Input 的 label、Table 的 caption）。业务层组件需要补充组合交互产生的 a11y 需求。

- **组合后的焦点流**：UserSelect 打开下拉时，焦点应移入列表；关闭时归还到 Input
- **组合后的 ARIA**：UserSelect 的 Input 需要 `role="combobox"`、`aria-expanded`、`aria-controls` 指向 List
- **组合后的键盘交互**：UserSelect 的上下键导航、Enter 选中、Esc 关闭

### 5. 代码示例

#### Vue 3 示例：UserSelect 组合 Input + Popover + List

```vue
<template>
  <div class="user-select" :class="{ 'is-loading': isLoading }">
    <AtomicInput
      v-model="searchKeyword"
      :placeholder="placeholder"
      role="combobox"
      :aria-expanded="isPopoverOpen"
      aria-controls="user-list"
      @focus="openPopover"
      @input="handleSearch"
    />
    <AtomicPopover :visible="isPopoverOpen" @close="closePopover">
      <AtomicList
        id="user-list"
        :items="filteredUsers"
        :loading="isLoading"
        :error="errorMessage"
        @select="handleSelect"
      >
        <template #empty>
          <slot name="empty">{{ t('user.noMatch') }}</slot>
        </template>
      </AtomicList>
    </AtomicPopover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AtomicInput from '@/components/Input/Input.vue';
import AtomicPopover from '@/components/Popover/Popover.vue';
import AtomicList from '@/components/List/List.vue';

interface User {
  id: string;
  name: string;
  role: string;
}

const props = defineProps<{
  users: User[];
  placeholder?: string;
  filterByRole?: string;  // 业务语义化 prop
}>();

const emit = defineEmits<{
  select: [user: User];
}>();

const searchKeyword = ref('');
const isPopoverOpen = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const filteredUsers = computed(() => {
  let result = props.users;
  if (props.filterByRole) {
    result = result.filter(u => u.role === props.filterByRole);
  }
  if (searchKeyword.value) {
    result = result.filter(u => u.name.includes(searchKeyword.value));
  }
  return result;
});

function openPopover() {
  isPopoverOpen.value = true;
}
function closePopover() {
  isPopoverOpen.value = false;
}
function handleSearch() {
  // 委托给 List 的 loading 态
  isLoading.value = true;
  // ... 搜索逻辑
}
function handleSelect(user: User) {
  emit('select', user);
  closePopover();
}
</script>

<style scoped>
.user-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
```

#### React 示例：OrderTable 组合 Table + Pagination + Filter

```tsx
import React, { useState, useMemo } from 'react';
import AtomicTable from '@/components/Table';
import AtomicPagination from '@/components/Pagination';
import AtomicFilter from '@/components/Filter';

interface Order {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped';
}

interface OrderTableProps {
  orders: Order[];
  loading?: boolean;
  pageSize?: number;
  onStatusChange?: (status: Order['status']) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading = false,
  pageSize = 10,
  onStatusChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');

  // 业务逻辑：筛选 + 分页
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const columns = [
    { key: 'id', title: '订单号' },
    { key: 'amount', title: '金额' },
    { key: 'status', title: '状态' },
  ];

  return (
    <div className="order-table">
      <AtomicFilter
        value={statusFilter}
        onChange={(v) => {
          setStatusFilter(v as Order['status'] | 'all');
          onStatusChange?.(v as Order['status']);
        }}
        options={[
          { label: '全部', value: 'all' },
          { label: '待支付', value: 'pending' },
          { label: '已支付', value: 'paid' },
          { label: '已发货', value: 'shipped' },
        ]}
      />
      {/* loading 委托给原子层 Table */}
      <AtomicTable
        columns={columns}
        data={pagedOrders}
        loading={loading}
        emptyText="暂无订单"
      />
      <AtomicPagination
        current={currentPage}
        total={filteredOrders.length}
        pageSize={pageSize}
        onChange={setCurrentPage}
      />
    </div>
  );
};

export default OrderTable;
```

---

## 三、各层设计差异对照表

| 维度 | 原子层 | 业务层 |
|------|--------|--------|
| 通用性 | 通用，无业务语义 | 面向特定业务场景 |
| API 设计 | 最小化、正交化 | 领域语义化 |
| 样式分离 | 完整三层分离 | 继承原子层 + 业务 token |
| 四态处理 | 自洽，全部自处理 | 可委托原子层 |
| a11y | 完整基础支持 | 基础 + 组合交互补充 |
| 风格预设 | 至少兼容 2 种 | 继承原子层兼容性 |
| 测试 | 单元 + 视觉回归 | 单元 + 集成 + 组合交互 |
| 复用范围 | 跨项目复用 | 项目内/领域内复用 |
| 依赖方向 | 不依赖业务层 | 依赖原子层 |
| 命名规范 | 通用名词（Button/Table） | 业务名词（UserSelect/OrderTable） |
| 文档示例 | 通用场景 | 业务场景 |
| 变更频率 | 低（稳定后很少改） | 中（随业务演进） |

---

## 四、层次判定流程

创建组件时，按以下流程判定层次：

### 判定决策树

```
组件是否包含业务概念（user/order/product 等）？
├── 否 → 原子层
│   └── 是否能独立使用，不依赖其他业务组件？
│       ├── 是 → 原子层 ✅
│       └── 否 → 重新评估，可能是业务层
└── 是 → 业务层
    └── 是否基于原子层组件组合？
        ├── 是 → 业务层 ✅
        └── 否 → 是否能拆解为原子组件 + 业务逻辑？
            ├── 是 → 拆解后，业务层 ✅
            └── 否 → 可能不适合用此 skill（考虑页面组件）
```

### 判定示例

**示例 1：Button**
- 包含业务概念？否
- 能独立使用？是
- **判定：原子层** ✅
- 理由：通用基础组件，无业务语义，任何项目都能用

**示例 2：UserSelect**
- 包含业务概念？是（User）
- 基于原子层组合？是（Input + Popover + List）
- **判定：业务层** ✅
- 理由：包含「用户」业务概念，组合了多个原子组件

**示例 3：LoginForm**
- 包含业务概念？是（Login）
- 基于原子层组合？部分（Form + Input + Button），但还包含页面级逻辑（路由跳转、鉴权）
- 能拆解为原子组件 + 业务逻辑？拆解后仍是页面组件
- **判定：不适合** ❌
- 理由：LoginForm 是页面组件，不是组件库组件。应拆为页面 + 业务组件（如 LoginFormFields）

**示例 4：DatePicker**
- 包含业务概念？否
- 能独立使用？是
- **判定：原子层** ✅
- 理由：通用日期选择，无业务语义

**示例 5：OrderStatusBadge**
- 包含业务概念？是（Order）
- 基于原子层组合？是（Badge + 业务状态映射逻辑）
- **判定：业务层** ✅
- 理由：组合原子层 Badge，封装订单状态到颜色/文案的映射

**示例 6：DataTable**
- 包含业务概念？否（Data 是通用概念）
- 能独立使用？是
- **判定：原子层** ✅
- 理由：通用数据表格，无业务语义

---

## 五、层次对工作流的影响

不同层次在五阶段流程中的侧重点不同：

### 原子层侧重点

| Phase | 侧重点 |
|-------|--------|
| Phase 1 调研 | 调研同类组件库的 API 设计（如 Radix/shadcn/Ant Design） |
| Phase 2 API 设计 | API 最小化、正交化，props 之间无耦合 |
| Phase 3 结构拆分 | 完整三层样式分离，composable/hooks 拆分 |
| Phase 4 质量保障 | 完整四态、完整 a11y、风格切换测试 |
| Phase 5 测试 | 单元测试 + 视觉回归（多风格预设快照） |

### 业务层侧重点

| Phase | 侧重点 |
|-------|--------|
| Phase 1 调研 | 调研业务场景需求 + 识别可复用的原子层组件 |
| Phase 2 API 设计 | 领域语义化 API，面向业务场景 |
| Phase 3 结构拆分 | 原子组件组合策略，业务逻辑封装 |
| Phase 4 质量保障 | 组合交互 a11y，四态委托策略验证 |
| Phase 5 测试 | 集成测试 + 组合交互测试 |

### 各阶段具体差异

**Phase 1 调研差异：**
- 原子层：调研对象是同类组件库，关注 API 设计、a11y 实现、样式架构
- 业务层：调研对象是业务需求文档 + 现有原子层组件清单，关注如何复用

**Phase 2 API 设计差异：**
- 原子层：props 命名用通用词（`size`、`variant`、`disabled`），追求最小化
- 业务层：props 命名用业务词（`filterByRole`、`orderStatus`），追求场景化

**Phase 3 结构拆分差异：**
- 原子层：拆分 composable/hooks（如 `usePopover`、`useTableSelection`）
- 业务层：拆分业务逻辑模块（如 `userFilter.ts`、`orderStatus.ts`）

**Phase 4 质量保障差异：**
- 原子层：四态全部自处理，a11y 完整覆盖
- 业务层：四态委托策略验证，组合交互 a11y（焦点流、键盘导航）

**Phase 5 测试差异：**
- 原子层：视觉回归测试覆盖多风格预设快照
- 业务层：集成测试覆盖原子组件组合后的交互流程

---

## 六、常见反模式

### 反模式 1：原子层包含业务语义

```typescript
// ❌ 坏：原子层 Button 包含业务概念
interface ButtonProps {
  type: 'primary' | 'secondary';
  userType?: 'admin' | 'user';  // 业务概念泄漏
  orderStatus?: 'pending' | 'paid';  // 业务概念泄漏
}
```

**修正：** 移除业务相关 props，`userType`/`orderStatus` 应由业务层组件处理。

### 反模式 2：业务层重新实现原子层能力

```typescript
// ❌ 坏：UserSelect 自己实现 loading 态
<template>
  <div v-if="isLoading" class="user-select-loading">加载中...</div>
  <AtomicInput v-else ... />
</template>

// ✅ 好：委托给原子层
<AtomicInput :loading="isLoading" ... />
```

### 反模式 3：业务层访问原子层内部

```typescript
// ❌ 坏：直接操作原子层 DOM
this.$refs.atomicInput.$el.querySelector('input').focus();

// ✅ 好：通过公开方法
this.$refs.atomicInput.focus();
```

### 反模式 4：层次倒置

```typescript
// ❌ 坏：原子层组件依赖业务层组件
import UserAvatar from '@/business/UserAvatar';  // 原子层依赖业务层
export default defineComponent({
  components: { UserAvatar }
});
```

**修正：** 依赖方向只能是业务层 → 原子层，不能反向。
