#!/usr/bin/env python3
"""Diagram Studio — Mermaid CLI 路由器。

根据图表类型将命令路由到对应的专属脚本，不包含任何图表规则逻辑。

用法:
    python mermaid.py validate <file> --type flowchart
    python mermaid.py style <file> --type sequence
    python mermaid.py enforce <file> --type er          # 强制规范（校验+自动修正）
    python mermaid.py template --type mindmap           # 输出标准模板
    python mermaid.py schema --type quadrant            # 查看数据格式说明
    python mermaid.py generate --type quadrant --data data.yaml  # 数据→图表
    python mermaid.py export <file> -o output.png
    python mermaid.py types                             # 列出所有类型
"""

import argparse
import importlib
import json
import sys
import textwrap
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent.parent  # scripts/
sys.path.insert(0, str(THIS_DIR))

from _shared.core import (
    read_input,
    extract_mermaid_blocks,
    export_image,
    validate_style as core_validate_style,
    print_problems,
    format_problems,
    set_themes_path,
    check_dependencies,
    format_dependency_help,
)

# 初始化 diagram-themes.yaml 路径，供样式注入和导出背景色使用
THEMES_PATH = THIS_DIR.parent.parent / "assets" / "themes" / "diagram-themes.yaml"
set_themes_path(THEMES_PATH)

# 延迟导入，避免循环依赖
def _get_module(type_name: str):
    """根据类型名获取对应的脚本模块。"""
    from __init__ import TYPE_ALIASES, REGISTRY  # noqa: E402

    normalized = TYPE_ALIASES.get(type_name, type_name)
    return REGISTRY.get(normalized)


def _resolve_diagram(source: str, raw: str) -> str:
    """从输入中解析出 mermaid 代码块或直接作为图表文本。"""
    blocks = extract_mermaid_blocks(raw)
    if blocks:
        return blocks[0][0]
    return raw.strip()


def cmd_validate(args):
    raw = read_input(args.input)
    diagram = _resolve_diagram(args.input, raw)

    problems = []

    if args.type:
        mod = _get_module(args.type)
        if mod is None:
            print(f"❌ 未知图表类型: {args.type}")
            print(f"   可用: python mermaid.py types")
            return 1
        problems.extend(mod.validate(diagram))
    else:
        # 尝试自动探测类型
        detected = _detect_type(diagram)
        if detected:
            mod = _get_module(detected)
            if mod:
                problems.extend(mod.validate(diagram))
        else:
            # 无法探测，至少做样式校验
            pass

    problems.extend(core_validate_style(diagram))

    if args.json:
        print(json.dumps(problems, ensure_ascii=False, indent=2))
    else:
        print_problems(problems)

    return 0 if not any(p["type"] == "error" for p in problems) else 1


def cmd_enforce(args):
    """校验 + 自动修正 + 输出修正后代码。"""
    raw = read_input(args.input)
    diagram = _resolve_diagram(args.input, raw)

    if not args.type:
        print("❌ enforce 必须指定 --type")
        return 1

    mod = _get_module(args.type)
    if mod is None:
        print(f"❌ 未知图表类型: {args.type}")
        return 1

    fixed, changes = mod.enforce(diagram)

    if changes and not args.json:
        for c in changes:
            print(f"📝 {c.get('message', c)}")

    # 输出修正后的图表
    if not args.json:
        print(fixed)
    else:
        print(json.dumps({
            "diagram": fixed,
            "changes": changes
        }, ensure_ascii=False))

    return 0


def cmd_template(args):
    """输出指定类型的标准模板。"""
    from __init__ import TYPE_ALIASES
    original_type = args.type
    normalized = TYPE_ALIASES.get(args.type, args.type)

    mod = _get_module(args.type)
    if mod is None:
        print(f"❌ 未知图表类型: {args.type}")
        print(f"   可用: python mermaid.py types")
        return 1

    # 部分类型有专属模板
    if original_type in ("architecture", "架构图"):
        diagram = mod.architecture_template()
    elif original_type in ("layered", "分层图"):
        diagram = mod.layered_template()
    else:
        diagram = mod.template()

    if not args.no_style:
        from _shared.core import inject_default_style
        diagram = inject_default_style(diagram)
    print(diagram)
    return 0


