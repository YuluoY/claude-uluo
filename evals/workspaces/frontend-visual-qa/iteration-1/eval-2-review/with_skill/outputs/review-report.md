# 前端 UI 设计审查报告

> 审查依据：`frontend-ui-aesthetics` skill — SKILL.md 一票否决项 + review-antipatterns.md 反模式速查表

---

## 一、一票否决项（硬失败，必须修正）

### 1.1 Emoji 充当 UI 图标（✅❌🔥）

**问题：** 页面使用 emoji 作为状态图标（成功 ✅、失败 ❌、热门 🔥），而非项目图标库。

**原则：** Emoji 在不同操作系统/平台上渲染效果截然不同（Apple vs Windows vs Android），无法保证视觉一致性，且没有 accessible name，屏幕阅读器会读出"check mark button"、"cross mark"、"fire"等不可预期文本。

**用户影响：**
- 跨平台图标不一致，用户对状态的视觉映射产生歧义
- 视障用户通过屏幕阅读器获得的是混乱的 emoji Unicode 描述，无法判断实际状态含义
- emoji 无法像 SVG icon 一样控制尺寸、颜色、stroke-width，无法融入设计系统

**修复方向：**
- 立即替换 emoji 为项目图标库的语义化图标（如 Heroicons 的 `CheckCircleIcon` / `XCircleIcon` / `FireIcon` 或等效图标）
- 每个图标设置 `aria-label`（如"操作成功""操作失败""热门内容"）
- 若项目尚无图标库，优先引入成熟方案（Heroicons、Lucide、Phosphor）而非自绘 SVG

**对应 skill 规则：** SKILL.md 一票否决项第 1 条；review-antipatterns.md 布局反模式 §emoji 图标

---

### 1.2 组件库绕开——手写 Button、Input 等基础控件

**问题：** 按钮和输入框全部手写 CSS 实现，绕过项目已有组件库。

**原则：** 项目引入组件库的目的是保证交互一致性、可访问性内置支持（focus ring、keyboard navigation、ARIA 属性）和主题可维护性。手写基础控件等于放弃这些保障，且每个开发者手写的按钮不可能保持一致。

**用户影响：**
- 按钮在页面不同位置的 hover/active/focus/disabled 表现不一致，用户对"什么是按钮"的判断成本升高（违背 UX 规律 — Jakob's Law）
- 手写 input 缺少内置校验状态、错误文案关联、focus 管理，表单可用性下降
- 每次改主色必须全局搜索替换，维护成本线性增长
- 快捷键和屏幕阅读器行为不可预期——组件库通常已处理这些，手写版本全未覆盖

**修复方向：**
- 扫描项目 `package.json` 识别已有组件库（Ant Design / Element Plus / shadcn/ui / MUI 等）
- 将所有手写 Button 替换为组件库 Button，统一 variant（primary/secondary/outline/ghost）、size（sm/md/lg）、状态（loading/disabled）
- 将所有手写 Input/Select 替换为组件库对应控件，确保 label 关联、校验态、clearable 等内置能力
- 若项目确实没有组件库，引入成熟方案后再做页面，不复用手写控件

**对应 skill 规则：** SKILL.md 一票否决项第 5 条；review-antipatterns.md 装饰反模式 §手搓基础控件

---

### 1.3 Design Tokens 缺失——#ff6600 硬编码散落各处

**问题：** `#ff6600` 直接写在组件样式中，没有经过 token 体系抽象。页面级样式中出现裸 hex 值。

**原则：** Token 体系（Primitive → Semantic → Component）是视觉一致性的地基。裸 hex 值散落意味着：① 改一个主色需要全局搜索替换，且可能遗漏；② 主题切换（暗色模式）无法实现；③ AI 或其他开发者每次写样式时都在从调色板里随意挑选，无法保证一致性。

**用户影响：**
- 长期来看页面出现同一色相不同饱和度的"近似色漂移"——这个页面的 orange 和那个页面的 orange 肉眼差距不大但确确实实不一样，视觉品质感下降
- 暗色模式下 `#ff6600` 在深色背景上对比度不足（WCAG AA 要求 4.5:1），文字不可读
- 换品牌色或做多租户主题时工作量指数级增长

