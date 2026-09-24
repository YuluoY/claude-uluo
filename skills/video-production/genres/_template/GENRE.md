# 类型中文名（your-genre）

> 新增类型的做法：把 `genres/_template` 复制成 `genres/<名字>`（小写字母、数字、连字符），按下面各节填写，
> 把 `genre.json` 的 `name` 改成目录名，在 `components/` 里写组件并从 `index.ts` 导出。
> `vp.py genre list` 会自动列出它，SKILL.md 不用改。项目里用 `vp.py genre add <名字>` 安装。

适用：什么内容用这个类型（举 3 个具体选题）。不适用：什么内容别用它。

## 讲解结构

这一类内容怎么讲最容易懂。按“建构”的顺序：现象 → 原理 → 术语 → 反例，结合本类型写具体步骤，
每步说明用哪个场景。

## 分镜套路

- 常见镜头组合、每类镜头多长、同画面续讲怎么处理
- 口播和画面怎么对齐（用哪些提示点）
- 横屏与竖屏的差别

## 场景

| 场景 | 参数 | 说明 |
|---|---|---|
| `YourScene` | `title`、… | 画什么、随口播怎么变 |

组件写法遵守 references/scenes.md：所有动画由帧号计算（不用 CSS 动画、`Math.random`、`Date`），
包在 `Stage` 里（不透明背景、避开安全区和字幕），时刻从 `useCueFrame` / `useRevealFrames` 取，不按秒数写死。

## 示例

`examples/storyboard.example.json`：一段能直接 `vp.py check` 通过的分镜。
