from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Opportunity:
    """Structured revenue opportunity for the detect → recommend loop."""

    id: str
    category: str
    title: str
    problem: str
    likely_cause: str
    evidence: list[str]
    recommendation: str
    confidence: float
    date: str
    estimated_monthly_revenue_usd: float | None = None
    impact: str = "Medium"
    status: str = "Open"
    metrics: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 0 <= self.confidence <= 1:
            raise ValueError("confidence must be between 0 and 1")
        if self.impact not in {"High", "Medium", "Low"}:
            raise ValueError("impact must be High, Medium, or Low")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def impact_from_revenue(monthly_usd: float | None) -> str:
    if monthly_usd is None:
        return "Medium"
    if monthly_usd >= 5_000:
        return "High"
    if monthly_usd >= 1_000:
        return "Medium"
    return "Low"


def average_order_value(site_summary: dict[str, Any]) -> float | None:
    revenue = float(site_summary.get("revenue_usd") or 0)
    purchases = float(site_summary.get("purchases") or 0)
    if purchases <= 0 or revenue <= 0:
        return None
    return revenue / purchases
