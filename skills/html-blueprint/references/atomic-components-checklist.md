# 原子组件完整清单

Phase 1 Step 3 必须生成以下全部原子组件。每个组件 HTML 文件输出到 `design/components/`，并注册到 `component-registry.json`。

---

## 通用（General）— 7 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Button | `button.html` | primary/secondary/danger/ghost/text | default/hover/active/disabled/loading |
| Icon | `icon.html` | outlined/filled | — |
| Avatar | `avatar.html` | image/text/icon | — |
| Badge | `badge.html` | dot/number/text | — |
| Tag | `tag.html` | filled/outlined | closable/not-closable |
| Tooltip | `tooltip.html` | top/bottom/left/right | — |
| Divider | `divider.html` | horizontal/vertical | — |

---

## 数据录入（Data Entry）— 12 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Input | `input.html` | — | default/focus/error/disabled/readonly |
| InputNumber | `input-number.html` | — | default/focus/error/disabled |
| Select | `select.html` | single/multiple | default/focus/error/disabled/open |
| Checkbox | `checkbox.html` | — | checked/unchecked/indeterminate/disabled |
| Radio | `radio.html` | — | checked/unchecked/disabled |
| Switch | `switch.html` | — | on/off/disabled/loading |
| DatePicker | `date-picker.html` | date/range | default/focus/error/disabled/open |
| Upload | `upload.html` | drag/button | default/uploading/error/done |
| Slider | `slider.html` | single/range | default/disabled |
| Rate | `rate.html` | — | default/disabled |
| Cascader | `cascader.html` | — | default/open/disabled |
| Transfer | `transfer.html` | — | default |

---

## 数据展示（Data Display）— 13 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Card | `card.html` | default/hoverable | default/loading |
| Table | `table.html` | — | default/loading/empty/error |
| List | `list.html` | — | default/loading/empty |
| Tree | `tree.html` | — | default/expanded/collapsed |
| Timeline | `timeline.html` | — | default/pending/done |
| Statistic | `statistic.html` | — | default/loading |
| Collapse | `collapse.html` | accordion/normal | expanded/collapsed |
| Carousel | `carousel.html` | — | autoplay/manual |
| Tabs | `tabs.html` | line/card | active/inactive/disabled |
| Calendar | `calendar.html` | month/year | — |
| Descriptions | `descriptions.html` | horizontal/vertical | — |
| Empty | `empty.html` | — | default（无数据占位） |
| Image | `image.html` | — | default/loading/error/fallback |

---

## 反馈（Feedback）— 10 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Alert | `alert.html` | info/success/warning/error | closable/not-closable |
| Message | `message.html` | info/success/warning/error/loading | — |
| Modal | `modal.html` | — | open/closed/confirm |
| Drawer | `drawer.html` | left/right/top/bottom | open/closed |
| Notification | `notification.html` | info/success/warning/error | — |
| Progress | `progress.html` | line/circle | default/success/exception |
| Skeleton | `skeleton.html` | paragraph/card/avatar | — |
| Spin | `spin.html` | — | spinning |
| Result | `result.html` | success/error/info/warning/403/404/500 | — |
| Popconfirm | `popconfirm.html` | — | open/closed |

---

## 导航（Navigation）— 7 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Menu | `menu.html` | horizontal/vertical/inline | active/inactive/disabled/open |
| Breadcrumb | `breadcrumb.html` | — | active/inactive |
| Pagination | `pagination.html` | — | active/inactive/disabled |
| Steps | `steps.html` | horizontal/vertical | wait/process/finish/error |
| Dropdown | `dropdown.html` | — | open/closed/disabled |
| Anchor | `anchor.html` | — | active/inactive |
| Segmented | `segmented.html` | — | active/inactive/disabled |

---

## 布局（Layout）— 3 个

| 组件 | 文件名 | 核心 variants | 核心 states |
|------|--------|-------------|------------|
| Grid | `grid.html` | Row/Col | — |
| Space | `space.html` | horizontal/vertical | — |
| Splitter | `splitter.html` | horizontal/vertical | — |

---

## 汇总

| 类别 | 数量 |
|------|------|
| 通用 | 7 |
| 数据录入 | 12 |
| 数据展示 | 13 |
| 反馈 | 10 |
| 导航 | 7 |
| 布局 | 3 |
| **合计** | **52** |

---

## 每个组件的 HTML 展示要求

每个组件 HTML 文件必须包含：

```html
<!-- @component-showcase: <ComponentName> -->
<!-- @category: <category> -->

<!-- Anatomy -->
<section data-section="Anatomy">
  <!-- 完整标注 data-component/data-prop/data-event 的解剖图 -->
</section>

<!-- Variants -->
<section data-section="Variants">
  <!-- 所有变体横向排列 -->
</section>

<!-- States -->
<section data-section="States">
  <!-- 所有状态纵向对比 -->
</section>

<!-- Sizes（如有） -->
<section data-section="Sizes">
  <!-- sm/md/lg 并排展示 -->
</section>
```

图表类（Chart）不预生成，归 `data-convert="manual"`。
