# 认证模块 Session → JWT 变更 Spec

> 日期: 2026-06-25 | 作者: huyongle | 变更编号: CHG-001 | 关联特性: specs/user-auth/

## 变更背景

### 变更触发原因
当前认证模块基于 express-session 实现服务端 session 认证，session 数据存储在内存中。水平扩展时多实例间 session 不共享，跨域场景下 cookie 配置复杂，移动端 App 难以维护 cookie。需要迁移到无状态 JWT 认证以支持多端和水平扩展。

### 变更目标
将登录、登出、认证中间件从 session 机制改为 JWT 机制，移除 express-session 依赖，引入 jsonwebtoken，实现无状态认证。

## 影响范围

### 文档影响
| 文档 | 章节 | 影响类型 | 风险等级 | 说明 |
|------|------|---------|---------|------|
| spec.md | ## 背景与动机 | MODIFIED | 中 | 当前描述使用 session 认证，需更新为 JWT 认证 |
| spec.md | ## 功能需求 > FR-1 | MODIFIED | 高 | 登录行为从创建 session 改为签发 JWT token |
| spec.md | ## 功能需求 > FR-2 | MODIFIED | 高 | 会话管理依赖服务端 session 列表，JWT 无状态需重新定义 |
| spec.md | ## 验收标准 | MODIFIED | 中 | 验收标准需同步更新为 JWT 相关验收 |
| spec.md | ## 调研依据 > 技术可行性 | MODIFIED | 中 | express-session 调研项替换为 jsonwebtoken |

### 代码影响
| 模块 | 影响类型 | 风险等级 | 说明 |
|------|---------|---------|------|
| auth 模块 | MODIFIED | 高 | 登录/登出/认证中间件核心逻辑全量改写，影响所有受保护接口 |
| session 依赖 | REMOVED | 中 | 移除 express-session 引入及 session 中间件挂载 |
| JWT 依赖 | ADDED | 低 | 新增 jsonwebtoken 引入及签发/校验调用 |

### 设计稿影响
无设计稿影响（本变更不涉及 UI 变更）。

## 决策结论

- **决策**: 批准
- **理由**: JWT 认证解决水平扩展和跨域问题，变更范围明确限于 auth 模块，风险可控。方案 A（纯 JWT 无状态）复杂度低，主动失效问题可通过短期有效期加刷新机制缓解。
