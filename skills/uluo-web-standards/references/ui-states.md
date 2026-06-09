# 组件状态模式

**加载条件：** Vue/React 组件、搭建完整模块时加载。

> 参考：[TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query)
> UI 实现见 `references/languages/vue.md`、`references/languages/react.md`。

---

## 目录

- [四态模型](#four-state-model)
- [渲染决策树](#render-decision-tree)
- [状态机：Discriminated Union](#state-machine-discriminated-union)
- [Loading](#loading)
  - [骨架屏 vs Spinner](#skeleton-vs-spinner)
- [Empty](#empty)
- [Error](#error)
  - [错误层级](#error-levels)
  - [核心原则](#error-principles)
- [Error Boundary](#error-boundary)
- [乐观更新](#optimistic-updates)
- [Race Condition](#race-condition)
- [按钮状态](#button-states)
- [自检](#self-check)

## 四态模型

每个数据驱动的组件必须覆盖四种状态——缺任何一种都是生产事故：

```
loading → 骨架屏 / Spinner
empty   → 引导文案（不是空白）
error   → 错误信息 + 重试
success → 正常展示
```

---

## 渲染决策树

按顺序检查——一次只处于一个状态：

```
有错误？
  → 是：显示 Error（带 重试）
  → 否：继续

正在加载 且 没数据？
  → 是：显示 Loading（骨架屏/Spinner）
  → 否：继续

有数据？
  → 是，有内容：显示 Success
  → 是，无内容：显示 Empty（带引导）
  → 否：显示 Loading（兜底）
```

```tsx
// ✅ 正确：一次一个状态
const { data, isLoading, isError, error, refetch } = useQuery(...)

if (isError)
  return <ErrorPage error={error} onRetry={refetch} />
if (isLoading && !data)
  return <Skeleton />
if (!data?.items.length)
  return <Empty title={t('task.empty')} hint={t('task.empty.hint')} />
return <List items={data.items} />
```

```tsx
// ❌ 错误：refetch 时整个列表闪烁消失
if (isLoading)
  return <Spinner />         // 有旧数据也被覆盖了
return <List items={data} />
```

---

## 状态机：Discriminated Union

用类型系统禁止非法状态组合——三个布尔（`isLoading`、`isError`、`hasData`）产生 8 种组合但只有 ~4 种有意义：

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }
  | { status: 'empty' }

// 合法转移：
// idle → loading → success | error | empty
// success/empty → loading（refetch，保留旧数据）
// error → loading（retry）
```

React Query / TanStack Query 内置了这套逻辑——`status` 字段就是 discriminated union。

---

## Loading

### 骨架屏 vs Spinner

| 骨架屏 | Spinner |
|--------|---------|
| 已知内容形态（列表/卡片） | 未知内容形态 |
| 首屏加载 | 按钮提交中 |
| 减少布局跳动 | 短暂操作（<1s） |

```tsx
// 骨架屏——保留布局空间
function UserListSkeleton()
{
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="user-card user-card--loading" />
      ))}
    </div>
  )
}
```

- 首屏用 `<Suspense>` 或路由级 loading
- 按钮 loading：`disabled + loading icon + 文案变化`（`'提交'` → `'提交中...'`）

---

## Empty

必须有引导文案和行动入口。分类处理：

| 类型 | 文案 | 行动 |
|------|------|------|
| 新建型 | "暂无数据，点击创建" | 新建按钮 |
| 搜索型 | "未找到匹配结果，试试其他关键词" | 修改搜索条件 |
| 权限型 | "你没有权限访问此内容" | 联系管理员 |
| 初始型 | "欢迎！开始你的第一条记录吧" | 新手引导 |

**空状态从来不应该是空白。** 空白 = 用户以为卡住了。

---

## Error

### 错误层级

| 层级 | 场景 | 示例 |
|------|------|------|
| 字段内联 | 表单校验 | 输入框下方红色提示 |
| Toast 通知 | 可恢复操作 | 提交失败，自动消失 |
| 区域 Banner | 页面部分失败 | 列表加载失败（其余正常） |
| **全屏错误** | 不可恢复 | 页面级 ErrorBoundary |

### 核心原则

- 显示**具体**错误信息（不是"出错了"三个字）
- **始终有重试按钮**
- 区分可恢复和不可恢复：网络错误可重试，401 跳登录
- 不显示技术细节给用户（stack trace 进日志）

```tsx
<ErrorPage
  message={t('order.loadFailed')}
  detail={error.message}
  onRetry={refetch}
/>
```

---

## Error Boundary

不被子组件错误拖垮整个页面。具体实现见 `references/languages/vue.md` §八、`references/languages/react.md` §十二。

---

## 乐观更新

先更新 UI，再等请求返回——失败时回滚：

```typescript
const mutation = useMutation({
  mutationFn: deleteUser,
  onMutate: async (id) =>
  {
    await queryClient.cancelQueries({ queryKey: ['users'] })
    const previous = queryClient.getQueryData(['users'])
    // 乐观删除
    queryClient.setQueryData(['users'], old => old.filter(u => u.id !== id))
    return { previous }
  },
  onError: (err, id, context) =>
  {
    // 回滚
    queryClient.setQueryData(['users'], context.previous)
    toast.error(t('user.deleteFailed'))
  },
  onSettled: () =>
  {
    // 最终和服务端同步
    queryClient.invalidateQueries({ queryKey: ['users'] })
  },
})
```

---

## Race Condition

快速操作时旧响应覆盖新结果（搜索框快速输入、tab 快速切换）：

```typescript
// AbortController — 取消旧请求
useEffect(() =>
{
  const controller = new AbortController()

  fetchResults(query, { signal: controller.signal }).then(setData)

  return () => controller.abort()
}, [query])
```

TanStack Query 靠 `queryKey` 自动去重 + 后台只取最新，不需手动处理。

---

## 按钮状态

```tsx
// ✅ disabled + loading 态
<Button
  onClick={handleSubmit}
  disabled={isPending}
  isLoading={isPending}
>
  {isPending ? t('common.saving') : t('common.submit')}
</Button>
```

---

## 自检

- [ ] 每个数据驱动组件覆盖 loading / empty / error / success 四态？
- [ ] Loading 用骨架屏（非空白）？refetch 时保留旧数据不闪烁？
- [ ] Empty 有引导文案和行动入口？分类处理（新建型/搜索型/权限型）？
- [ ] Error 有具体信息 + 重试按钮？区分可恢复/不可恢复？
- [ ] 关键区域包裹 Error Boundary？
- [ ] 乐观更新有 rollback？race condition 有 abort？
- [ ] 按钮 async 操作时 disabled + loading 态？
