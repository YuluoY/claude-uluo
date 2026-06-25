#!/usr/bin/env python3
"""ui-component-creator skill 的确定性检查脚本。

验证组件产出是否符合硬性规范（目录结构、README 结构、四态、禁令红线）。
纯 Python 标准库实现，不依赖外部 LLM API。
"""

import sys
import re
import json
from pathlib import Path


# 9 个固定的 H2 节标题（按顺序）
REQUIRED_H2_SECTIONS = [
    "元信息",
    "是什么",
    "快速上手",
    "API 参考",
    "四态说明",
    "使用示例",
    "设计决策",
    "可访问性",
    "变更记录",
]

# 元信息表必须包含的 8 个字段
REQUIRED_META_FIELDS = ["组件名", "版本", "框架", "状态", "入口路径", "依赖", "组件层次", "风格兼容性"]

# 四态必须包含的 4 个状态
REQUIRED_FOUR_STATES = ["Loading", "Error", "Empty", "Success"]


def get_h2_titles(content: str) -> list:
    """提取所有 H2 标题（按出现顺序）。"""
    return [m.strip() for m in re.findall(r'^## (.+)$', content, re.MULTILINE)]


def get_h2_section(content: str, section_name: str) -> str:
    """获取指定 H2 节的内容（从该标题到下一个 H2 或文档末尾）。"""
    pattern = rf'^## {re.escape(section_name)}[ \t]*$'
    match = re.search(pattern, content, re.MULTILINE)
    if not match:
        return ''
    start = match.end()
    next_h2 = re.search(r'^## ', content[start:], re.MULTILINE)
    if next_h2:
        return content[start:start + next_h2.start()]
    return content[start:]


def get_h3_section(h2_content: str, h3_pattern: str) -> str:
    """在 H2 节内容中，获取匹配指定模式的 H3 节内容。"""
    pattern = rf'^### {h3_pattern}[ \t]*$'
    match = re.search(pattern, h2_content, re.MULTILINE)
    if not match:
        return ''
    start = match.end()
    next_section = re.search(r'^### |^## ', h2_content[start:], re.MULTILINE)
    if next_section:
        return h2_content[start:start + next_section.start()]
    return h2_content[start:]


def check_directory_structure(component_dir: Path) -> list:
    """检查目录结构。"""
    checks = []

    # README.md 存在
    readme_path = component_dir / 'README.md'
    checks.append((
        "README.md 存在",
        readme_path.exists(),
        "文件存在" if readme_path.exists() else "文件不存在: README.md"
    ))

    # docs/ 目录存在
    docs_path = component_dir / 'docs'
    checks.append((
        "docs/ 目录存在",
        docs_path.is_dir(),
        "目录存在" if docs_path.is_dir() else "目录不存在: docs/"
    ))

    # index.vue 或 index.ts 或 index.tsx 存在（任一即可）
    entry_found = next(
        (f'index.{ext}' for ext in ['vue', 'ts', 'tsx']
         if (component_dir / f'index.{ext}').exists()),
        None
    )
    checks.append((
        "入口文件存在 (index.vue/ts/tsx)",
        entry_found is not None,
        f"找到入口文件: {entry_found}" if entry_found else "未找到 index.vue / index.ts / index.tsx"
    ))

    # types.ts 存在
    types_path = component_dir / 'types.ts'
    checks.append((
        "types.ts 存在",
        types_path.exists(),
        "文件存在" if types_path.exists() else "文件不存在: types.ts"
    ))

    return checks


