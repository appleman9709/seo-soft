from pathlib import Path

import pytest

from html_exporter import ExportRow, SchemaValidationError, export_html_per_lang


def test_exports_single_combined_html_per_language(tmp_path: Path) -> None:
    rows = [
        ExportRow(
            lang="en",
            title="A & B",
            description='Quoted "description"',
            h1="Main <Headline>",
            schema_json='{"@context":"https://schema.org","name":"X"}',
        ),
        ExportRow(
            lang="en",
            title="Second",
            description="Another",
            h1="Another H1",
            schema_json='{"@context":"https://schema.org","name":"Y"}',
        ),
        ExportRow(
            lang="fr",
            title="Bonjour",
            description="Description FR",
            h1="Titre",
            schema_json='{"@context":"https://schema.org","name":"Z"}',
        ),
    ]

    warnings = export_html_per_lang(rows, tmp_path)

    assert warnings == []
    assert (tmp_path / "en.html").exists()
    assert (tmp_path / "fr.html").exists()

    en_html = (tmp_path / "en.html").read_text(encoding="utf-8")
    assert '<meta name="description" content="Quoted &quot;description&quot;">' in en_html
    assert "<h1>Main &lt;Headline&gt;</h1>" in en_html
    assert en_html.count('<script type="application/ld+json">') == 2


def test_blocks_export_when_schema_json_invalid(tmp_path: Path) -> None:
    rows = [
        ExportRow(
            lang="en",
            title="Title",
            description="Description",
            h1="H1",
            schema_json='{"@context":"https://schema.org",}',
        )
    ]

    with pytest.raises(SchemaValidationError):
        export_html_per_lang(rows, tmp_path)

    assert not list(tmp_path.iterdir())


def test_warns_for_invalid_meta_description(tmp_path: Path) -> None:
    rows = [
        ExportRow(
            lang="en",
            title="Title",
            description="   ",
            h1="H1",
            schema_json='{"ok":true}',
        ),
        ExportRow(
            lang="en",
            title="Title 2",
            description="x" * 161,
            h1="H1 2",
            schema_json='{"ok":true}',
        ),
    ]

    warnings = export_html_per_lang(rows, tmp_path)

    assert len(warnings) == 2
    assert "meta description is empty" in warnings[0]
    assert "recommended <= 160" in warnings[1]
