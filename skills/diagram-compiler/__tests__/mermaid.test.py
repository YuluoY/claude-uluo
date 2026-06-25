#!/usr/bin/env python3
"""diagram-compiler mermaid.py 核心功能测试。

通过 subprocess 调用 CLI 测试，避免复杂的模块导入路径问题。
覆盖：template / types / enforce（合法+非法）/ schema 五个核心场景。
"""
import subprocess
import sys
import tempfile
from pathlib import Path

# mermaid.py 脚本路径
SKILL_ROOT = Path(__file__).resolve().parent.parent
MERMAID_PY = SKILL_ROOT / "scripts" / "_shared" / "mermaid.py"


def _run_cli(*args) -> subprocess.CompletedProcess:
    """调用 mermaid.py CLI，返回 CompletedProcess。"""
    cmd = [sys.executable, str(MERMAID_PY), *args]
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(SKILL_ROOT),
    )


def _write_tmp(content: str) -> Path:
    """写入临时文件，返回路径。"""
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".mmd", delete=False, encoding="utf-8"
    )
    tmp.write(content)
    tmp.close()
    return Path(tmp.name)


def test_template_flowchart():
    """测试 flowchart 模板生成：返回结果应包含 flowchart 关键字与方向声明。"""
    result = _run_cli("template", "--type", "flowchart")
    assert result.returncode == 0, f"template 命令失败: {result.stderr}"
    assert "flowchart" in result.stdout, "输出应包含 'flowchart' 关键字"
    # 模板应包含方向声明（TD/LR/TB 等）
    assert any(d in result.stdout for d in ("TD", "LR", "TB", "RL", "BT")), \
        "模板应包含方向声明"
    # 应注入默认样式
    assert "%%{init:" in result.stdout, "模板应注入默认样式 init 声明"
    print("✓ test_template_flowchart 通过")


def test_types_command():
    """测试 types 命令列出所有图表类型。"""
    result = _run_cli("types")
    assert result.returncode == 0, f"types 命令失败: {result.stderr}"
    # 应列出核心类型
    expected_types = ["flowchart", "sequence", "er", "class", "state",
                      "gantt", "pie", "git", "mindmap", "timeline",
                      "quadrant", "sankey", "c4", "radar", "journey", "swimlane"]
    for t in expected_types:
        assert t in result.stdout, f"types 输出应包含类型 '{t}'"
    print("✓ test_types_command 通过")


def test_enforce_valid_mermaid():
    """测试 enforce 校验合法 Mermaid 代码：应成功注入样式并返回原结构。"""
    valid_diagram = """sequenceDiagram
    participant U as 用户
    participant S as 服务端
    U->>S: 发送请求
    S-->>U: 响应数据"""
    tmp_file = _write_tmp(valid_diagram)

    try:
        result = _run_cli("enforce", str(tmp_file), "--type", "sequence")
        assert result.returncode == 0, f"enforce 合法代码失败: {result.stderr}"
        # 应注入样式
        assert "%%{init:" in result.stdout, "应注入默认样式"
        # 应保留 participant 声明（合法 ASCII ID 不应被修改）
        assert "participant U as 用户" in result.stdout, \
            "合法 participant ID 不应被修改"
        # 不应出现修正记录
        assert "已修正 participant ID" not in result.stdout, \
            "合法代码不应触发 participant ID 修正"
    finally:
        tmp_file.unlink(missing_ok=True)
    print("✓ test_enforce_valid_mermaid 通过")


def test_enforce_invalid_chinese_participant():
    """测试 enforce 拒绝/修正中文 participant ID。"""
    # participant ID 直接使用中文（违反规则）
    invalid_diagram = """sequenceDiagram
    participant 用户 as 用户
    participant S as 服务端
    用户->>S: 发送请求
    S-->>用户: 响应数据"""
    tmp_file = _write_tmp(invalid_diagram)

    try:
        result = _run_cli("enforce", str(tmp_file), "--type", "sequence")
        assert result.returncode == 0, f"enforce 非法代码处理失败: {result.stderr}"
        # 应触发修正记录
        assert "已修正 participant ID" in result.stdout, \
            "应检测到中文 participant ID 并修正"
        # 修正后应使用 ASCII ID + 中文别名
        assert "participant P" in result.stdout, \
            "修正后应使用 P 开头的 ASCII ID"
        assert "as 用户" in result.stdout, \
            "修正后应保留中文别名"
        # 连线中的中文 ID 引用也应被更新
        assert "用户->>" not in result.stdout, \
            "连线中的中文 ID 引用应被替换为 ASCII ID"
    finally:
        tmp_file.unlink(missing_ok=True)
    print("✓ test_enforce_invalid_chinese_participant 通过")


def test_schema_quadrant():
    """测试 schema 返回 quadrant 数据结构说明。"""
    result = _run_cli("schema", "--type", "quadrant")
    assert result.returncode == 0, f"schema 命令失败: {result.stderr}"
    # 应包含数据结构关键字段
    expected_fields = ["title", "x_axis", "y_axis", "quadrants", "items"]
    for field in expected_fields:
        assert field in result.stdout, f"schema 输出应包含字段 '{field}'"
    # 应包含 YAML 格式说明
    assert "YAML" in result.stdout or "yaml" in result.stdout.lower(), \
        "schema 应说明数据格式为 YAML"
    # 应包含坐标范围说明
    assert "0.0" in result.stdout or "0-1" in result.stdout, \
        "schema 应说明坐标范围 [0, 1]"
    print("✓ test_schema_quadrant 通过")


if __name__ == "__main__":
    test_template_flowchart()
    test_types_command()
    test_enforce_valid_mermaid()
    test_enforce_invalid_chinese_participant()
    test_schema_quadrant()
    print("\n🎉 All tests passed!")