def check_readme_structure(readme_content: str) -> list:
    """检查 README 结构。"""
    checks = []

    # 2.1 九个 H2 节齐全且顺序正确
    h2_titles = get_h2_titles(readme_content)
    if h2_titles == REQUIRED_H2_SECTIONS:
        checks.append(("九个 H2 节齐全且顺序正确", True, "9 个 H2 节齐全且顺序正确"))
    else:
        missing = [s for s in REQUIRED_H2_SECTIONS if s not in h2_titles]
        msg_parts = []
        if missing:
            msg_parts.append(f"缺少: {', '.join(missing)}")
        if not missing and h2_titles != REQUIRED_H2_SECTIONS:
            msg_parts.append(f"顺序错误，实际顺序: {h2_titles}")
        checks.append((
            "九个 H2 节齐全且顺序正确",
            False,
            "；".join(msg_parts) if msg_parts else "H2 节不匹配规范"
        ))

    # 2.2 元信息表 6 字段
    meta_section = get_h2_section(readme_content, "元信息")
    missing_fields = [f for f in REQUIRED_META_FIELDS if f not in meta_section]
    checks.append((
        "元信息表 8 字段齐全",
        len(missing_fields) == 0,
        "8 个字段齐全" if not missing_fields else f"缺少字段: {', '.join(missing_fields)}"
    ))

    # 2.3 API 表格表头
    api_section = get_h2_section(readme_content, "API 参考")

    # Props
    props_section = get_h3_section(api_section, r'Props')
    props_has_table = '| 名称 |' in props_section
    checks.append((
        "API Props 表格存在",
        props_has_table,
        "Props 表格存在" if props_has_table else "Props 节缺少表格（需含 | 名称 | 表头）"
    ))

    # Emits / Events
    emits_section = get_h3_section(api_section, r'Emits(?:\s*/\s*Events)?')
    emits_has_table = '| 名称 |' in emits_section
    checks.append((
        "API Emits 表格存在",
        emits_has_table,
        "Emits 表格存在" if emits_has_table else "Emits 节缺少表格（需含 | 名称 | 表头）"
    ))

    # Slots
    slots_section = get_h3_section(api_section, r'Slots')
    slots_has_table = '| 名称 |' in slots_section
    checks.append((
        "API Slots 表格存在",
        slots_has_table,
        "Slots 表格存在" if slots_has_table else "Slots 节缺少表格（需含 | 名称 | 表头）"
    ))

    # Methods（如标注「无」则跳过）
    methods_section = get_h3_section(api_section, r'Methods')
    if methods_section and '| 名称 |' not in methods_section and '无' in methods_section:
        checks.append(("API Methods 表格存在", True, "Methods 标注为「无」，跳过"))
    else:
        methods_has_table = '| 名称 |' in methods_section
        checks.append((
            "API Methods 表格存在",
            methods_has_table,
            "Methods 表格存在" if methods_has_table else "Methods 节缺少表格（需含 | 名称 | 表头）"
        ))

    # 2.4 变更记录格式
    changelog_section = get_h2_section(readme_content, "变更记录")
    version_pattern = r'### v\d+\.\d+\.\d+ \(\d{4}-\d{2}-\d{2}\)'
    has_version_entry = re.search(version_pattern, changelog_section) is not None
    checks.append((
        "变更记录格式正确",
        has_version_entry,
        "找到 ### vX.Y.Z (YYYY-MM-DD) 格式条目" if has_version_entry
        else "缺少 ### vX.Y.Z (YYYY-MM-DD) 格式的版本条目"
    ))

    return checks


def check_four_states(readme_content: str) -> list:
    """检查四态说明。"""
    four_states_section = get_h2_section(readme_content, "四态说明")
    missing_states = [s for s in REQUIRED_FOUR_STATES if s not in four_states_section]
    return [(
        "四态说明完整 (Loading/Error/Empty/Success)",
        len(missing_states) == 0,
        "四态齐全" if not missing_states else f"缺少状态: {', '.join(missing_states)}"
    )]


def check_version_format(readme_content: str) -> list:
    """检查版本号格式。"""
    meta_section = get_h2_section(readme_content, "元信息")
    version_match = re.search(r'\|\s*版本\s*\|\s*(\S+)\s*\|', meta_section)
    if not version_match:
        return [("版本号 SemVer 格式正确", False, "元信息中未找到版本字段")]

    version_value = version_match.group(1)
    semver_match = re.match(r'^v\d+\.\d+\.\d+$', version_value)
    return [(
        "版本号 SemVer 格式正确",
        semver_match is not None,
        f"版本号: {version_value}" if semver_match
        else f"版本号格式错误: {version_value}（应为 vX.Y.Z）"
    )]


