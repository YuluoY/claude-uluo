# 样式规范

> diagram-compiler 的默认样式定义和注入规则。SKILL.md 引用本文件获取样式细节。

## 默认主题变量

默认样式在 `scripts/_shared/core.py` 的 `DEFAULT_THEME_VARIABLES` 中定义：

```python
DEFAULT_THEME_VARIABLES = {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#888888",
    "primaryTextColor": "#333333",
    "lineColor": "#666666",
    "secondaryColor": "#f5f5f5",
    "tertiaryColor": "#fafafa",
}
```

## 样式注入规则

- 所有图表必须注入此样式
- `python scripts/_shared/mermaid.py enforce` 会自动检查和注入
- 用户指定其他样式时，跳过默认注入