**修复方向：**
- 立即建立最少起步集 token（见 `tokens.md` §六）：
  - Primitive 层：定义 `orange-500: #ff6600` 及其 hover/active 变体（orange-400, orange-600）
  - Semantic 层：`color-action-primary → {orange-500}`、`color-action-primary-hover → {orange-600}`、`color-feedback-error → {red-500}`、`color-feedback-success → {green-500}` 等
  - 页面级样式只引用 semantic token（`var(--color-action-primary)`），不引用 primitive 更不引用裸值
- 运行 `node scripts/validate-all.js <files>` 检查是否存在裸 hex 值
- 颜色策略选 Restrained（工具型产品默认）：中性色承担结构，`#ff6600` 仅用于主操作、选中态和状态指示

**对应 skill 规则：** SKILL.md 一票否决项第 4 条；tokens.md §一（AI 生成代码的 token 必要性）；review-antipatterns.md 装饰反模式 §无 tokens

---

### 1.4 无移动端适配

**问题：** 页面没有响应式设计，窄屏下必然出现横向溢出、内容裁切或元素重叠。

**原则：** WCAG 2.2 1.4.10 Reflow 要求内容在 320px CSS 宽度下可用且无横向滚动。工具型产品移动端使用场景普遍（现场巡检、移动审批、快速查询）。

**用户影响：**
- 手机用户看到的是"mini 桌面版"——需要双指缩放 + 横向拖拽才能操作，触摸目标小到无法点击（低于 44x44px 最小触摸区域）
- 固定 320px 卡片在 375px 手机屏上虽然不溢出，但在 320px 小屏上撑破视口；在 768px 平板上一行只放一个卡片浪费空间
- 表单控件在移动端缩放后不可操作——手写 input 没有 `inputmode`、没有移动端友好的键盘类型

**修复方向：**
- 基础样式改为移动优先（mobile-first CSS）：base 样式 = 移动端，通过 `min-width` media query 逐步叠加桌面增强
- 卡片采用流体网格：`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` 替代固定 320px
- 使用 Container Queries 让卡片根据自身容器宽度自适应（侧栏开/关、不同列宽场景）
- 所有交互元素触摸目标 ≥ 44x44px，间距 ≥ 8px
- 断点参考：768px（tablet）、1024px（侧栏出现）、1280px（内容区上限）
- 验收：320px / 375px / 768px / 1024px / 1440px 五个视口均无横向溢出

**对应 skill 规则：** SKILL.md 一票否决项第 2 条；layout-responsive.md §七（响应式实现）§八（视口验收）

---

### 1.5 缺失关键状态——无 loading / error / empty 处理

**问题：** 页面只实现了"正常数据展示"的默认成功态，没有 loading、error、empty 等状态覆盖。

**原则：** 系统状态可见性是 NN/G 十大可用性启发式的第一条——用户必须始终知道系统正在做什么、处于什么状态。异常和等待状态不是"边缘情况"——它们是用户日常体验的组成部分。

**用户影响：**
- 网络延迟时页面空白或停留在旧数据——用户不知道系统是否收到了请求、是在加载还是卡死了
- 接口报错时页面静默失败——用户看到空白列表以为没有数据，实际是权限问题或服务异常
- 新用户首次进入看到完全空白的表格/列表——不知道是系统未配置还是真的没有数据，缺乏 onboarding 引导
- 没有 loading 态 = 没有 CLS 防护——数据加载完成后突然出现的内容会把用户正在看的内容挤走

**修复方向：**
- 每个数据驱动的区域实现四态模型：
  - **Loading**：骨架屏（skeleton）或 spinner + 文案（"正在加载…"），不能用空白页面
  - **Empty**：区分"暂无数据"（插图 + "还没有内容，去创建第一个吧" + CTA）和"搜索无结果"（插图 + "没有匹配结果，试试调整筛选条件"）
  - **Error**：区分网络错误（"网络连接失败，点击重试" + 重试按钮）和业务错误（"你没有权限访问此数据，联系管理员"）
  - **Success**：正常数据展示（当前已有）
