import unittest

from importer import normalize_project, normalize_row, normalize_rows


class TestImporterNormalization(unittest.TestCase):
    def test_entity_type_normalization(self):
        row = {"entityType": "fAq"}

        normalized = normalize_row(row)

        self.assertEqual(normalized["entityType"], "FAQPage")

    def test_unknown_entity_type_is_ignored(self):
        row = {"entityType": "something_else"}

        normalized = normalize_row(row)

        self.assertEqual(normalized.get("entityType"), "something_else")

    def test_project_languages_default_to_ru(self):
        project = {"name": "test", "languages": []}

        normalized = normalize_project(project)

        self.assertEqual(normalized["languages"], ["ru"])

    def test_normalize_rows_uses_single_project_language_config(self):
        rows = [{"entityType": "product"}, {"entityType": "service"}]
        project = {"languages": []}

        normalized_rows = normalize_rows(rows, project)

        self.assertEqual(normalized_rows[0]["project"]["languages"], ["ru"])
        self.assertEqual(normalized_rows[1]["project"]["languages"], ["ru"])

    def test_attr_columns_moved_to_source_fields_attrs(self):
        row = {
            "title": "Offer",
            "attr_color": "red",
            "attr_size": "L",
            "attr_": "bad",
        }

        normalized = normalize_row(row)

        self.assertEqual(normalized["sourceFields"]["attrs"], {"color": "red", "size": "L"})
        self.assertNotIn("attr_color", normalized)

    def test_price_fields_parse_messy_numeric_values(self):
        row = {
            "price_from": " 1 200,50 ₸",
            "price_to": "5,000",
            "currency": "KZT",
            "availability": "in_stock",
        }

        normalized = normalize_row(row)

        self.assertEqual(normalized["price_from"], 1200.5)
        self.assertEqual(normalized["price_to"], 5000.0)
        self.assertEqual(normalized["currency"], "KZT")
        self.assertEqual(normalized["availability"], "in_stock")


if __name__ == "__main__":
    unittest.main()
