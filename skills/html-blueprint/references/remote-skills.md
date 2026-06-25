# 远程 Skill 加载协议

html-blueprint 支持按需远程加载外部设计类 skill，无需用户手动安装。首次使用时从 GitHub Raw 拉取核心文件，缓存到本地后复用。

---

## 已配置的远程 Skill

| 名称 | 仓库 | 分支 | 核心文件 | 作用 |
|------|------|------|---------|------|
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | main | `.claude/skills/ui-ux-pro-max/SKILL.md` | 设计系统生成：67 种风格、161 配色、57 字体、99 UX 规则 |
| design-taste-frontend | leonxlnx/taste-skill | main | `skills/taste-skill/SKILL.md` | 品味纠偏：AI TELLS 禁令、三旋钮配置、创意武器库 |

---

## 加载机制

### 触发时机

在以下场景自动触发远程加载：

1. 用户明确要求"专业设计风格"、"高端设计"、"避免 AI 味"
2. 生成 Landing Page、营销页、作品集等视觉要求高的页面
3. 项目首次生成 `tokens.css`，需要设计系统支撑
4. 用户提到特定风格名（glassmorphism、bento、brutalism 等）

### 加载流程

```
检查缓存 → 命中 → 直接读取
    ↓ 未命中
从 GitHub Raw 拉取 → 写入缓存 → 读取使用
```

### 缓存位置

```
<项目根>/.cache/html-blueprint/remote-skills/
├── ui-ux-pro-max/
│   └── SKILL.md
└── design-taste-frontend/
    └── SKILL.md
```

- 缓存有效期：7 天（可手动删除强制更新）
- 缓存目录加入 `.gitignore`

---

## 使用方式

### CLI 加载

```bash
# 加载指定远程 skill
node scripts/fetch-remote-skill.js <skill-name>

# 强制刷新缓存
node scripts/fetch-remote-skill.js <skill-name> --force

# 加载所有已配置的远程 skill
node scripts/fetch-remote-skill.js --all
```

### 在工作流中使用

生成设计稿前，先加载远程设计知识：

1. 判断是否需要专业设计支持
2. 调用 `fetch-remote-skill.js` 加载对应 skill
3. 读取缓存的 SKILL.md，提取设计原则
4. 将设计原则融入 Design Spec 的 visual 部分
5. 生成 HTML 时遵循这些设计原则

---

## 设计系统生成流程

当项目首次需要 `tokens.css` 时，使用远程 skill 生成完整设计系统：

### 输入

- 产品类型（SaaS / 电商 / 作品集 / 仪表盘 等）
- 行业（金融 / 医疗 / 教育 / 科技 等）
- 风格关键词（极简 / 玻璃拟态 / 粗野主义 / 高端 等）
- 目标受众（B2B / B2C / 开发者 / 消费者 等）

### 输出

1. **风格定义**：主风格、辅助风格、设计语言描述
2. **配色方案**：主色、辅助色、语义色（成功/警告/错误）、中性色阶
3. **字体系统**：标题字体、正文字体、等宽字体、字号阶梯
4. **间距系统**：间距刻度、布局间距、组件间距
5. **圆角与阴影**：圆角刻度、阴影层级
6. **动效原则**：动画时长、缓动曲线、交互反馈

### 映射到 tokens.css

将设计系统输出映射为标准 CSS 变量：

```
主色 → --color-primary
主色悬停 → --color-primary-hover
正文字号 → --font-size-base
...
```

映射规则见 [theme-consistency.md](theme-consistency.md) 的标准 Token 清单。

---

## 品味纠偏检查清单

从 design-taste-frontend 提取的核心禁令，生成设计稿后自查：

| 类别 | 禁令 | 替代方案 |
|------|------|---------|
| 字体 | 禁用 Inter 作为"高端"字体 | Geist、Outfit、Cabinet Grotesk、Satoshi |
| 配色 | 禁用 AI 紫/蓝渐变发光 | 中性灰底 + 单一高对比强调色 |
| 布局 | 禁用居中 Hero + 三列等宽卡片 | 左右分栏、Bento Grid、非对称留白 |
| 图标 | 禁用 emoji 作为 UI 图标 | SVG 图标（Heroicons / Lucide / Phosphor） |
| 视觉 | 禁用纯黑 (#000000) | Off-Black、Zinc-950、Charcoal |
| 内容 | 禁用 John Doe / Acme / Nexus 等假名 | 真实感的名字和品牌名 |
| 动效 | 禁用无限循环微动画刷屏 | 克制的进场动画 + 交互反馈 |

---

## 注意事项

1. **网络依赖**：首次加载需要网络，离线时降级为内置默认风格
2. **缓存管理**：缓存目录不提交到 Git，已在 `.gitignore` 中排除
3. **版本锁定**：缓存的是特定 commit 的内容，不会自动更新，需手动 `--force`
4. **降级策略**：远程加载失败时，使用内置的默认设计原则，不阻断主流程
5. **按需加载**：不是每个设计稿都需要远程 skill，简单组件/内部工具可跳过