- 按钮操作加上 loading 态（提交中禁用 + spinner）、disabled 态（条件不满足时置灰并给出 why）
- 禁用态不能只变灰——必须通过 tooltip 或辅助文案解释为什么禁用、下一步做什么

**对应 skill 规则：** SKILL.md 一票否决项第 7 条；design-foundations.md §八（可供性与反馈）；review-antipatterns.md 数据与内容反模式 §状态缺失

---

### 1.6 无暗色模式支持——颜色硬编码导致主题无法切换

**问题：** `#ff6600` 及其他硬编码颜色在暗色模式下对比度崩溃，且架构上不支持主题切换。

**原则：** `prefers-color-scheme` 是 a11y 特性而非"好看选项"——暗色模式对光敏感用户和低光环境使用者是刚需。主题切换机制是 semantic token 层重映射，不是给组件写两套样式。

**用户影响：**
- 用户在系统级设置了暗色模式，打开页面被亮色闪瞎——要么忍受，要么离开
- 硬编码 `#ff6600` 在 `#ffffff` 背景上对比度 OK（约 4.8:1 勉强 AA），但在 `#1a1a1a` 暗色背景上对比度骤降至约 3.5:1，不满足 WCAG AA 4.5:1 要求
- 后期追加热色模式时工作量等于重写全部样式

**修复方向：**
- 第一步：建立 semantic token 层（见 1.3），所有颜色引用改为 `var(--color-*)`
- 第二步：为每个 semantic token 提供暗色模式映射——同一个 `color-text-primary`，亮色指向 `gray-900`，暗色指向 `gray-100`
- 第三步：用 CSS 媒体查询 `prefers-color-scheme: dark` 作为默认值，提供手动 toggle 但不覆盖系统偏好
- 同时处理 `prefers-reduced-motion`、`prefers-contrast`、`prefers-reduced-transparency` 三个用户偏好查询

**对应 skill 规则：** SKILL.md 一票否决项第 8 条；i18n-accessibility.md §二（用户偏好媒体查询）；tokens.md §五（主题切换机制）

---

## 二、响应式 / 状态 / 可访问性风险

### 2.1 固定 320px 卡片宽度

**问题：** 所有卡片硬编码 `width: 320px`，不随容器或视口自适应。

**原则：** Gestalt 相似性——同一页面内的卡片应保持视觉一致性，但它们的容器应弹性适配可用空间。固定宽度的容器在内容变化（文案变长、数据增多、多语言膨胀）和视口变化（手机、平板、宽屏）时必然破版。

**用户影响：**
- 320px 卡片在 375px 手机上勉强放得下但撑满屏幕，在 768px 平板上只放两个就浪费中间大量空白，在 1440px 桌面上虽能放四个但每行间距不可控
- 文案变长（i18n 德语 +30%）时内容溢出卡片边界，文本被截断或撑破布局
- 卡片内部元素无法 flex 自适应——按钮、标签、文本在窄空间下互相挤压

