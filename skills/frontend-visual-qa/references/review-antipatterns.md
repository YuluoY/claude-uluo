# Review 与反模式模块

**加载条件：** 做前端 code review、UI/UX review、或检查已有界面的设计质量时加载。

> 参考：[NN/G — Top 10 Application-Design Mistakes](https://www.nngroup.com/articles/top-10-application-design-mistakes/)（2024 更新版）、[BSWEN — How to Fix AI-Generated UI Designs](https://docs.bswen.com/blog/2026-03-20-ai-generated-ui-anti-patterns/)、[SaaSCity — Avoiding AI Slop in 2026](https://saascity.io/blog/stunning-frontend-designs-vibe-coding-avoid-ai-slop)
> 文案类反模式的详细规则见 `references/copy-rules.md`。颜色/token 类反模式的根因和修复见 `references/tokens.md`。布局纪律见 `references/layout-responsive.md`。

## 目录

- [Review 输出顺序](#review-输出顺序)
- [专业设计语言要求](#专业设计语言要求)
- [反模式速查表](#反模式速查表)
  - [Hero 与头部区域](#hero-与头部区域反模式)
  - [文案](#文案反模式)
  - [布局](#布局反模式)
  - [装饰](#装饰反模式)
  - [数据与内容](#数据与内容反模式)
- [修复优先级](#修复优先级)

---

## Review 输出顺序

做前端 code review 或 UI review 时，先列风险，再给修复方向：

- 一票否决问题。
- 响应式、状态、可访问性、主题/i18n 风险。
- 组件库绕开和重复手写控件。
- tokens 缺失与样式架构漂移。
- 信息层级和视觉噪音问题。

## 专业设计语言要求

Review 不能只说"这里不好看""这里太乱"。每个关键问题都应尽量落到明确的设计原则，并解释它如何影响用户任务：

- 视觉层级：用户是否能立刻看出主内容、主操作和次要信息。
- 对比与视觉重量：强色、字号、字重、边框和阴影是否抢占了错误的注意力。
- 尺度与比例：标题、按钮、卡片、表格密度是否匹配当前界面层级。
- Gestalt 分组：接近性、相似性、共同区域、连续性和图底关系是否帮助用户理解结构。
- 认知负荷：是否同时暴露过多同权重选择，是否让用户猜测状态和下一步。
- 可供性与反馈：可点击、可编辑、可展开、禁用和提交中状态是否清楚。

输出时优先使用"问题 → 原则 → 用户影响 → 修复方向"的句式，避免堆术语。示例：`筛选项和表格贴得过近，破坏 Gestalt 的接近性和共同区域，用户难以判断条件与结果的关系；应把筛选区、结果摘要和表格工具栏分成稳定区域。`

## 反模式速查表

每个反模式的"为什么 AI 容易犯"列解释 AI 相较于人类设计师更容易踩进的陷阱——这是本 skill 区分于一般设计 review 清单的核心认知。

### Hero 与头部区域反模式

| 反模式 | 判定 | 为什么 AI 容易犯 | 修复方向 |
| --- | --- | --- | --- |
| Inter/Roboto 字体默认 | AI 生成界面统一用 Inter 或系统字体 | 训练数据中 Inter 出现频率最高，AI 将其作为"安全默认"——Comic Sans of AI（不是丑，是零思考的标志） | 根据产品场景选择有意图的字体配对；不要求"独特"但必须"有选择" |
| 紫色渐变调色板 | `linear-gradient(135deg, #667eea, #764ba2)` 作为 hero、卡片或按钮背景 | AI 训练数据中紫色渐变 + 暗色背景是最常见的"modern tech"模板签名 | 根据品牌和产品场景选择颜色方向；工具型产品默认中性色 + 单 accent |
| 版本/BETA 标签装饰 | Hero 或头部出现 V0.6、BETA、EARLY ACCESS 等标签 | AI 在生成产品界面时自动加版本标记，模仿 landing page 模板的 launch/preview 模式 | 只有真实产品发布预览场景才需要；否则删除 |
| 装饰性编号 eyebrow | `00 / INDEX`、`001 · Capabilities`、`06 · how it works` 等编号标签 | AI 模仿 agency 作品集中的编号布局模式，不判断它在这个具体界面是否有意义 | 用实际内容名称替代，不要凭空编号 |
| 大气层装饰条 | Hero 底部出现 `BRAND. MOTION. SPATIAL.` 等无功能文字条 | AI 学会了 agency portfolio 网站的装饰 strip 模式，把它当作"看起来 designed 的默认元素" | 只有内容是真实导航链接时保留，否则删除 |
| 地点/天气/时间装饰 | `LIS 14:23 · 18°C`、`Lisbon, working with founders` 等情境标签 | 训练数据中全球分布式工作室的 agency 网站常用这种 locality 装饰 | 只有地点/时区对产品功能有意义时保留 |
| Scroll 提示 | `Scroll`、`↓ scroll`、动画滚动提示 | AI 认为"引导用户"是好的体验，但用户知道什么是滚动 | 用户知道滚动是什么，不需要提示 |
| gradient blob 代替真实视觉 | Hero 只有文字 + 渐变背景，无产品截图/图片/资产 | AI 生成设计时手头没有真实图片，用 CSS gradient 填充视觉空间是最高概率的路径 | 用真实图片、截图或生成资产替换占位 blob |
| "Trusted by" 在 Hero 内 | 社会证明 logo 墙和 Hero 内容挤在同一区域 | AI 把所有"应该存在的元素"塞进 Hero，不分主次 | logo 墙移到 Hero 下方独立 section |
| 两个以上同义 CTA | "Get in touch" + "Contact us" + "Let's talk" 同页面 | AI 给同一个意图生成多个文案变体，不确定用户要哪个 | 同一意图只保留一个标签 |

### 文案反模式

| 反模式 | 判定 | 为什么 AI 容易犯 | 修复方向 |
| --- | --- | --- | --- |
| 错误信息无行动指引 | "出错了"、"Something went wrong" 而非说明问题和下一步 | AI 倾向生成泛化错误文案——模板安全但用户无法据此恢复 | 错误信息三要素：什么问题、什么原因、下一步操作。见 NN/G #3 |
| 假精确数字 | `92%`、`4.1×`、`48k` 不代表任何真实指标 | AI 为填充"数据驱动"观感而编造整齐的数字 | 使用真实数据，或标记为示例占位 |
| 填充动词 | elevate、seamless、unleash、next-gen、revolutionize 等空泛动词 | 训练数据中 marketing copy 占比高，AI 自动填充高频但无意义的动词 | 用具体描述产品实际功能的动词替换。详见 `copy-rules.md` |
| em-dash 装饰 | `—` 在标题、标签、按钮、引文中作为设计元素 | AI 将 em-dash 当作"有文学气息"的排版装饰 | 用逗号、句号、冒号或排版间距替代。详见 `copy-rules.md` |
| 通用人名/公司名 | John Doe、Sarah Chan、Acme、Nexus、SmartFlow 等 | AI 不愿编造可能"违法"的真实名称，退而求其次选最高频占位名 | 使用贴近行业语境的真实感名称。详见 `copy-rules.md` |
| 按钮标签不清晰 | "确定"、"是"、"OK"、"点击这里"——没有独立语义 | AI 用最短、最通用的动词作为按钮标签，忽略按钮在页面上下文中的具体功能 | 按钮标签用 verb + object（"保存修改" beats "确定"） |
| 链接文本无独立意义 | "点击这里"、"了解更多"——脱离上下文无法理解 | AI 不知道屏幕阅读器的 link-out-of-context 模式，按视觉习惯写链接 | 链接文本独立表意（"查看定价方案" 而非 "点击这里"） |
| micro-meta 句式 | eyebrow 下的冗余解释句（"Each of these is a feature we ship today..."） | AI 认为"多解释一句让界面更人性化"，结果变成纯装饰文案 | Eyebrow + Headline + Body 已经足够 |
| 文案语域混乱 | 同一页面混合技术 monospace、编辑散文、营销短句三种语域 | AI 从不同训练数据中随机采样不同 tone，没有统一的 voice 选择 | 一个页面只用一个语域。详见 `copy-rules.md` |

### 布局反模式

| 反模式 | 判定 | 为什么 AI 容易犯 | 修复方向 |
| --- | --- | --- | --- |
| emoji 图标 | UI 中用表情表达状态或操作 | AI 优先选最高频的可视符号，emoji 在训练数据中远比 SVG icon 出现频率高 | 改用项目图标库，并补 accessible name |
| 营销页幻觉 | 工具/后台页面默认生成大 hero 和宣传文案 | AI 无法区分 landing page 和 SaaS 后台——两者在训练数据中都以"web page"出现 | 直接展示真实工作面：表格、表单、详情、图表 |
| 标题描述复读 | 每个路由内容顶部都有重复标题和说明 | AI 默认一个页面"需要一个 title"，不了解 SPA 路由框架中面包屑和 sidebar 已经承担了导航信息 | 见 SKILL.md 一票否决 §10 和 `layout-responsive.md` §五 |
| 卡片泛滥 | 页面所有区域都包 card，甚至 card 套 card | AI 把 card 当成"组织内容的默认容器"——训练数据中 card 是最常见的 UI 容器模式 | 用布局、间距、分组和边界线建立层级 |
| 同一布局家族反复使用 | 8 个 section 中 6 个用同一个 image+text split 布局 | AI 一旦找到一个"work"的布局就重复使用，没有跨 section 的布局多样性意识 | 每种布局家族最多用一次 |
| side-stripe 边框 | `border-left` > 1px 作为卡片/列表/提示的彩色强调 | AI 想在"普通容器"上加一点点 decoration 但不破坏 layout，side-stripe 是训练数据中最高频的低入侵装饰 | 含背景色、前导数字/图标，或完全去掉 |
| 固定卡片尺寸 | 固定宽高导致文案变长或窄屏时溢出 | AI 按当前数据预估尺寸设固定值，不考虑数据变化和响应式 | 使用弹性 flex/grid，设 min/max 不设固定值 |
| zigzag 交替连续 3 段 | 连续 3 个 section 都是左图右文交替 | AI 产生了一个 work 的 section pattern 后无法自主打破——没有"variety"要求 | 最多连续 2 段后换一种布局 |
| 弱可供性 | 用户看不出什么元素可点击——过于扁平的界面没有 visual affordance | AI 倾向于生成"干净"的现代扁平界面，移除边框、阴影、色彩区分后只剩下文字 | 可交互元素必须有明确的视觉线索（下划线、颜色区分、光标变化、足够的点击区域 >44x44px） |
| 模态窗滥用 | 新建、编辑、确认都用 modal | AI 把 modal 当作"隔离操作"的默认方案，没有评估用户的上下文需求 | 先尝试内联编辑、抽屉或原地展开；modal 只用于不参考底层信息的短操作 |
| 图标无文字标签 | 纯图标按钮、纯图标导航项没有可见文字 | AI 认为"图标自解释"——但研究证明极少数图标能被所有用户正确理解（NN/G #5） | 图标始终配文字标签；增大点击区域（Fitts' Law）；加速识别 |
| 破坏性操作紧邻确认 | Save 和 Discard、Confirm 和 Cancel 并列无间距 | AI 按"逻辑分组"把相关的操作排在一起，不考虑重复操作中的 slip 风险（NN/G #10） | 物理和视觉上分离破坏性操作和确认操作；关键操作加确认步骤 |

### 装饰反模式

| 反模式 | 判定 | 为什么 AI 容易犯 | 修复方向 |
| --- | --- | --- | --- |
| 彩色噪音 | 大量渐变、彩边、强阴影、亮色互抢 | AI 把"有颜色"等同于"有设计"，用 color diversity 代替 hierarchy | 回到角色化颜色和中性层级。见 `tokens.md` §颜色策略选择 |
| gradient text | `background-clip: text` + gradient 装饰标题 | AI 把 gradient text 当作"给文字加视觉趣味"的简便手段 | 用单一实色，靠字重和字号表达层级 |
| glassmorphism 默认 | 不做选择就把毛玻璃效果作为默认容器样式 | AI 在训练数据中看到"blur = premium"模式，不加判断地应用到任何界面 | 只有明确的品牌/媒体场景中使用，并提供纯色降级 |
| shadcn/ui 不定制默认态 | 引入 shadcn 直接用默认 radii/colors/shadows 和主题 | AI 走最短路径——安装就是完成，不把它改到匹配项目 | 定制 radii、colors、shadows、typography 到项目审美 |
| decorative dots | 导航、列表行、badge 前出现无意义的彩色圆点 | AI 想给 otherwise plain 的元素添加"状态感" | 只有表达实际状态（在线/运行/报警）时保留 |
| pills/labels 覆盖图片 | 图片上叠加 `Brand · 02`、`Field notes` 等标签 | AI 模仿 magazine layout，在图片上叠分类标签 | 要么让图片自己说话，要么把说明放在图片下方 |
| 手搓基础控件 | 有组件库仍自写按钮、输入框、表格、弹层 | AI 不主动扫描项目依赖，直接输出最高频的"from scratch"实现 | 使用项目已有组件库或明确引入 |
| 无 tokens | 页面样式散写 hex、px、shadow、radius | AI 从零开始在每行写具体值，不了解 token 体系概念 | 建立 tokens 后再写页面。见 `tokens.md` |
| 固定宽高 | 文案、数据、窄屏或弹层一变就溢出 | AI 按当前上下文设固定 px 值，不考虑内容变化和不同视口 | 使用弹性布局、min/max 和响应式策略 |

### 数据与内容反模式

| 反模式 | 判定 | 为什么 AI 容易犯 | 修复方向 |
| --- | --- | --- | --- |
| 状态缺失 | 只有默认成功态，没有 loading/error/empty/disabled/focus | AI 优先实现"正常流程"UI；异常和等待状态在训练数据中出现比例远低于正常态 | 补齐组件状态和页面状态。代码实现见 uluo `ui-states.md` 四态模型 |
| i18n 破版 | 英文或中文写死宽度，长文案无法容纳 | AI 按当前语言计算容器尺寸，不了解 i18n 文本膨胀 | 使用弹性容器、预留 30-40% 宽度、完整 message key。见 `i18n-accessibility.md` |
| 主题不可切换 | 颜色硬编码，暗色/主题色切换崩坏 | AI 直接写 hex 颜色在组件中，不通过 token 间接引用 | 语义化 token + 主题重映射。见 `tokens.md` §五 |
| 无内容密度意识 | 10+ 行规格表每条加 border-b、每条独立占一行 | AI 把任何数据都当作"列表"——没有信息分组的本能 | 分组归类，用卡片或折叠面板替代长表 |
| 无默认值 | 下拉框默认"请选择"而非预选最常见选项 | AI 避免"替用户做决定"，但增加所有用户的交互成本（NN/G #4） | 用分析数据预设最常见选项；数字字段用 stepper 围绕真实默认值 |
| 信息无意义 | UUID、数据库 ID、错误码作为界面主标识 | AI 直接把后端字段映射到 UI，不做面向人类的语义转换（NN/G #8） | 人类可读的信息作为主锚点；机器标识推到次要位置 |
| 数据堆在 Hero | 定价预告、注册人数、特性清单、社会证明全塞在 Hero | AI 不确定这些内容该放在哪里，hero 是唯一"确定存在"的 section | 数据移到各自专属 section |
| 进度条/评分条当装饰 | 无实际含义的填充进度条用于对比展示 | AI 把 data visualization 模式当作 decoration 使用 | 用数字 + 小图标替代，或去掉轨道背景 |

## 修复优先级

1. 先修一票否决项（见 SKILL.md §一票否决项）。
2. 再修响应式、状态覆盖、可访问性、主题/i18n——这些影响"能不能用"。
3. 再修组件库一致性和 tokens——影响"能不能维护"。
4. 最后修视觉细节、动效和精致度——影响"好不好看"。
