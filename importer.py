from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, Iterable, List, Optional

_ENTITY_TYPE_MAP = {
    "product": "Product",
    "service": "Service",
    "article": "Article",
    "category": "Category",
    "org": "Organization",
    "faq": "FAQPage",
}


def normalize_entity_type(value: Any) -> Optional[str]:
    if value is None:
        return None

    normalized = str(value).strip().lower()
    if not normalized:
        return None

    return _ENTITY_TYPE_MAP.get(normalized)


def normalize_project(project: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize project-level settings used by the importer.

    languages are stored per project and default to ['ru'] if not provided.
    """
    normalized = deepcopy(project)
    languages = normalized.get("languages")

    if not isinstance(languages, list) or not [lang for lang in languages if str(lang).strip()]:
        normalized["languages"] = ["ru"]
    else:
        normalized["languages"] = [str(lang).strip() for lang in languages if str(lang).strip()]

    return normalized


def parse_price_value(value: Any) -> Optional[float]:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    cleaned = raw.replace("₸", "").replace(" ", "")

    if "," in cleaned and "." not in cleaned:
        parts = cleaned.split(",")
        if len(parts) > 1 and all(part.isdigit() for part in parts):
            # Treat as thousands groups if every group after the first has 3 digits (e.g. 5,000).
            if all(len(part) == 3 for part in parts[1:]):
                cleaned = "".join(parts)
            else:
                cleaned = cleaned.replace(",", ".", 1)
        else:
            cleaned = cleaned.replace(",", "")
    else:
        cleaned = cleaned.replace(",", "")

    try:
        return float(cleaned)
    except ValueError:
        return None


def normalize_row(row: Dict[str, Any], project: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Normalize a single imported row safely and predictably."""
    normalized: Dict[str, Any] = {k: v for k, v in row.items() if not str(k).startswith("attr_")}

    entity_type = normalize_entity_type(row.get("entityType"))
    if entity_type:
        normalized["entityType"] = entity_type

    if project is not None:
        normalized["project"] = normalize_project(project)

    attrs: Dict[str, Any] = {}
    for key, value in row.items():
        key_str = str(key)
        if not key_str.startswith("attr_"):
            continue
        attr_name = key_str[len("attr_") :]
        if not attr_name:
            continue
        attrs[attr_name] = value

    source_fields = normalized.get("sourceFields")
    if not isinstance(source_fields, dict):
        source_fields = {}

    existing_attrs = source_fields.get("attrs")
    if not isinstance(existing_attrs, dict):
        existing_attrs = {}

    existing_attrs.update(attrs)
    source_fields["attrs"] = existing_attrs
    normalized["sourceFields"] = source_fields

    for price_key in ("price_from", "price_to"):
        if price_key in row:
            normalized[price_key] = parse_price_value(row.get(price_key))

    for passthrough_key in ("currency", "availability"):
        if passthrough_key in row:
            normalized[passthrough_key] = row.get(passthrough_key)

    return normalized


def normalize_rows(rows: Iterable[Dict[str, Any]], project: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    normalized_project = normalize_project(project or {})
    return [normalize_row(row, project=normalized_project) for row in rows]