**修复方向：**
- 卡片宽度改为 `min-width: 280px` + `max-width: 100%`，配合 `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
- 同一行卡片高度通过 `align-items: stretch` 或 CSS Grid 的 `grid-template-rows` 保持一致
- 卡片内部使用 flex/grid 弹性布局，不给内部子元素设固定 px 宽度
- 用 Container Queries 实现组件级响应：`container-type: inline-size` 让卡片按自身容器宽度决策

**对应 skill 规则：** review-antipatterns.md 布局反模式 §固定卡片尺寸

---

### 2.2 无 Loading/Error/Empty 状态（详见一票否决 1.5）

已在 1.5 中详述。此处强调：状态的缺失不仅是"不完善"——它是用户体验的断裂点。用户遇到 loading/error/empty 的频率远高于产品团队的预期。

---

### 2.3 暗色模式不可用（详见一票否决 1.6）

已在 1.6 中详述。

---

### 2.4 可访问性：Emoji 图标无替代文本

**问题：** 即 1.1 的延伸——emoji 作为状态图标时，屏幕阅读器会读出不可预期的 Unicode 描述，且 emoji 无法通过 `aria-label` 赋予语义。

**用户影响：** 视障用户听到的是"fire""check mark button""cross mark"，无法判断它们是状态指示、操作按钮还是装饰元素。

**修复方向：**
- 替换为语义化 SVG icon + `aria-label`
- 若状态图标用于交互元素（如可点击的筛选），确保 focus 可见、键盘可操作

---

### 2.5 交互元素可能缺乏 focus 样式

**问题：** 手写按钮和输入框大概率没有实现 focus ring（`:focus-visible` 样式）。

**原则：** WCAG 2.2 2.4.7 Focus Visible 要求键盘焦点必须清晰可见。手写控件默认只有浏览器原生 outline（各浏览器不一致），通常被 AI 用 `outline: none` 移除后没有替代。

**用户影响：** 键盘用户（包括运动障碍用户和高级用户）无法判断当前聚焦在哪个元素，无法完成表单填写、列表导航等核心任务。

**修复方向：**
- 使用组件库的 focus 管理（已内置 `:focus-visible` 样式）
- 若必须自定义，用 `:focus-visible` + 2px offset ring 提供统一焦点指示
- 确保 sticky header 不遮挡聚焦元素（`scroll-padding-top`）

---

## 三、组件库一致性 / Tokens

### 3.1 手写基础控件（详见一票否决 1.2）

已在 1.2 中详述。

### 3.2 Design Tokens 缺失（详见一票否决 1.3）

已在 1.3 中详述。

### 3.3 样式架构漂移——每处按钮都是独立实现

**问题：** 即便手写按钮在视觉上看起来一样，它们是多个独立的 CSS 代码块，彼此没有共享样式来源。这导致修改一个按钮样式时无法保证所有按钮同步更新。

**用户影响：**
- 视觉一致性随时间推移必然崩坏——某个开发者在 A 页面改了点 padding，B 页面改了点 border-radius，六个月后页面上有 3-4 种"看起来一样但其实不一样"的按钮
- 品牌色 #ff6600 改成 #ff5500 时，逐个文件搜索替换必然遗漏

**修复方向：**
- 组件库方案：组件库统一管理 variant 和 size，一处改全局生效
- Token 方案：按钮样式引用 semantic token（`background: var(--color-action-primary)`），改 token 值 = 所有按钮同步

---

## 四、信息层级与视觉噪音

### 4.1 卡片泛滥——全局统一 320px 卡片容器

**问题：** 页面所有内容区域都包在固定尺寸的卡片里。

**原则：** 卡片是"同类对象集体呈现"的容器——不是"所有内容的默认容器"。不同类型的区域应当通过布局、间距、分组和边界线表达层级差异，而非一股脑装进卡片（review-antipatterns.md 布局反模式 §卡片泛滥）。

**用户影响：**
- 卡片套卡片导致视觉层级扁平——所有内容看起来是同一层级，用户无法区分主内容、辅助信息和操作区域
- 信息密度低——卡片 padding + 间距吃掉大量可用空间，实际工作面被压缩
- 用户扫读效率下降——每个卡片都有相同的视觉重量，没有入口能引导视线

**修复方向：**
- 区分"需要卡片承载的内容"（同类对象列表项、独立信息单元）和"不需要卡片的内容"（筛选工具栏、页面标题区、Tab 导航、纯文本说明）
- 用间距和分割线替代卡片做区域内部分组——Gestalt 接近性：组内元素间距 8-16px，组间 48-64px
- 对于确实需要卡片承载的同类数据，用 `auto-fit` grid 替代定宽

---

### 4.2 色彩噪音——#ff6600 高饱和度橙色大面积使用

**问题：** 高饱和度 `#ff6600` 作为主色，到处散落使用，缺乏角色限制。

