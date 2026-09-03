from commerce_analyst.config import Settings
from commerce_analyst.tools import AnalyticsTools


class RecordingQueries:
    def __init__(self):
        self.sql = ""
        self.parameters = {}

    def run(self, sql, parameters=None):
        self.sql = sql
        self.parameters = parameters
        return [{"users": 10}]


def test_site_summary_targets_configured_export_and_parameters_dates() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)
    assert tools.site_summary("20260801", "20260802") == [{"users": 10}]
    assert "`p.analytics_1.events_*`" in queries.sql
    assert "@start_date" in queries.sql
    assert queries.parameters == {"start_date": "20260801", "end_date": "20260802"}


def test_all_five_tool_methods_are_available() -> None:
    tools = AnalyticsTools(Settings(), RecordingQueries())
    assert {
        "site_summary",
        "funnel",
        "product_performance",
        "search_performance",
        "segmentation",
        "inventory_friction",
        "top_selling_products",
        "search_products",
        "product_affinities",
        "available_event_dates",
        "daily_performance",
    } <= set(dir(tools))


def test_revenue_tools_use_normalized_usd_fields() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)
    tools.site_summary("20260801", "20260802")
    assert "purchase_revenue_in_usd" in queries.sql
    tools.product_performance("20260801", "20260802")
    assert "item_revenue_in_usd" in queries.sql
    tools.segmentation("20260801", "20260802")
    assert "purchase_revenue_in_usd" in queries.sql


def test_tools_reject_invalid_date_ranges() -> None:
    tools = AnalyticsTools(
        Settings(gcp_project_id="p", ga4_dataset="analytics_1"), RecordingQueries()
    )
    import pytest
    with pytest.raises(ValueError, match="YYYYMMDD"):
        tools.site_summary("2026-08-01", "20260802")
    with pytest.raises(ValueError, match="cannot be after"):
        tools.site_summary("20260803", "20260802")


def test_inventory_friction_supports_numeric_skus() -> None:
    queries = RecordingQueries()
    tools = AnalyticsTools(Settings(gcp_project_id="p", ga4_dataset="analytics_1"), queries)
    tools.inventory_friction("20260801", "20260802")
    sql = queries.sql
    assert "value.int_value" in sql
    assert "cart_adds" in sql
    assert "oos_pattern" in sql
