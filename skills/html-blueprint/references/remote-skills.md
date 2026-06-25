# 远程设计 Skill 加载协议

html-blueprint 通过 `npx skills add` 从 skills.sh 远程拉取外部设计类 skill，安装到项目本地 `.agents/skills/` 目录。已安装则跳过，无需重复拉取。

---

## 已配置的远程 Skill

| 名称 | 仓库 | install name | 作用 |
|------|------|-------------|------|
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | `ui-ux-pro-max` | 设计系统生成：67 种风格、161 配色、57 字体、99 UX 规则 |
| design-taste-frontend | leonxlnx/taste-skill | `design-taste-frontend` | 品味纠偏：AI TELLS 禁令、三旋钮配置、创意武器库 |

手动安装命令：

```bash
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -y
npx skills add leonxlnx/taste-skill --skill design-taste-frontend -y
```

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
检查 .agents/skills/<name>/SKILL.md → 存在 → 直接读取使用
    ↓ 不存在
调用 npx skills add 拉取 → 安装到 .agents/skills/ → 读取使用
```

### 安装位置

```
<项目根>/.agents/skills/
├── ui-ux-pro-max/
│   ├── SKILL.md
│   ├── data/          ← CSV 数据库（styles/colors/typography 等）
│   └── scripts/       ← 辅助脚本
└── design-taste-frontend/
    └── SKILL.md
```

通过 `skills-lock.json` 锁定版本，不会自动更新。

### 升级方式

```bash
# 强制重新安装（先卸载再安装）
node scripts/_shared/load.js <skill-name> --force

# 或直接用 npx skills update
npx skills update
```

---

## 使用方式

### CLI 加载

```bash
# 加载指定远程 skill（已安装则跳过）
node scripts/_shared/load.js <skill-name>

# 加载所有已配置的远程 skill
node scripts/_shared/load.js --all

# 查看可用列表和安装状态
node scripts/_shared/load.js --list

# 强制重新安装
node scripts/_shared/load.js <skill-name> --force
```

### 在工作流中使用

生成设计稿前，先加载远程设计知识：

1. 判断是否需要专业设计支持（见触发时机）
2. 调用 `_shared/load.js` 安装/确认远程 skill
3. 读取 `.agents/skills/<name>/SKILL.md`，提取设计原则
4. 将设计原则融入 Design Spec 的 `visual` 部分
5. 生成 HTML 和 tokens.css 时遵循这些设计原则

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

| 设计系统项 | CSS 变量 |
|-----------|---------|
| 主色 | `--color-primary` |
| 主色悬停 | `--color-primary-hover` |
| 正文文字 | `--color-text-primary` |
| 次要文字 | `--color-text-secondary` |
| 页面背景 | `--color-bg-page` |
| 卡片背景 | `--color-bg-surface` |
| 成功/警告/错误色 | `--color-success` / `--color-warning` / `--color-error` |
| 正文字号 | `--font-size-base` |
| 标题字体 | `--font-family-heading` |
| 正文字体 | `--font-family-body` |

映射规则详见 [theme-consistency.md](theme-consistency.md)。

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

### 三旋钮配置

| 旋钮 | 范围 | 影响 |
|------|------|------|
| DESIGN_VARIANCE | 1-10 | 布局实验程度。低=居中/干净，高=非对称/现代 |
| MOTION_INTENSITY | 1-10 | 动画深度。低=hover 反馈，高=滚动/磁吸/视差 |
| VISUAL_DENSITY | 1-10 | 信息密度。低=宽松留白，高=数据密集仪表盘 |

---

## 注意事项

1. **前置依赖**：需要 Node.js / npx 环境
2. **网络依赖**：首次安装需要网络，已安装后离线可用
3. **版本锁定**：通过 `skills-lock.json` 锁定版本，不会自动更新
4. **不提交 Git**：`.agents/` 目录建议加入 `.gitignore`（与 `node_modules` 同理）
5. **按需加载**：不是每个设计稿都需要远程 skill，简单组件/内部工具可跳过
6. **降级策略**：npx 不可用或网络失败时，使用内置默认风格，不阻断主流程