def cmd_style(args):
    """仅处理样式（不涉及图表类型专属规则）。"""
    raw = read_input(args.input)
    diagram = _resolve_diagram(args.input, raw)

    from _shared.core import enforce_default_style

    fixed, changes = enforce_default_style(diagram)

    if args.json:
        print(json.dumps(changes, ensure_ascii=False))
    else:
        if changes:
            for c in changes:
                print(f"📝 {c['message']}")
        else:
            print("✅ 样式已符合规范")
        if not args.check_only:
            print(fixed)

    return 0


def cmd_export(args):
    raw = read_input(args.input)
    diagram = _resolve_diagram(args.input, raw)

    background = getattr(args, "background", None)
    transparent = getattr(args, "transparent", False)
    result = export_image(diagram, args.output, args.scale, args.width, args.height,
                          background=background, transparent=transparent)
    if args.json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        if result["success"]:
            print(f"✅ 导出成功: {result['output']}")
            if transparent:
                print(f"   背景: 透明")
        else:
            print(f"❌ 导出失败: {result.get('error', 'unknown')}")
            if result.get("fix"):
                print(f"   修复: {result['fix']}")
    return 0 if result["success"] else 1


def cmd_types(args):
    """列出所有支持的图表类型。"""
    from __init__ import TYPE_ALIASES

    seen = set()
    print("支持的图表类型:\n")
    aliases = TYPE_ALIASES
    by_module = {}
    for alias, mod in aliases.items():
        if mod not in by_module:
            by_module[mod] = []
        by_module[mod].append(alias)

    for mod_name, names in sorted(by_module.items()):
        matching = [n for n in names if n == mod_name]
        primary = matching[0] if matching else names[0]
        extra = [n for n in names if n != primary]
        desc = {
            "flowchart": "流程图 / 架构图 / 分层模块图",
            "sequence": "时序图",
            "er": "ER 实体关系图",
            "class": "类图",
            "state": "状态图",
            "gantt": "甘特图",
            "pie": "饼图",
            "git": "Git 分支图",
            "mindmap": "思维导图",
            "timeline": "时间线",
        }.get(mod_name, "")
        print(f"  {mod_name:16s} {desc}")
        if extra:
            print(f"  {'':16s} 别名: {', '.join(extra)}")
    return 0


def cmd_schema(args):
    """输出指定类型的数据格式说明（给 AI 看的 DATA_SCHEMA）。"""
    mod = _get_module(args.type)
    if mod is None:
        print(f"❌ 未知图表类型: {args.type}")
        print(f"   可用: python mermaid.py types")
        return 1

    schema_text = getattr(mod, "DATA_SCHEMA", None)
    if schema_text is None:
        print(f"⚠️  类型 '{args.type}' 暂不支持数据驱动模式（无 DATA_SCHEMA）")
        print(f"   请使用 template 路径: python mermaid.py template --type {args.type}")
        return 1

    print(schema_text.strip())
    return 0


