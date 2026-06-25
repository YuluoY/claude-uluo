"""validate_output.py 的单元测试。

测试 ui-component-creator skill 的确定性检查脚本，
覆盖目录结构、README 结构、四态、版本号、禁令红线等检查项。
"""

import sys
from pathlib import Path

import pytest

SKILL_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL_ROOT))

from scripts.validate_output import (
    validate,
    check_directory_structure,
    check_readme_structure,
    check_four_states,
    check_version_format,
    check_ban_redlines,
    get_h2_section,
    REQUIRED_H2_SECTIONS,
    REQUIRED_META_FIELDS,
    REQUIRED_FOUR_STATES,
)


COMPLETE_README = """# TestComponent

## 元信息

| 字段 | 值 |
|------|------|
| 组件名 | TestComponent |
| 版本 | v1.0.0 |
| 框架 | Vue 3 |
| 状态 | stable |
| 入口路径 | src/components/TestComponent/index.vue |
| 依赖 | 无 |
| 组件层次 | 原子层 |
| 风格兼容性 | Apple, Vercel |

## 是什么

测试组件。

## 快速上手

```vue
<TestComponent />
```

## API 参考

### Props

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | String | - | 绑定值 |

### Emits

| 名称 | 参数 | 说明 |
|------|------|------|
| change | (value) | 值变化 |

### Slots

| 名称 | 说明 |
|------|------|
| default | 默认插槽 |

### Methods

无

## 四态说明

- Loading: 骨架屏
- Error: 错误提示
- Empty: 空状态
- Success: 正常显示

## 使用示例

```vue
<TestComponent value="test" />
```

## 设计决策

决策说明。

## 可访问性

- 语义化 HTML
- ARIA 属性

## 变更记录

### v1.0.0 (2026-06-25)

- 初始版本
"""


COMPLETE_SPEC = """# TestComponent 设计文档

## 组件层次定位

原子层通用组件。

## 样式架构

三层分离：结构层、语义层、风格层。
"""


@pytest.fixture
def complete_component_dir(tmp_path):
    """创建完整的组件目录（README + spec + 入口 + 类型）。"""
    component_dir = tmp_path / "TestComponent"
    component_dir.mkdir()
    (component_dir / "README.md").write_text(COMPLETE_README, encoding="utf-8")
    docs_dir = component_dir / "docs"
    docs_dir.mkdir()
    (docs_dir / "component-spec.md").write_text(COMPLETE_SPEC, encoding="utf-8")
    (component_dir / "index.vue").write_text(
        "<template>Test</template>", encoding="utf-8"
    )
    (component_dir / "types.ts").write_text(
        "export type T = string;", encoding="utf-8"
    )
    return component_dir


def test_validate_empty_dir(tmp_path):
    """空目录应验证失败。"""
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    result = validate(empty_dir)
    assert result["passed"] is False
    failed_checks = [c for c in result["checks"] if not c["passed"]]
    assert len(failed_checks) > 0


def test_validate_complete_component(complete_component_dir):
    """完整组件目录应验证通过。"""
    result = validate(complete_component_dir)
    assert result["passed"] is True, (
        f"验证失败: {result['summary']}; "
        f"失败项: {[c['name'] for c in result['checks'] if not c['passed']]}"
    )


def test_check_readme_missing_h2():
    """README 缺少某个 H2 节应返回失败。"""
    broken_readme = COMPLETE_README.replace(
        "## 可访问性\n\n- 语义化 HTML\n- ARIA 属性\n", ""
    )
    checks = check_readme_structure(broken_readme)
    h2_check = next(c for c in checks if c[0] == "九个 H2 节齐全且顺序正确")
    assert h2_check[1] is False
    assert "可访问性" in h2_check[2]


def test_check_four_states_missing():
    """四态说明缺少某个状态应返回失败。"""
    broken_readme = COMPLETE_README.replace("- Empty: 空状态\n", "")
    checks = check_four_states(broken_readme)
    assert checks[0][1] is False
    assert "Empty" in checks[0][2]


def test_check_version_format_valid():
    """合法 SemVer 版本号应通过。"""
    checks = check_version_format(COMPLETE_README)
    assert checks[0][0] == "版本号 SemVer 格式正确"
    assert checks[0][1] is True


def test_check_version_format_invalid():
    """非 SemVer 版本号应失败。"""
    broken_readme = COMPLETE_README.replace(
        "| 版本 | v1.0.0 |", "| 版本 | 1.0 |"
    )
    checks = check_version_format(broken_readme)
    assert checks[0][1] is False
    assert "1.0" in checks[0][2]


def test_check_ban_redlines_outline_none():
    """outline: none 应触发禁令 7 违规。"""
    broken_readme = COMPLETE_README.replace(
        "- 语义化 HTML\n- ARIA 属性\n",
        "- 语义化 HTML\n- ARIA 属性\n\n注意：禁止使用 outline: none 样式。\n",
    )
    checks = check_ban_redlines(broken_readme)
    ban7 = next(c for c in checks if "禁令 7" in c[0])
    assert ban7[1] is False
    assert "outline" in ban7[2].lower()


def test_check_ban_redlines_hardcoded_color():
    """硬编码颜色值 #FF0000（非代码块中）应触发禁令 14 违规。"""
    broken_readme = COMPLETE_README.replace(
        "决策说明。", "决策说明。颜色值 #FF0000 不应硬编码。"
    )
    checks = check_ban_redlines(broken_readme)
    ban14 = next(c for c in checks if "禁令 14" in c[0])
    assert ban14[1] is False
    assert "#FF0000" in ban14[2]


def test_get_h2_section():
    """get_h2_section 应正确提取指定 H2 节内容。"""
    content = (
        "# Title\n\n"
        "## Section A\n"
        "content A\n"
        "line 2\n\n"
        "## Section B\n"
        "content B\n"
    )
    section_a = get_h2_section(content, "Section A")
    assert "content A" in section_a
    assert "line 2" in section_a
    assert "Section B" not in section_a
    assert "content B" not in section_a

    section_b = get_h2_section(content, "Section B")
    assert "content B" in section_b

    # 不存在的节返回空字符串
    assert get_h2_section(content, "Section C") == ""


def test_directory_structure_missing_readme(tmp_path):
    """目录无 README.md 应返回失败。"""
    component_dir = tmp_path / "NoReadme"
    component_dir.mkdir()
    (component_dir / "index.vue").write_text(
        "<template></template>", encoding="utf-8"
    )
    checks = check_directory_structure(component_dir)
    readme_check = next(c for c in checks if "README.md 存在" in c[0])
    assert readme_check[1] is False
