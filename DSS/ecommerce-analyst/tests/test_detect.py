from commerce_analyst.detect import detect_opportunities
from commerce_analyst.opportunity import Opportunity, average_order_value, impact_from_revenue


class FakeTools:
    def __init__(self, *, dates=None, series=None):
        self._dates = dates or ["20260827"]
        self._series = series

    def site_summary(self, start, end):
        return [{"users": 583, "purchases": 53, "revenue_usd": 42330.75, "sessions": 975}]

    def funnel(self, start, end):
        return [{
            "viewed_users": 388,
            "cart_users": 60,
            "checkout_users": 45,
            "purchasers": 43,
            "view_to_cart_rate": 0.15463917525773196,
            "checkout_conversion_rate": 0.9555555555555556,
        }]

    def search_performance(self, start, end):
        return [{
            "search_term": "3 ton electric chain hoist",
            "searches": 7,
            "result_views": 0,
            "no_result_events": 0,
            "users": 1,
        }]

    def inventory_friction(self, start, end):
        return [{
            "item_id": "V3520250-M",
            "zero_stock_views": 9,
            "affected_users": 3,
            "cart_adds": 0,
            "cart_users": 0,
            "purchases": 0,
            "oos_pattern": "oos_messaging_only",
        }]

    def available_event_dates(self):
        return list(self._dates)

    def daily_performance(self, start, end):
        if self._series is not None:
            return self._series
        return [{
            "report_date": "20260827",
            "users": 583,
            "sessions": 975,
            "purchases": 53,
            "revenue_usd": 42330.75,
            "viewed_users": 388,
            "cart_users": 60,
            "checkout_users": 45,
            "purchasers": 43,
            "view_to_cart_rate": 0.1546,
            "checkout_conversion_rate": 0.9556,
            "revenue_per_session": 43.42,
        }]


def test_average_order_value_and_impact() -> None:
    assert average_order_value({"revenue_usd": 100, "purchases": 4}) == 25
    assert impact_from_revenue(6000) == "High"
    assert impact_from_revenue(1500) == "Medium"
    assert impact_from_revenue(100) == "Low"


def test_opportunity_rejects_invalid_confidence() -> None:
    import pytest
    with pytest.raises(ValueError):
        Opportunity(
            id="x", category="Funnel", title="t", problem="p", likely_cause="c",
            evidence=[], recommendation="r", confidence=1.5, date="20260827",
        )


def test_detect_ranks_top_opportunities_without_baseline() -> None:
    result = detect_opportunities(FakeTools(), "20260827", limit=3)
    assert result["date"] == "20260827"
    assert result["baseline_ready"] is False
    assert result["baseline_days"] == 0
    assert len(result["opportunities"]) == 3
    categories = {item["category"] for item in result["opportunities"]}
    assert categories == {"Inventory", "Search", "Funnel"}
    assert all("estimated_monthly_revenue_usd" in item for item in result["opportunities"])
    assert result["opportunities"][0]["estimated_monthly_revenue_usd"] >= (
        result["opportunities"][1]["estimated_monthly_revenue_usd"] or 0
    )


def test_detect_inventory_backorder_pattern() -> None:
    class BackorderTools(FakeTools):
        def inventory_friction(self, start, end):
            return [{
                "item_id": "V3520250-M",
                "zero_stock_views": 12,
                "affected_users": 4,
                "cart_adds": 6,
                "cart_users": 3,
                "purchases": 2,
                "oos_pattern": "backorder_allowed",
            }]

    result = detect_opportunities(BackorderTools(), "20260827", limit=3)
    inventory = next(item for item in result["opportunities"] if item["category"] == "Inventory")
    assert inventory["category"] == "Inventory"
    assert "cart adds still occur" in inventory["title"]
    assert inventory["metrics"]["oos_pattern"] == "backorder_allowed"
    assert inventory["metrics"]["recovery_rate"] == 0.05


def test_detect_emits_revenue_anomaly_when_baseline_ready() -> None:
    dates = [f"202608{str(day).zfill(2)}" for day in range(20, 28)]
    series = []
    for day in dates:
        series.append({
            "report_date": day,
            "sessions": 1000,
            "revenue_usd": 50_000 if day < "20260827" else 30_000,
            "revenue_per_session": 50.0 if day < "20260827" else 30.0,
            "view_to_cart_rate": 0.20 if day < "20260827" else 0.10,
            "viewed_users": 400,
            "cart_users": 80,
            "checkout_users": 50,
            "purchasers": 40,
            "checkout_conversion_rate": 0.8,
            "users": 500,
            "purchases": 40,
        })
    result = detect_opportunities(FakeTools(dates=dates, series=series), "20260827", limit=5)
    assert result["baseline_ready"] is True
    ids = {item["id"] for item in result["opportunities"]}
    assert "anomaly-revenue-per-session" in ids
