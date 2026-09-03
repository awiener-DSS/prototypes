"""Learning weights from measured fix outcomes."""

from __future__ import annotations

from typing import Any, Literal

OutcomeVerdict = Literal["lift", "flat", "worse", "inconclusive"]


def verdict_from_delta(delta_pct: float | None, before_days: int, after_days: int) -> OutcomeVerdict:
    if delta_pct is None or before_days < 2 or after_days < 2:
        return "inconclusive"
    if delta_pct >= 0.05:
        return "lift"
    if delta_pct <= -0.05:
        return "worse"
    return "flat"


def _category_boost(success_rate: float | None, avg_lift: float | None, measured: int) -> float:
    if not measured or success_rate is None:
        return 1.0
    if success_rate >= 0.66 and (avg_lift or 0) > 0.1:
        return 1.12
    if success_rate >= 0.5:
        return 1.06
    if success_rate <= 0.2 and measured >= 2:
        return 0.92
    return 1.0


def compute_learning(actions: list[dict[str, Any]], outcomes: list[dict[str, Any]]) -> dict[str, Any]:
    applied = [action for action in actions if action.get("status") == "applied"]
    outcomes_by_action = {outcome["action_id"]: outcome for outcome in outcomes}
    categories = ["Inventory", "Search", "Funnel", "Anomaly"]
    category_rows = []

    for category in categories:
        related = [action for action in applied if action.get("category") == category]
        measured_outcomes = [
            outcomes_by_action[action["id"]]
            for action in related
            if action["id"] in outcomes_by_action
        ]
        successes = [outcome for outcome in measured_outcomes if outcome.get("verdict") == "lift"]
        lifts = [outcome["delta_pct"] for outcome in measured_outcomes if outcome.get("delta_pct") is not None]
        success_rate = len(successes) / len(measured_outcomes) if measured_outcomes else None
        avg_lift = sum(lifts) / len(lifts) if lifts else None
        boost = _category_boost(success_rate, avg_lift, len(measured_outcomes))
        if measured_outcomes:
            avg_text = f" (avg {avg_lift * 100:.0f}%)" if avg_lift is not None else ""
            insight = (
                f"{category}: {len(successes)}/{len(measured_outcomes)} applied fixes showed lift{avg_text}."
            )
        else:
            insight = f"{category}: no measured outcomes yet — using detector defaults."
        category_rows.append(
            {
                "category": category,
                "attempts": len(related),
                "measured": len(measured_outcomes),
                "successes": len(successes),
                "success_rate": success_rate,
                "avg_lift_pct": avg_lift,
                "boost": boost,
                "insight": insight,
            }
        )

    measured_rows = [row for row in category_rows if row["measured"] > 0]
    global_insight = (
        "Learning loop active across "
        f"{len(measured_rows)} categories. Recommendations are boosted when similar fixes previously lifted target metrics."
        if measured_rows
        else "Learning loop is collecting outcomes. Apply fixes and revisit after a few days to sharpen recommendations."
    )
    return {"categories": category_rows, "global_insight": global_insight}


def apply_learning_boost(opportunities: list[dict[str, Any]], learning: dict[str, Any]) -> list[dict[str, Any]]:
    boosts = {row["category"]: row["boost"] for row in learning["categories"]}
    ranked = []
    for opportunity in opportunities:
        learning_boost = boosts.get(opportunity["category"], 1.0)
        base = opportunity.get("estimated_monthly_revenue_usd")
        if base is None:
            base = opportunity["confidence"] * 1000
        ranked.append(
            {
                **opportunity,
                "learning_boost": learning_boost,
                "adjusted_score": round(base * learning_boost, 2),
            }
        )
    return sorted(ranked, key=lambda item: -(item.get("adjusted_score") or -1))
