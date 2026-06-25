# 认证模块 Session → JWT 变更 Tasks

> 日期: 2026-06-25 | 作者: huyongle | 关联变更 plan: ./plan.md

## 执行任务清单

### T1: 调研 jsonwebtoken 库 API 并更新调研依据
- **目标文件**: `specs/user-auth/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改 spec.md 调研依据章节，调研 jsonwebtoken 的 sign/verify API 用法，将 express-session 替换为 jsonwebtoken
- **需调研**: 是 — 建议调研方式: MCP Context7 查询 jsonwebtoken 官方文档
- **依赖**: 无

### T2: 修改 spec.md 背景与动机章节
- **目标文件**: `specs/user-auth/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改 spec.md 的背景与动机，将 session 认证描述更新为 JWT 无状态认证
- **需调研**: 否
- **依赖**: T1

### T3: 修改 spec.md FR-1 登录需求
- **目标文件**: `specs/user-auth/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改 FR-1 登录功能需求，将"创建 session"改为"签发 JWT token"，补充 token 有效期边界条件
- **需调研**: 否
- **依赖**: T1

### T4: 修改 spec.md FR-2 会话管理需求
- **目标文件**: `specs/user-auth/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改 FR-2 会话管理需求，从 session 列表管理调整为 token 刷新机制
- **需调研**: 否
- **依赖**: T1

### T5: 修改 spec.md 验收标准
- **目标文件**: `specs/user-auth/spec.md`
- **任务类型**: 文档
- **任务描述**: 修改验收标准，将 FR-1 和 FR-2 的验收条件更新为 JWT 相关验收
- **需调研**: 否
- **依赖**: T3, T4

### T6: 重构登录接口为 JWT 签发
- **目标文件**: `src/auth/auth.controller.js`
- **任务类型**: 代码
- **任务描述**: 重构登录接口，移除 session 创建逻辑，改为使用 jsonwebtoken 签发 token 并返回
- **需调研**: 是 — 建议调研方式: MCP Context7 查询 jsonwebtoken sign API
- **依赖**: T1

### T7: 重构认证中间件为 JWT 验证
- **目标文件**: `src/auth/auth.controller.js`
- **任务类型**: 代码
- **任务描述**: 重构 requireAuth 中间件，移除 session 检查，改为从 Authorization Header 提取并验证 JWT token
- **需调研**: 是 — 建议调研方式: MCP Context7 查询 jsonwebtoken verify API
- **依赖**: T6

### T8: 修改登出接口适配 JWT
- **目标文件**: `src/auth/auth.controller.js`
- **任务类型**: 代码
- **任务描述**: 修改登出接口，移除 session destroy 逻辑，改为返回客户端清除 token 的提示响应
- **需调研**: 否
- **依赖**: T6

## 任务依赖图
T1 → T2 → T5
T1 → T3 → T5
T1 → T4 → T5
T1 → T6 → T7
     T6 → T8（并行）
