from commerce_analyst.config import Settings
from commerce_analyst.tools import AnalyticsTools


class RecordingQueries:
    def __init__(self):
        self.calls: list[tuple[str, dict]] = []

    def run(self, sql, parameters=None):
        self.calls.append((sql, parameters or {}))
        if "GROUP BY item.item_id" in sql and "units_sold" in sql:
            return [{"item_id": "A-1", "item_name": "5 x 5&#47;8 Brush", "units_sold": 10, "orders": 4, "item_revenue_usd": 99.5}]
        if "order_lines AS" in sql and "GROUP BY ol.item_id" in sql:
            return [{"item_id": "B-1", "item_name": "Buddy SKU", "co_occurrences": 3}]
        if "cart_lines AS" in sql and "GROUP BY cl.item_id" in sql:
            return [{"item_id": "C-1", "item_name": "Cart Buddy", "co_occurrences": 2}]
        if "AS anchor_orders" in sql:
            return [{"anchor_orders": 5}]
        if "AS anchor_sessions" in sql:
            return [{"anchor_sessions": 8}]
        if "ANY_VALUE(item.item_name)" in sql:
            return [{"item_name": "Anchor Glove"}]
        if "event_rows" in sql:
            return [{"item_id": "A-1", "item_name": "Top SKU", "event_rows": 12}]
        return []


def test_top_selling_products_uses_purchase_events_and_limit() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)
    rows = tools.top_selling_products("20260801", "20260807", limit=10, sort="units")
    assert rows[0]["item_id"] == "A-1"
    assert rows[0]["item_name"] == "5 x 5/8 Brush"


def test_top_selling_products_decodes_named_entities() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)

    def run_with_ndash(sql, parameters=None):
        queries.calls.append((sql, parameters or {}))
        if "GROUP BY item.item_id" in sql and "units_sold" in sql:
            return [{"item_id": "W-1", "item_name": "Chest Waders &ndash; Steel", "units_sold": 1, "orders": 1, "item_revenue_usd": 10}]
        return []

    queries.run = run_with_ndash  # type: ignore[method-assign]
    rows = tools.top_selling_products("20260801", "20260807")
    assert rows[0]["item_name"] == "Chest Waders – Steel"


def test_search_products_requires_query() -> None:
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), RecordingQueries())
    import pytest
    with pytest.raises(ValueError, match="query is required"):
        tools.search_products("20260801", "20260807", "  ")


def test_product_affinities_returns_basket_sections() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)
    payload = tools.product_affinities("20260801", "20260807", "V101", limit=5)
    assert payload["anchor_item_id"] == "V101"
    assert payload["anchor_item_name"] == "Anchor Glove"
    assert payload["purchased_together"][0]["item_id"] == "B-1"
    assert payload["cart_together"][0]["item_id"] == "C-1"
    assert any("order_lines" in sql for sql, _ in queries.calls)
    assert any("cart_lines" in sql for sql, _ in queries.calls)
