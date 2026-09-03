from __future__ import annotations

from typing import Any

from .detect import detect_opportunities
from .tools import AnalyticsTools


def build_daily_report(tools: AnalyticsTools, date: str, *, opportunity_limit: int = 3) -> dict[str, Any]:
    """Build a bounded GA4-only report without invoking an AI model."""

    detection = detect_opportunities(tools, date, limit=opportunity_limit)
    return {
        "date": date,
        "site_summary": tools.site_summary(date, date),
        "funnel": tools.funnel(date, date),
        "top_products": tools.product_performance(date, date)[:10],
        "top_searches": tools.search_performance(date, date)[:10],
        "inventory_friction": tools.inventory_friction(date, date)[:10],
        "top_segments": tools.segmentation(date, date)[:10],
        "opportunities": detection["opportunities"],
        "detection": {
            "baseline_days": detection["baseline_days"],
            "baseline_ready": detection["baseline_ready"],
            "site_aov_usd": detection["site_aov_usd"],
        },
        "notes": [
            "Revenue aggregates are normalized to USD.",
            "GA4 contains online behavior and purchases only; returns and offline orders are excluded.",
            "Customer-account enrichment is not included in the MVP.",
            *detection["notes"],
        ],
    }