def cmd_generate(args):
    """从结构化数据文件生成 Mermaid 图表，可选 enforce + export。

    支持 YAML 和 JSON 格式的数据文件。
    """
    mod = _get_module(args.type)
    if mod is None:
        print(f"❌ 未知图表类型: {args.type}")
        return 1

    data_to_diagram = getattr(mod, "data_to_diagram", None)
    if data_to_diagram is None:
        print(f"❌ 类型 '{args.type}' 不支持 data_to_diagram()")
        print(f"   请使用 template 路径: python mermaid.py template --type {args.type}")
        return 1

    # 读取数据文件
    data_path = Path(args.data)
    if not data_path.exists():
        print(f"❌ 数据文件不存在: {args.data}")
        return 1

    raw = data_path.read_text(encoding="utf-8")
    if data_path.suffix in (".yaml", ".yml"):
        try:
            import yaml
            data = yaml.safe_load(raw)
        except ImportError:
            print("❌ 读取 YAML 需要 PyYAML: pip install pyyaml")
            return 1
    elif data_path.suffix == ".json":
        data = json.loads(raw)
    else:
        # 尝试 YAML 优先
        try:
            import yaml
            data = yaml.safe_load(raw)
        except (ImportError, Exception):
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                print(f"❌ 无法解析数据文件（支持 YAML/JSON）: {args.data}")
                return 1

    if data is None:
        print(f"❌ 数据文件为空或格式错误: {args.data}")
        return 1

    # 数据 → Mermaid
    try:
        diagram = data_to_diagram(data)
    except Exception as e:
        print(f"❌ 数据转换失败: {e}")
        return 1

    # enforce（如果脚本有 enforce 方法）
    enforce_fn = getattr(mod, "enforce", None)
    if enforce_fn:
        try:
            diagram, changes = enforce_fn(diagram)
            if changes and not args.json and not args.quiet:
                for c in changes:
                    print(f"📝 {c.get('message', c)}")
        except Exception as e:
            print(f"⚠️  enforce 失败（继续输出未修正版本）: {e}")

    # 导出图片
    if args.output:
        # 检查是否有 Matplotlib renderer（用于 Mermaid CLI 不支持的类型）
        has_renderer = hasattr(mod, "render") and callable(mod.render)
        needs_fallback = args.type in ("radar",)  # radar 完全不被 Mermaid 支持

        if (has_renderer and needs_fallback) or getattr(args, "use_renderer", False):
            # 使用 Matplotlib render() 直接渲染
            render_fn = getattr(mod, "render")
            try:
                render_fn(data, Path(args.output), dpi=150)
                print(f"✅ Matplotlib 渲染成功: {args.output}")
                print(f"   ⚠️  该类型不通过 Mermaid CLI 渲染（使用 Matplotlib 直出）")
            except Exception as e:
                print(f"❌ Matplotlib 渲染失败: {e}")
                return 1
        else:
            result = export_image(diagram, args.output, args.scale,
                                  args.width, args.height,
                                  transparent=args.transparent)
            if not args.json:
                if result["success"]:
                    print(f"✅ 导出成功: {result['output']}")
                    if has_renderer:
                        print(f"   💡 含中文标签时可用 --use-renderer 切换到 Matplotlib 渲染")
                else:
                    err = result.get('error', 'unknown')
                    print(f"❌ 导出失败: {err}")
                    # 如果有 renderer fallback，提示用户
                    if has_renderer and ("Parse error" in err or "UnknownDiagramError" in err):
                        print(f"   💡 该错误常见于 Mermaid CLI 不支持此类型的标签/语法")
                        print(f"   💡 重试: python mermaid.py generate --type {args.type} --data {args.data} -o {args.output} --use-renderer")
                    return 1
    else:
        # 输出 Mermaid 代码
        if args.json:
            print(json.dumps({"diagram": diagram}, ensure_ascii=False))
        else:
            print(diagram)

    return 0


