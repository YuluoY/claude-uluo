from __future__ import annotations


class VPError(Exception):
    """可预期的失败：配置错误、缺依赖、命令失败等。CLI 捕获后打印信息并以 1 退出。"""