**原则：** 颜色策略应选 Restrained（工具型产品默认）——饱和度 90%+ 的颜色不适合大面积用于背景或边框，只能用于主操作按钮、选中态和状态指示（tokens.md §四）。强色过多 = 没有重点，因为所有东西都在喊。

**用户影响：**
- 橙色是高唤醒色——页面充满 #ff6600 时用户视觉疲劳加速，长时间使用产生焦躁感
- 同页面内 error 红色与主色橙色色相接近（红色偏橙），用户难以快速区分"正常操作入口"和"错误警告"
- 工作型产品的信任感来自稳定、克制——高饱和暖色大面积使用让产品看起来像促销 landing page 而非工具

**修复方向：**
- 将 `#ff6600` 收敛到语义 token `color-action-primary`，仅用于主按钮、链接、选中态和关键状态指示
- 中性色承担 90% 的结构——边框、背景色、分隔线全部用 gray ramp
- 反馈色（error red、success green、warning yellow）与主色 orange 拉开色相差距，确保可区分
- 如果工具型产品偏好更克制的方向，考虑将主色降饱和至类似 `#e67e22` 或更中性的方向

---

## 五、修复优先级排序

| 优先级 | 问题 | 影响范围 | 修复工作量 |
|--------|------|----------|-----------|
| **P0 立即** | Emoji 替换为图标库 icon + aria-label | 所有用户、所有平台 | 低 |
| **P0 立即** | 建立 Design Token 体系（最少起步集），消除裸 hex 值 | 可维护性、主题切换、暗色模式基础 | 中 |
| **P0 立即** | 手写 Button/Input 替换为组件库控件 | 交互一致性、a11y 内置支持 | 中-高 |
| **P1 本周** | 补齐 Loading / Error / Empty 状态 | 用户体验底线 | 中 |
| **P1 本周** | 卡片改为流体网格 + Container Queries 响应式基础 | 移动端可用性、内容弹性 | 中 |
| **P1 本周** | 暗色模式（基于 semantic token 重映射） | a11y、用户偏好 | 中 |
| **P2 本月** | 完整响应式适配（320px-1440px 验收通过） | 移动端体验 | 中-高 |
| **P2 本月** | 键盘导航、focus ring、触摸目标达标 | 键盘用户、触屏用户 | 中 |
| **P3 迭代** | 卡片层级优化——减少卡片滥用，建立信息层级 | 扫读效率、视觉舒适度 | 低-中 |
| **P3 迭代** | 主色饱和度评估与视觉收敛 | 长期使用舒适度、品牌感 | 低 |

---

## 六、自检清单（修复完成后逐项确认）

- [ ] 页面上没有任何 emoji——所有图标来自项目图标库，每个 icon 有 `aria-label`
- [ ] 所有 Button 使用组件库 Button 组件，未出现手写 `<button class="...">` 样式
- [ ] 所有 Input/Select 使用组件库对应控件
- [ ] 项目 CSS 中不存在裸 hex 颜色值——全部通过 `var(--color-*)` token 引用
- [ ] Token 体系已建立最少起步集（Primitive ~20 + Semantic ~15）
- [ ] 暗色模式下所有文字满足 WCAG AA 对比度（4.5:1 正文 / 3:1 大文字）
- [ ] `prefers-reduced-motion` 媒体查询已覆盖所有动画
- [ ] 卡片宽度不使用固定 px，全部为弹性网格
- [ ] 320px / 375px / 768px / 1024px / 1440px 五个视口均无横向溢出
- [ ] 所有交互元素触摸目标 ≥ 44x44px
- [ ] 每个数据驱动区域有 Loading（骨架屏）、Empty（区分无数据/无结果）、Error（区分网络/业务+重试入口）、Success 四态
- [ ] 键盘 Tab 导航顺畅，focus ring 始终可见且不被 sticky 元素遮挡
- [ ] 同一意图的按钮标签在页面各处一致（不出现"保存""确认""OK"混用）