def _detect_type(diagram: str) -> str | None:
    """自动探测图表类型。"""
    first = diagram.strip().split("\n")[0].strip()
    if first.startswith("%%"):
        for line in diagram.strip().split("\n"):
            stripped = line.strip()
            if stripped and not stripped.startswith("%%"):
                first = stripped
                break

    mapping = {
        "flowchart": "flowchart",
        "graph ": "flowchart",
        "sequenceDiagram": "sequence",
        "erDiagram": "er",
        "classDiagram": "class_diagram",
        "stateDiagram": "state",
        "stateDiagram-v2": "state",
        "gantt": "gantt",
        "pie": "pie",
        "gitGraph": "git_graph",
        "mindmap": "mindmap",
        "timeline": "timeline",
        "quadrantChart": "quadrant",
        "sankey-beta": "sankey",
        "C4Context": "c4",
        "C4Container": "c4",
        "C4Component": "c4",
        "C4Dynamic": "c4",
        "C4Deployment": "c4",
        "journey": "journey",
    }
    for prefix, t in mapping.items():
        if first.startswith(prefix):
            return t
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Diagram Studio — Mermaid 子系统脚本驱动引擎（每种图表类型对应一个脚本）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            使用示例:
              python mermaid.py types                              # 列出所有类型
              python mermaid.py template --type flowchart          # 输出模板
              python mermaid.py schema --type quadrant             # 查看数据格式
              python mermaid.py generate --type sankey --data d.yaml  # 数据→图
              python mermaid.py validate doc.md --type sequence    # 校验
              python mermaid.py enforce doc.md --type er           # 强制规范
              python mermaid.py export doc.md -o out.png           # 导出图片
        """)
    )

    sub = parser.add_subparsers(dest="command", help="子命令")

    # --> types
    sub.add_parser("types", help="列出所有支持的图表类型")

    # --> template
    p_tmpl = sub.add_parser("template", help="输出指定类型的标准模板")
    p_tmpl.add_argument("--type", "-t", required=True, help="图表类型")
    p_tmpl.add_argument("--no-style", action="store_true", help="不注入默认样式")

    # --> validate
    p_val = sub.add_parser("validate", help="校验 Mermaid 语法和规范")
    p_val.add_argument("input", help="输入文件（- 表示 stdin）")
    p_val.add_argument("--type", "-t", help="指定图表类型（不指定则自动探测）")
    p_val.add_argument("--json", action="store_true", help="JSON 格式输出")

    # --> enforce (校验 + 自动修正)
    p_enf = sub.add_parser("enforce", help="强制图表规范（校验 + 自动修正），输出修正后代码")
    p_enf.add_argument("input", help="输入文件（- 表示 stdin）")
    p_enf.add_argument("--type", "-t", required=True, help="图表类型")
    p_enf.add_argument("--json", action="store_true")

    # --> style
    p_sty = sub.add_parser("style", help="检查/注入默认样式")
    p_sty.add_argument("input", help="输入文件（- 表示 stdin）")
    p_sty.add_argument("--check-only", action="store_true", help="仅检查，不输出修正结果")
    p_sty.add_argument("--json", action="store_true")

    # --> export
    p_exp = sub.add_parser("export", help="导出为图片（PNG/SVG/PDF）")
    p_exp.add_argument("input", help="输入文件")
    p_exp.add_argument("-o", "--output", required=True, help="输出文件路径")
    p_exp.add_argument("-s", "--scale", type=int, default=2)
    p_exp.add_argument("-w", "--width", type=int, default=0)
    p_exp.add_argument("-H", "--height", type=int, default=0)
    p_exp.add_argument("--json", action="store_true")
    p_exp.add_argument("--transparent", action="store_true",
                       help="导出透明背景（默认跟随主题背景色）")
    p_exp.add_argument("--background", "-b", default=None,
                       help="指定背景色（CSS 颜色值），覆盖主题默认值")

    # --> schema
    p_schema = sub.add_parser("schema", help="查看图表类型的数据格式说明（DATA_SCHEMA）")
    p_schema.add_argument("--type", "-t", required=True, help="图表类型")

    # --> generate (数据驱动)
    p_gen = sub.add_parser("generate", help="从结构化数据生成图表（数据驱动路径）")
    p_gen.add_argument("--type", "-t", required=True, help="图表类型")
    p_gen.add_argument("--data", "-d", required=True, help="数据文件路径（YAML/JSON）")
    p_gen.add_argument("-o", "--output", default=None, help="可选：直接导出图片路径")
    p_gen.add_argument("-s", "--scale", type=int, default=2)
    p_gen.add_argument("-w", "--width", type=int, default=0)
    p_gen.add_argument("-H", "--height", type=int, default=0)
    p_gen.add_argument("--transparent", action="store_true", help="透明背景")
    p_gen.add_argument("--json", action="store_true")
    p_gen.add_argument("--quiet", action="store_true", help="静默模式（不输出 enforce 变更）")
    p_gen.add_argument("--use-renderer", action="store_true",
                       help="使用 Matplotlib render() 代替 Mermaid CLI（用于 mmdc 不支持的类型）")

    args = parser.parse_args()

    # Dependency check (skip for 'types' and 'schema' which don't need mmdc)
    if args.command not in ("types", "schema", None):
        deps = check_dependencies()
        issues = {k: v for k, v in deps.items() if v != "ok"}
        if issues and args.command not in ("template",):
            help_text = format_dependency_help(deps)
            if any(v == "missing" for v in issues.values()):
                print(help_text, file=sys.stderr)
                if args.command in ("export", "generate") and deps.get("mmdc") == "missing":
                    return 1

    if args.command == "types":
        sys.exit(cmd_types(args))
    elif args.command == "template":
        sys.exit(cmd_template(args))
    elif args.command == "validate":
        sys.exit(cmd_validate(args))
    elif args.command == "enforce":
        sys.exit(cmd_enforce(args))
    elif args.command == "style":
        sys.exit(cmd_style(args))
    elif args.command == "export":
        sys.exit(cmd_export(args))
    elif args.command == "schema":
        sys.exit(cmd_schema(args))
    elif args.command == "generate":
        sys.exit(cmd_generate(args))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
