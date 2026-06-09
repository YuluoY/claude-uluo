# 安全规范

**加载条件：** 项目启动、涉及认证/授权、处理敏感数据时加载。

> 参考：[OWASP Top 10](https://owasp.org/www-project-top-ten/)、[web.dev/security](https://web.dev/security/)
> 可访问性安全相关见 `references/accessibility.md`。

---

## 目录

- [XSS（跨站脚本）](#xss)
  - [禁止裸渲染用户输入](#no-raw-user-input)
  - [必须渲染 HTML 时](#when-html-is-required)
  - [CSP（Content Security Policy）](#csp)
  - [Trusted Types](#trusted-types)
- [CSRF（跨站请求伪造）](#csrf)
  - [Cookie 层防护](#cookie-protection)
  - [Token 层防护](#token-protection)
- [认证](#authentication)
  - [Token 存储](#token-storage)
  - [JWT 防坑](#jwt-pitfalls)
  - [OAuth 2.0 + PKCE](#oauth-20-pkce)
  - [Passkeys（WebAuthn）](#passkeys)
- [供应链安全](#supply-chain-security)
  - [依赖审计](#dependency-audit)
  - [SRI（子资源完整性）](#sri)
  - [不泄露的环境变量](#no-leaked-env-vars)
- [敏感信息](#sensitive-data)
- [安全响应头](#security-headers)
- [CORS](#cors)
- [上传文件](#file-upload)
- [自检](#self-check)

## XSS（跨站脚本）

### 禁止裸渲染用户输入

React/Vue 默认转义，但这几个 API 绕过了保护：

```typescript
// ❌ 直接渲染用户内容
<div dangerouslySetInnerHTML={{ __html: userInput }} />
<div v-html="userInput" />

// ✅ textContent 或框架默认插值——自动转义
<div>{userInput}</div>
<div>{{ userInput }}</div>
```

### 必须渲染 HTML 时

先过 [DOMPurify](https://github.com/cure53/DOMPurify)：

```typescript
import DOMPurify from 'dompurify'

const clean = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href'],
})
```

或用浏览器原生 Sanitizer API（Chrome 119+）：

```typescript
element.setHTML(cleanHtml)
```

### CSP（Content Security Policy）

兜底防线——即使 XSS 注入成功，CSP 阻止脚本执行：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'none';
  object-src 'none';
```

- `strict-dynamic`：nonce 过的脚本及它加载的依赖都信任，不需要白名单维护
- **不用 `unsafe-inline`**
- CSP 违规报告接入 Sentry/错误追踪，早发现攻击

### Trusted Types

浏览器运行时的 DOM XSS 类型检查：

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types default dompurify
```

启用后 `innerHTML = x` 只接受 `TrustedHTML` 对象——裸字符串赋值被浏览器阻断。

---

## CSRF（跨站请求伪造）

### Cookie 层防护

```
Set-Cookie: session=...; Secure; HttpOnly; SameSite=Lax; Path=/
```

- `SameSite=Lax`（浏览器默认）——大多数 CSRF 已失效
- `SameSite=Strict`——不允许跨站携带 cookie（注意：用户从外部链接点进来会丢失登录态）
- 基于 JWT（Authorization header）的 API 不适用 CSRF——但 XSS 窃取 token 的风险仍存在

### Token 层防护

```typescript
// 服务端生成 token，前端在表单中携带
fetch('/api/action', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'same-origin',
})
```

- 双提交 cookie 模式：token 既在 cookie 中、又在请求 header 中
- 服务端校验 Origin / Referer header

---

## 认证

### Token 存储

| 存储位置 | XSS 风险 | 适用 |
|----------|:---:|------|
| httpOnly cookie | ✅ 安全 | 首选 |
| 内存（闭包/变量） | ✅ 安全（页面刷新生效则失效） | SPA + silent refresh |
| sessionStorage | ⚠️ XSS 可读 | 比 localStorage 略好（标签页隔离） |
| **localStorage** | ❌ XSS 直接偷 | **禁止** |

### JWT 防坑

1. **不存 localStorage**
2. **短有效期**（5–15min）+ refresh token 轮换
3. **非对称签名**（RS256/ES256），不比用 HS256 弱密钥
4. **验证 `aud` 和 `iss`**——token 可能跨服务混用
5. **检查库不接收 `alg: none`**

### OAuth 2.0 + PKCE

SPA 必须用 PKCE，弃用 implicit flow：

```
Client → /authorize?code_challenge=S256(random)
IdP → redirect back with code
Client → /token with code + code_verifier
```

### Passkeys（WebAuthn）

2024 年起 Apple/Google/Microsoft 跨平台同步 passkey。新项目默认 passkey-first：

```typescript
// 注册
const credential = await navigator.credentials.create({ publicKey })

// 登录
const assertion = await navigator.credentials.get({ publicKey })
```

Passkey 天生防钓鱼（域名绑定，不存在"输错网站"的问题）。

---

## 供应链安全

### 依赖审计

```bash
pnpm audit                    # 已知漏洞扫描
pnpm outdated                 # 过时依赖
```

- CI 中 `pnpm audit --audit-level=high` 阻断高危漏洞
- Dependabot / Renovate 自动提 PR 更新
- 不引入长期未维护的依赖
- `pnpm-lock.yaml` 提交到 Git，CI 用 `pnpm install --frozen-lockfile`

### SRI（子资源完整性）

CDN 脚本必须带 `integrity` hash——即使 CDN 被攻破，浏览器拒绝加载篡改的文件：

```html
<script src="https://cdn.com/lib.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"></script>
```

用 `openssl dgst -sha384 -binary lib.js | base64` 生成 hash。

### 不泄露的环境变量

`NEXT_PUBLIC_*` / `REACT_APP_*` / `VITE_*` 前缀的变量**打进客户端 bundle**——任何人都能读：

```bash
# ❌ 永远不要让这些出现在客户端
NEXT_PUBLIC_API_KEY=sk-xxx          # API 密钥暴露！
NEXT_PUBLIC_DATABASE_URL=...        # 数据库地址暴露！

# ✅ 客户端可以暴露的
VITE_APP_NAME=MyApp                 # 应用名
VITE_API_BASE_URL=https://api.com   # API 域名（公开信息）
```

---

## 敏感信息

| 泄露渠道 | 防御 |
|----------|------|
| 客户端 bundle | 没有 `NEXT_PUBLIC_` / `REACT_APP_` / `VITE_` 密钥 |
| `console.log` | eslint `no-console` 阻断生产（warn → error） |
| Source Maps 生产 | `hidden-source-map`，只上传到 Sentry |
| URL query string | token/密码不进 URL——会进日志、Referer、浏览器历史 |
| localStorage | 不存敏感数据（XSS 可读） |
| 错误消息 | 用户侧通用提示，完整堆栈只在日志 |
| 日志 | 脱敏：Token、密码、身份证号、手机号不写明文 |

---

## 安全响应头

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), microphone=()
Cross-Origin-Opener-Policy: same-origin
```

- 用 [securityheaders.com](https://securityheaders.com) 扫描评级
- HSTS preload：提交到 [hstspreload.org](https://hstspreload.org) 进浏览器内置名单

---

## CORS

```typescript
// ❌ 通配符 + 凭据
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

// ✅ 特定域名 + 不带凭据（首选同源）
Access-Control-Allow-Origin: https://app.example.com
```

- CORS 不是服务端安全机制——浏览器策略保护的是**用户**
- 服务端仍需鉴权每个请求
- 不用 `Access-Control-Allow-Origin: *` 加 `Allow-Credentials`
- `postMessage` 必须校验 `event.origin`

---

## 上传文件

- 前端校验类型和大小——**仅 UX，不视为安全**
- 后端必须再次校验 MIME 类型、文件头魔数、大小上限
- 上传目录不可执行（不放在 web root）

---

## 自检

- [ ] 无 `dangerouslySetInnerHTML` / `v-html` 裸渲染用户输入？DOMPurify？
- [ ] CSP header 已配置？`strict-dynamic` + nonce？无 `unsafe-inline`？
- [ ] 会话 cookie `Secure; HttpOnly; SameSite=Lax`？
- [ ] Token 不在 localStorage？JWT 短有效期 + refresh 轮换？
- [ ] CDN 脚本有 SRI？`pnpm audit` CI 门槛？
- [ ] 无 `NEXT_PUBLIC_` / `REACT_APP_` / `VITE_` 密钥？
- [ ] 安全响应头 A+？（securityheaders.com）
- [ ] CORS 用特定域名不用 `*`？
- [ ] Source Maps 生产环境非公开？
- [ ] `.env` 在 `.gitignore`？`pnpm-lock.yaml` 提交了？
