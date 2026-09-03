from commerce_analyst.learning import apply_learning_boost, compute_learning, verdict_from_delta
from commerce_analyst.week import merge_weekly_opportunities, week_dates_ending_on


def _inventory_opportunity(day: str, item_id: str, monthly: float) -> dict:
    return {
        "id": f"inventory-{item_id}",
        "category": "Inventory",
        "title": f"Zero-stock friction on {item_id}",
        "problem": "Users hit zero-stock views.",
        "likely_cause": "Availability",
        "evidence": [f"{item_id} blocked"],
        "recommendation": "Surface substitutes",
        "confidence": 0.7,
        "date": day,
        "estimated_monthly_revenue_usd": monthly,
        "impact": "High",
        "status": "Open",
        "metrics": {"item_id": item_id},
    }


def test_merge_weekly_opportunities_combines_same_sku() -> None:
    daily = [
        _inventory_opportunity("20260827", "V101", 1000),
        _inventory_opportunity("20260828", "V101", 2000),
        _inventory_opportunity("20260828", "V202", 500),
    ]
    merged = merge_weekly_opportunities(daily)
    assert len(merged) == 2
    top = merged[0]
    assert top["id"] == "week-inventory-V101"
    assert top["day_count"] == 2
    assert top["estimated_monthly_revenue_usd"] == 1500
    assert "Seen on 2 days" in top["evidence"][0]


def test_week_dates_ending_on() -> None:
    dates = ["20260825", "20260827", "20260828", "20260829"]
    assert week_dates_ending_on(dates, "20260829", 7) == dates
    assert week_dates_ending_on(dates, "20260828", 2) == ["20260827", "20260828"]
    assert week_dates_ending_on(dates, "20260829", 90) == dates


def test_learning_boost_prefers_successful_category() -> None:
    actions = [
        {"id": "a1", "category": "Inventory", "status": "applied"},
        {"id": "a2", "category": "Search", "status": "applied"},
    ]
    outcomes = [
        {"action_id": "a1", "verdict": "lift", "delta_pct": 0.2},
        {"action_id": "a2", "verdict": "worse", "delta_pct": -0.1},
    ]
    learning = compute_learning(actions, outcomes)
    inventory = next(row for row in learning["categories"] if row["category"] == "Inventory")
    search = next(row for row in learning["categories"] if row["category"] == "Search")
    assert inventory["boost"] > 1
    assert search["boost"] <= 1

    opportunities = [
        {"category": "Inventory", "confidence": 0.8, "estimated_monthly_revenue_usd": 1000},
        {"category": "Search", "confidence": 0.8, "estimated_monthly_revenue_usd": 1000},
    ]
    ranked = apply_learning_boost(opportunities, learning)
    assert ranked[0]["category"] == "Inventory"


def test_verdict_from_delta() -> None:
    assert verdict_from_delta(0.1, 3, 3) == "lift"
    assert verdict_from_delta(-0.1, 3, 3) == "worse"
    assert verdict_from_delta(0.01, 3, 3) == "flat"
    assert verdict_from_delta(0.1, 1, 3) == "inconclusive"
