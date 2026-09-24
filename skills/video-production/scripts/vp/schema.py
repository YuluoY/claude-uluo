"""JSON Schema 子集校验器（draft-07 的一部分关键字），免去 jsonschema 依赖。

只支持 SUPPORTED_KEYWORDS 里的关键字；schema 用到别的关键字时 unsupported_keywords() 会报出来，
测试保证项目自带的 schema 不越界。
"""
from __future__ import annotations

import re
from typing import Any

SUPPORTED_KEYWORDS = {
    "$schema", "$id", "$comment", "title", "description", "default", "examples",
    "type", "enum", "properties", "additionalProperties", "required",
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
    "minLength", "maxLength", "pattern", "items", "minItems", "maxItems",
}


def _type_ok(value: Any, t: str) -> bool:
    if t == "object":
        return isinstance(value, dict)
    if t == "array":
        return isinstance(value, list)
    if t == "string":
        return isinstance(value, str)
    if t == "boolean":
        return isinstance(value, bool)
    if t == "null":
        return value is None
    if t == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if t == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    raise ValueError(f"schema 中出现未知类型 {t!r}")


def _enum_eq(a: Any, b: Any) -> bool:
    # Python 中 True == 1，这里按 JSON 语义区分布尔与数字
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return a == b
    return type(a) is type(b) and a == b


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate(instance: Any, schema: dict, path: str = "$") -> list[str]:
    errors: list[str] = []

    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_type_ok(instance, t) for t in types):
            errors.append(f"{path}：类型应为 {'/'.join(types)}，实际为 {_describe(instance)}")
            return errors

    if "enum" in schema and not any(_enum_eq(instance, e) for e in schema["enum"]):
        allowed = ", ".join(_fmt(e) for e in schema["enum"])
        errors.append(f"{path}：取值 {_fmt(instance)} 不在可选范围内（{allowed}）")
        return errors

    if _is_number(instance):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{path}：{instance} 小于最小值 {schema['minimum']}")
        if "maximum" in schema and instance > schema["maximum"]:
            errors.append(f"{path}：{instance} 大于最大值 {schema['maximum']}")
        if "exclusiveMinimum" in schema and instance <= schema["exclusiveMinimum"]:
            errors.append(f"{path}：{instance} 必须大于 {schema['exclusiveMinimum']}")
        if "exclusiveMaximum" in schema and instance >= schema["exclusiveMaximum"]:
            errors.append(f"{path}：{instance} 必须小于 {schema['exclusiveMaximum']}")

    if isinstance(instance, str):
        if "minLength" in schema and len(instance) < schema["minLength"]:
            errors.append(f"{path}：长度不能小于 {schema['minLength']}")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            errors.append(f"{path}：长度不能大于 {schema['maxLength']}")
        if "pattern" in schema and re.search(schema["pattern"], instance) is None:
            errors.append(f"{path}：{instance!r} 不符合格式 {schema['pattern']}")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            errors.append(f"{path}：至少需要 {schema['minItems']} 项")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            errors.append(f"{path}：最多 {schema['maxItems']} 项")
        if isinstance(schema.get("items"), dict):
            for i, item in enumerate(instance):
                errors.extend(validate(item, schema["items"], f"{path}[{i}]"))

    if isinstance(instance, dict):
        props: dict = schema.get("properties", {})
        for key in schema.get("required", []):
            if key not in instance:
                errors.append(f"{path}：缺少字段 {key}")
        extra = schema.get("additionalProperties", True)
        for key, value in instance.items():
            child = f"{path}.{key}"
            if key in props:
                errors.extend(validate(value, props[key], child))
            elif extra is False:
                hint = _closest(key, props.keys())
                errors.append(f"{path}：未知字段 {key}" + (f"（是不是 {hint}？）" if hint else ""))
            elif isinstance(extra, dict):
                errors.extend(validate(value, extra, child))

    return errors


def unsupported_keywords(schema: Any, path: str = "$") -> list[str]:
    """列出 schema 中本校验器不支持的关键字。"""
    found: list[str] = []
    if not isinstance(schema, dict):
        return found
    for key, value in schema.items():
        if key not in SUPPORTED_KEYWORDS:
            found.append(f"{path}.{key}")
            continue
        if key == "properties":
            for prop, sub in value.items():
                found.extend(unsupported_keywords(sub, f"{path}.properties.{prop}"))
        elif key in ("items", "additionalProperties") and isinstance(value, dict):
            found.extend(unsupported_keywords(value, f"{path}.{key}"))
    return found


def _describe(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "boolean"
    if isinstance(v, int):
        return "integer"
    if isinstance(v, float):
        return "number"
    if isinstance(v, str):
        return "string"
    if isinstance(v, list):
        return "array"
    if isinstance(v, dict):
        return "object"
    return type(v).__name__


def _fmt(v: Any) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return f'"{v}"'
    return str(v)


def _closest(key: str, candidates) -> str | None:
    import difflib

    matches = difflib.get_close_matches(key, list(candidates), n=1, cutoff=0.75)
    return matches[0] if matches else None