def check_ban_redlines(readme_content: str) -> list:
    """检查禁令红线。"""
    checks = []

    # 禁令 7：无 outline: none
    outline_match = re.search(r'outline\s*:\s*none', readme_content)
    checks.append((
        "禁令 7: 无 outline:none",
        outline_match is None,
        "未发现 outline:none" if outline_match is None
        else "发现 outline:none（违反 WCAG 2.4.13 Focus Appearance）"
    ))

    # 禁令 9：无 index 作为列表 key
    key_patterns = [
        r'key=\{index\}',
        r':key="index"',
        r":key='index'",
    ]
    key_matched = any(re.search(p, readme_content) for p in key_patterns)
    checks.append((
        "禁令 9: 无 index 作为列表 key",
        not key_matched,
        "未发现 index 作为 key" if not key_matched else "发现 index 作为列表 key"
    ))

    # 禁令 13：废弃项同步检查
    changelog_section = get_h2_section(readme_content, "变更记录")
    api_section = get_h2_section(readme_content, "API 参考")
    has_deprecated_in_changelog = (
        '**Deprecated**' in changelog_section or 'Deprecated:' in changelog_section
    )

    if has_deprecated_in_changelog:
        has_deprecated_marker = 'deprecated since' in api_section.lower()
        checks.append((
            "禁令 13: 废弃项有 deprecated 标记",
            has_deprecated_marker,
            "API 表格中有 deprecated since 标记" if has_deprecated_marker
            else "变更记录有 Deprecated 条目，但 API 表格中未找到 deprecated since 标记"
        ))
    else:
        checks.append((
            "禁令 13: 废弃项有 deprecated 标记",
            True,
            "变更记录中无 Deprecated 条目，跳过"
        ))

    # 禁令 14：无硬编码颜色值（README 中不应出现具体颜色值，应走语义 token）
    # 排除代码块中的内容（```...```之间的内容）
    readme_without_code = re.sub(r'```[\s\S]*?```', '', readme_content)
    # 匹配 hex 颜色值（如 #FFF, #FFFFFF, #FFAABBCC）
    color_match = re.search(r'#[0-9a-fA-F]{3,8}\b', readme_without_code)
    checks.append((
        "禁令 14: README 无硬编码颜色值",
        color_match is None,
        "未发现硬编码颜色值" if color_match is None
        else f"发现硬编码颜色值: {color_match.group()}（应走语义 token 如 var(--color-primary)）"
    ))

    return checks


def validate(component_dir: Path) -> dict:
    """主验证函数。"""
    checks = []

    # 1. 目录结构检查
    checks.extend(check_directory_structure(component_dir))

    # 检查 README.md 是否存在，决定是否跳过 README 相关检查
    readme_path = component_dir / 'README.md'
    if readme_path.exists():
        readme_content = readme_path.read_text(encoding='utf-8')

        # 2. README 结构检查
        checks.extend(check_readme_structure(readme_content))

        # 3. 四态说明检查
        checks.extend(check_four_states(readme_content))

        # 4. 版本号格式检查
        checks.extend(check_version_format(readme_content))

        # 5. 禁令红线检查
        checks.extend(check_ban_redlines(readme_content))

        # 6. component-spec.md 样式架构节检查（如存在）
        spec_path = component_dir / 'docs' / 'component-spec.md'
        if spec_path.exists():
            spec_content = spec_path.read_text(encoding='utf-8')
            has_layer_section = '组件层次定位' in spec_content
            checks.append((
                "component-spec 包含组件层次定位节",
                has_layer_section,
                "找到组件层次定位节" if has_layer_section else "缺少组件层次定位节"
            ))
            has_style_section = '样式架构' in spec_content
            checks.append((
                "component-spec 包含样式架构节",
                has_style_section,
                "找到样式架构节" if has_style_section else "缺少样式架构节"
            ))
        else:
            checks.append((
                "component-spec 包含组件层次定位节",
                True,
                "component-spec.md 不存在，跳过"
            ))
            checks.append((
                "component-spec 包含样式架构节",
                True,
                "component-spec.md 不存在，跳过"
            ))
    else:
        # README.md 不存在，跳过 README 相关检查（不报错）
        skip_msg = "README.md 不存在，跳过"
        skip_checks = [
            "九个 H2 节齐全且顺序正确",
            "元信息表 8 字段齐全",
            "API Props 表格存在",
            "API Emits 表格存在",
            "API Slots 表格存在",
            "API Methods 表格存在",
            "变更记录格式正确",
            "四态说明完整 (Loading/Error/Empty/Success)",
            "版本号 SemVer 格式正确",
            "禁令 7: 无 outline:none",
            "禁令 9: 无 index 作为列表 key",
            "禁令 13: 废弃项有 deprecated 标记",
            "禁令 14: README 无硬编码颜色值",
            "component-spec 包含组件层次定位节",
            "component-spec 包含样式架构节",
        ]
        checks.extend([(name, True, skip_msg) for name in skip_checks])

    passed_count = sum(1 for c in checks if c[1])
    failed_count = len(checks) - passed_count
    all_passed = failed_count == 0

    return {
        "passed": all_passed,
        "checks": [{"name": c[0], "passed": c[1], "message": c[2]} for c in checks],
        "summary": f"{passed_count}/{len(checks)} 项通过，{failed_count} 项失败"
    }


def main():
    if len(sys.argv) != 2:
        print(json.dumps({
            "passed": False,
            "checks": [],
            "summary": "用法: python -m scripts.validate_output <组件目录路径>"
        }, ensure_ascii=False))
        sys.exit(1)

    component_dir = Path(sys.argv[1])

    if not component_dir.is_dir():
        print(json.dumps({
            "passed": False,
            "checks": [],
            "summary": "目录不存在"
        }, ensure_ascii=False))
        sys.exit(1)

    result = validate(component_dir)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
