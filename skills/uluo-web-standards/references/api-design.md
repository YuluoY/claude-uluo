# API 设计规范

**加载条件：** 项目启动、搭建完整模块、涉及 API 设计、后端接口对接、类型生成时加载。

> 参考：[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457)、[OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0)、[Postman REST Best Practices](https://blog.postman.com/rest-api-best-practices/)
> 前端消费侧错误处理见 `references/coding-paradigms.md` §await-to-js。

---

## 目录

- [一、API-First](#api-first)
- [二、URL 设计](#url-design)
- [三、HTTP 方法与状态码](#http-methods-and-status-codes)
- [四、响应信封](#response-envelope)
  - [错误码语义化](#error-code-semantics)
- [五、分页](#pagination)
  - [Cursor-based（推荐）](#cursor-based)
  - [Offset-based](#offset-based)
- [六、幂等性](#idempotency)
- [七、版本策略](#version-strategy)
- [八、限流](#rate-limiting)
- [九、类型组织](#type-organization)
  - [请求/响应类型分开](#request-response-type-separation)
- [十、API 请求函数](#api-request-functions)
- [十一、前端消费](#frontend-consumption)
- [自检](#self-check)

## 一、API-First

先写 OpenAPI spec，后写实现。前后端从 spec 生成类型，**契约冻结后不允许漂移**：

```yaml
openapi: 3.1.0
info:
  title: Order Service
  version: 1.0.0
paths:
  /api/v1/orders:
    get:
      summary: 订单列表
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
```

```bash
# OpenAPI → TypeScript 类型
npx openapi-typescript ./openapi.yaml -o src/types/api.generated.ts
```

- CI 中自动生成，保证前后端类型同步
- 不用 OpenAPI 时可用 Zod schema → `z.infer` 导出类型

---

## 二、URL 设计

| 规则 | ✅ | ❌ |
|------|-----|-----|
| 名词复数 | `/users` `/orders` | `/getUsers` `/createOrder` |
| kebab-case | `/product-categories` | `/productCategories` |
| 嵌套 ≤3 层 | `/users/123/orders` | `/users/123/orders/456/items/789` |
| 无尾斜杠 | `/users/123` | `/users/123/` |
| 查询参数 snake_case | `?page_size=20` | `?pageSize=20` |
| 动作作子资源 | `POST /orders/456/cancel` | `POST /cancelOrder` |

```
GET    /api/v1/users                  # 列表
GET    /api/v1/users/123              # 详情
POST   /api/v1/users                  # 创建
PUT    /api/v1/users/123              # 全量替换
PATCH  /api/v1/users/123              # 部分更新
DELETE /api/v1/users/123              # 删除
GET    /api/v1/users/123/orders       # 子资源
POST   /api/v1/orders/456/cancel      # 动作
```

---

## 三、HTTP 方法与状态码

| 方法 | 用途 | 成功码 | 幂等 |
|------|------|:---:|:---:|
| GET | 查询 | 200 | ✅ |
| POST | 创建 | 201 + `Location` header | ❌ |
| PUT | 全量替换 | 200 | ✅ |
| PATCH | 部分更新 | 200 | ❌ |
| DELETE | 删除 | 204（无 body） | ✅ |

| 码 | 含义 | 使用场景 |
|----|------|---------|
| 200 | 成功 | GET/PUT/PATCH |
| 201 | 已创建 | POST + `Location` |
| 204 | 无内容 | DELETE |
| 400 | 请求错误 | JSON 格式错、参数遗漏 |
| 401 | 未认证 | 无 token、token 过期 |
| 403 | 无权限 | 有 token 但没操作权限 |
| 404 | 不存在 | 资源 ID 无效 |
| 409 | 冲突 | 重复创建、版本冲突、乐观锁 |
| 422 | 校验失败 | 格式对但语义错 |
| 429 | 限流 | 请求太频繁 |
| 500 | 服务器错误 | 未预期异常 |

**禁止 200 包错误。**

---

## 四、响应信封

成功和失败用 discriminated union 区分——前端检查 `success` 后 TypeScript 自动窄化类型。

```typescript
// types/api.types.ts

export interface FieldError {
  field: string
  message: string
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

/** 成功 */
export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

/** 失败 */
export interface ApiError {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: FieldError[]
  }
  requestId?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
```

### 错误码语义化

| 错误码 | 前端处理 |
|--------|---------|
| `VALIDATION_ERROR` | 表单显示 `details[].field` 对应错误 |
| `UNAUTHORIZED` | 跳转登录页 |
| `FORBIDDEN` | 显示"无权限" |
| `NOT_FOUND` | 显示 404 或空状态 |
| `CONFLICT` | "已存在，请检查" |
| `RATE_LIMITED` | "操作太频繁" + 倒计时 |
| `INTERNAL_ERROR` | "服务器错误，请稍后重试" |

---

## 五、分页

### Cursor-based（推荐）

实时数据、大数据量、feed 流——无重复、无遗漏、性能恒定：

```http
GET /api/v1/products?cursor=eyJpZCI6NDJ9&limit=20
```

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6NjJ9",
    "prev_cursor": null,
    "has_next": true,
    "has_prev": false,
    "limit": 20
  }
}
```

- cursor 用 base64 编码（`{ id: 42 }` → `eyJpZCI6NDJ9`）
- 数据库用 `WHERE id > $cursorId ORDER BY id LIMIT $limit`
- 加复合索引：`CREATE INDEX idx_created_cursor ON orders(created_at DESC, id DESC)`

### Offset-based

管理后台、<10k 数据量、需跳页到任意页：

```http
GET /api/v1/users?page=2&page_size=20
```

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "page": 2,
    "pageSize": 20
  }
}
```

---

## 六、幂等性

POST 不可重放——网络超时后用户点第二次提交可能创建两条记录。用 `Idempotency-Key` header 去重：

```typescript
fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify(payload),
})
```

服务端按 key 缓存首次响应（24h），相同 key 再次请求返回相同结果。

---

## 七、版本策略

```http
GET /api/v1/users      # v1
GET /api/v2/users      # v2
```

| 版本 | 规则 |
|------|------|
| 主版本 | URL 携带（`v1`/`v2`），破坏性变更时升级 |
| 次版本/补丁 | 向后兼容——不体现于 URL |
| 活跃版本 | 同时维护 ≤2 个 |
| 废弃通知 | 至少 6 个月，带 header |

```http
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

**向后兼容的变更（不需要升版本）：** 新增字段、新增端点、新增可选参数。
**破坏性变更（需升版本）：** 删除/重命名字段、改字段类型、新增必填参数。

---

## 八、限流

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1713427260
```

不同用户/令牌不同配额。超出返回 429 + `Retry-After`。

---

## 九、类型组织

```
types/
  api.types.ts            ← 泛型信封（ApiResponse<T>、ErrorCode、FieldError）

features/<domain>/
  types/
    order.types.ts        ← 领域类型（Order、CreateOrderPayload、OrderQueryParams）
  api/
    order.api.ts          ← 请求函数（orderApi.fetchList、orderApi.create）
  index.ts                ← export type { Order } + export { orderApi }
```

### 请求/响应类型分开

```typescript
// features/order/types/order.types.ts

/** 服务端返回的完整 Order */
export interface Order {
  id: string
  title: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  updatedAt: string
}

/** 前端提交的创建请求——不含 id、createdAt 等服务端字段 */
export interface CreateOrderPayload {
  title: string
  category: string
  amount: number
}

/** 查询参数 */
export interface OrderQueryParams {
  status?: OrderStatus
  cursor?: string
  limit?: number
}
```

---

## 十、API 请求函数

```typescript
// features/order/api/order.api.ts
import type { ApiResponse } from '@/types/api.types'
import type { Order, CreateOrderPayload } from '../types/order.types'
import { http } from '@/shared/http'

export const orderApi = {
  fetchList(params: OrderQueryParams): Promise<ApiResponse<Order[]>>
  {
    return http.get('/api/v1/orders', { params })
  },

  getById(id: string): Promise<ApiResponse<Order>>
  {
    return http.get(`/api/v1/orders/${id}`)
  },

  create(payload: CreateOrderPayload): Promise<ApiResponse<Order>>
  {
    return http.post('/api/v1/orders', payload, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
  },

  updateStatus(id: string, status: string): Promise<ApiResponse<Order>>
  {
    return http.patch(`/api/v1/orders/${id}/status`, { status })
  },
}
```

- 不直接在组件或 store 中调 fetch——全部经由 `api/` 层
- API 函数不做 try-catch——错误由调用方 `to()` 消费
- URL 不硬编码——提取到 `constants/api.constants.ts`

---

## 十一、前端消费

```typescript
import { to } from '@/shared/utils/to'
import { orderApi } from '../api/order.api'

async function loadOrders()
{
  const [err, res] = await to(orderApi.fetchList({ page: 1 }))
  if (err || !res || !res.success)
    return

  return res.data
}
```

`to()` 定义（`shared/utils/to.ts`）：

```typescript
export async function to<T>(promise: Promise<T>): Promise<[unknown, T | null]>
{
  try
  {
    return [null, await promise]
  }
  catch (e)
  {
    return [e, null]
  }
}
```

禁止空吞异常。禁止在组件中直接 try-catch 包裹 API 调用。

---

## 自检

- [ ] URL 名词复数、kebab-case、无尾斜杠、≤3 层嵌套？
- [ ] HTTP 方法语义正确？状态码用 4xx/5xx，不 200 包错？
- [ ] 响应统一 `ApiResponse<T>` discriminated union？错误码 string union 前后端共享？
- [ ] 分页选 cursor（实时/大流量）或 offset（后台/<10k）？
- [ ] POST/支付操作有 `Idempotency-Key`？
- [ ] 版本策略定义？废弃 header 有 `Sunset` / `Deprecation`？
- [ ] API 函数在 `features/<domain>/api/`，类型在 `features/<domain>/types/`？
- [ ] 调用方用 `to()` 元组？
- [ ] 有 OpenAPI spec？CI 自动生成类型？
