from commerce_analyst.report import build_daily_report


class FakeTools:
    def site_summary(self, start, end): return [{"users": 10, "purchases": 2, "revenue_usd": 100}]
    def funnel(self, start, end):
        return [{
            "viewed_users": 100, "cart_users": 20, "checkout_users": 10, "purchasers": 8,
            "view_to_cart_rate": 0.2, "checkout_conversion_rate": 0.8,
        }]
    def product_performance(self, start, end):
        return [{"item_id": f"p{i}"} for i in range(20)]
    def search_performance(self, start, end):
        rows = [{"search_term": "gloves", "searches": 8, "result_views": 0, "no_result_events": 0, "users": 2}]
        rows.extend({"search_term": f"q{i}", "searches": 1, "result_views": 1, "no_result_events": 0, "users": 1} for i in range(19))
        return rows
    def inventory_friction(self, start, end):
        rows = [{"item_id": "SKU-1", "zero_stock_views": 5, "affected_users": 2}]
        rows.extend({"item_id": f"SKU-{i}", "zero_stock_views": 1, "affected_users": 1} for i in range(19))
        return rows
    def segmentation(self, start, end):
        return [{"device": "desktop"} for _ in range(20)]
    def available_event_dates(self): return ["20260827"]
    def daily_performance(self, start, end): return []


def test_daily_report_is_bounded_and_documents_limits() -> None:
    report = build_daily_report(FakeTools(), "20260827")
    assert report["date"] == "20260827"
    assert len(report["top_products"]) == 10
    assert len(report["top_searches"]) == 10
    assert len(report["inventory_friction"]) == 10
    assert report["opportunities"]
    assert report["detection"]["baseline_ready"] is False
    assert any("returns" in note for note in report["notes"])
    assert any("deterministic detectors" in note for note in report["notes"])
