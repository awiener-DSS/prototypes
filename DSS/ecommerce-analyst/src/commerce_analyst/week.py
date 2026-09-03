"""Week rollup helpers for opportunity ranking."""

from __future__ import annotations

from typing import Any


def opportunity_merge_key(opportunity: dict[str, Any]) -> str:
    category = opportunity["category"]
    metrics = opportunity.get("metrics") or {}
    if category == "Inventory":
        return f"inventory:{metrics.get('item_id') or opportunity['id']}"
    if category == "Search":
        return f"search:{metrics.get('search_term') or opportunity['id']}"
    if category == "Funnel":
        return "funnel:view-cart"
    return f"anomaly:{opportunity['id']}"


def _impact_from_revenue(monthly: float | None) -> str:
    if monthly is None:
        return "Medium"
    if monthly >= 5000:
        return "High"
    if monthly >= 1000:
        return "Medium"
    return "Low"


def _average_monthly_estimates(values: list[float | None]) -> float | None:
    present = [value for value in values if value is not None]
    if not present:
        return None
    return round(sum(present) / len(present), 2)


def merge_weekly_opportunities(daily_opportunities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}

    for opportunity in daily_opportunities:
        key = opportunity_merge_key(opportunity)
        groups.setdefault(key, []).append(opportunity)

    merged: list[dict[str, Any]] = []
    for key, opportunities in groups.items():
        dates = sorted({opportunity["date"] for opportunity in opportunities})
        representative = max(
            opportunities,
            key=lambda item: item.get("estimated_monthly_revenue_usd") or -1,
        )
        averaged_monthly = _average_monthly_estimates(
            [opportunity.get("estimated_monthly_revenue_usd") for opportunity in opportunities]
        )
        evidence = [
            f"Seen on {len(dates)} day{'s' if len(dates) != 1 else ''} in the selected range",
            *list(dict.fromkeys(
                evidence
                for opportunity in opportunities
                for evidence in (opportunity.get("evidence") or [])
            )),
        ][:8] if len(dates) > 1 else list(dict.fromkeys(
            evidence
            for opportunity in opportunities
            for evidence in (opportunity.get("evidence") or [])
        ))[:8]

        merged.append({
            **representative,
            "id": f"week-{key.replace(':', '-')}",
            "merge_key": key,
            "confidence": max(opportunity["confidence"] for opportunity in opportunities),
            "estimated_monthly_revenue_usd": averaged_monthly,
            "impact": _impact_from_revenue(averaged_monthly),
            "week_dates": dates,
            "day_count": len(dates),
            "evidence": evidence,
            "metrics": {
                **{
                    metric_key: metric_value
                    for opportunity in opportunities
                    for metric_key, metric_value in (opportunity.get("metrics") or {}).items()
                }
            },
        })

    return sorted(
        merged,
        key=lambda item: (
            -(item.get("estimated_monthly_revenue_usd") or -1),
            -item["confidence"],
        ),
    )


def week_dates_ending_on(history_dates: list[str], week_end: str, size: int = 7) -> list[str]:
    sorted_dates = sorted(set(history_dates))
    try:
        end_index = sorted_dates.index(week_end)
    except ValueError:
        return sorted_dates[-size:]
    start = max(0, end_index - size + 1)
    return sorted_dates[start : end_index + 1]
