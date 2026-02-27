from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import html
import json
from typing import Iterable


@dataclass(frozen=True)
class ExportRow:
    lang: str
    title: str
    description: str
    h1: str
    schema_json: str


class SchemaValidationError(ValueError):
    """Raised when at least one row contains invalid schema JSON."""


def _validate_schema_json(schema_json: str, row_index: int) -> str:
    try:
        data = json.loads(schema_json)
    except json.JSONDecodeError as exc:
        raise SchemaValidationError(f"Row {row_index}: invalid schema JSON: {exc.msg}") from exc

    # Minify and prevent accidental script tag break-out.
    normalized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return normalized.replace("</script>", "<\\/script>")


def _meta_warnings(description: str, row_index: int) -> list[str]:
    warnings: list[str] = []
    cleaned = description.strip()
    if not cleaned:
        warnings.append(f"Row {row_index}: meta description is empty")
    if len(cleaned) > 160:
        warnings.append(
            f"Row {row_index}: meta description length is {len(cleaned)} (recommended <= 160)"
        )
    return warnings


def _render_snippet(row: ExportRow, normalized_schema_json: str) -> str:
    safe_title = html.escape(row.title, quote=False)
    safe_h1 = html.escape(row.h1, quote=False)
    safe_meta_description = html.escape(row.description, quote=True)

    return "\n".join(
        [
            f"<title>{safe_title}</title>",
            f'<meta name="description" content="{safe_meta_description}">',
            f"<h1>{safe_h1}</h1>",
            '<script type="application/ld+json">',
            normalized_schema_json,
            "</script>",
        ]
    )


def export_html_per_lang(rows: Iterable[ExportRow], output_dir: str | Path) -> list[str]:
    """Export one combined HTML file per language.

    Returns a list of warnings (meta validation only).
    Raises SchemaValidationError when any schema JSON is invalid.
    """

    rows_list = list(rows)
    normalized_by_row: list[str] = []
    warnings: list[str] = []

    # Validate first so no files are written when schema is invalid.
    for index, row in enumerate(rows_list, start=1):
        normalized_by_row.append(_validate_schema_json(row.schema_json, index))
        warnings.extend(_meta_warnings(row.description, index))

    by_lang: dict[str, list[str]] = {}
    for row, normalized_schema_json in zip(rows_list, normalized_by_row):
        by_lang.setdefault(row.lang, []).append(_render_snippet(row, normalized_schema_json))

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    for lang, snippets in by_lang.items():
        full_html = "\n".join(
            [
                "<!doctype html>",
                f'<html lang="{html.escape(lang, quote=True)}">',
                "<head>",
                '<meta charset="utf-8">',
                f"<title>SEO export ({html.escape(lang, quote=False)})</title>",
                "</head>",
                "<body>",
                "\n\n".join(snippets),
                "</body>",
                "</html>",
            ]
        )
        (out / f"{lang}.html").write_text(full_html, encoding="utf-8")

    return warnings
