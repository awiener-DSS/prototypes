from __future__ import annotations

import json
from typing import Any, Callable

from openai import OpenAI

from .config import Settings
from .tools import AnalyticsTools, CatalogTools

INSTRUCTIONS = """You are a read-only ecommerce analyst. Use the available GA4 and catalog tools
to answer questions with evidence. Never claim to change commerce, advertising, analytics,
or customer data. Dates passed to GA4 tools must be GA4 table suffixes in YYYYMMDD form.
Use get_product / find_related_products / search_catalog when an investigation involves SKUs
or search intent. ICM catalog enrichment is for product identity and related items only —
stock is NOT loaded into ICM for this site, so never treat ICM as inventory truth. Prefer
GA4 zero_stock / commerce events for availability friction. State data limitations clearly."""

GA4_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "end_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                },
                "required": ["start_date", "end_date"],
                "additionalProperties": False,
            },
        },
    }
    for name, description in [
        ("site_summary", "Get users, sessions, ecommerce steps, purchases, and revenue."),
        ("funnel", "Measure user progression from product view through purchase."),
        ("product_performance", "Rank products by views, adds, purchases, revenue, and conversion."),
        ("top_selling_products", "Rank best-selling products by purchase revenue or units sold."),
        ("search_performance", "Rank on-site search terms by searches and users."),
        ("segmentation", "Break users, purchases, and revenue down by device and acquisition source."),
        ("inventory_friction", "Find zero-stock PDP signals and cross-check whether the same SKU still receives add-to-cart events."),
        ("landing_page_performance", "Rank landing page paths by sessions, purchase rate, engagement, and revenue — find high-traffic low-quality landings."),
        ("acquisition_quality", "Compare source/medium/campaign traffic quality by purchase rate and revenue."),
    ]
]

PRODUCT_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "taxonomy_performance",
            "description": "Rank item brand or category by views, add-to-cart rate, purchases, and revenue — spot rising/falling demand.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "end_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "dimension": {"type": "string", "enum": ["brand", "category"]},
                },
                "required": ["start_date", "end_date"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search GA4 commerce events for SKUs or product names matching a query.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "end_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 25},
                },
                "required": ["start_date", "end_date", "query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "product_affinities",
            "description": "For a SKU, list products most often purchased in the same order or added in the same session cart.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "end_date": {"type": "string", "description": "Inclusive date, YYYYMMDD"},
                    "item_id": {"type": "string", "description": "Anchor SKU / item_id"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                },
                "required": ["start_date", "end_date", "item_id"],
                "additionalProperties": False,
            },
        },
    },
]

CATALOG_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_product",
            "description": "Fetch on-demand ICM product context for a SKU (name, related products). Stock is not available from ICM.",
            "parameters": {
                "type": "object",
                "properties": {"sku": {"type": "string", "description": "Product SKU / item id"}},
                "required": ["sku"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_related_products",
            "description": "Fetch ICM related/accessory products for a SKU.",
            "parameters": {
                "type": "object",
                "properties": {"sku": {"type": "string"}},
                "required": ["sku"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_catalog",
            "description": "Search the ICM catalog by keyword or partial SKU.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
]

TOOL_DEFINITIONS = [*GA4_TOOL_DEFINITIONS, *PRODUCT_TOOL_DEFINITIONS, *CATALOG_TOOL_DEFINITIONS]

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class CommerceAnalystAgent:
    def __init__(
        self,
        settings: Settings,
        tools: AnalyticsTools,
        client: Any | None = None,
        catalog: CatalogTools | None = None,
    ) -> None:
        self.settings = settings
        self.tools = tools
        self.catalog = catalog or CatalogTools(settings)
        self.client = client or OpenAI(
            api_key=settings.groq_api_key or None,
            base_url=GROQ_BASE_URL,
        )
        self.handlers: dict[str, Callable[..., Any]] = {
            "site_summary": tools.site_summary,
            "funnel": tools.funnel,
            "product_performance": tools.product_performance,
            "top_selling_products": tools.top_selling_products,
            "search_products": tools.search_products,
            "product_affinities": tools.product_affinities,
            "search_performance": tools.search_performance,
            "segmentation": tools.segmentation,
            "inventory_friction": tools.inventory_friction,
            "landing_page_performance": tools.landing_page_performance,
            "taxonomy_performance": tools.taxonomy_performance,
            "acquisition_quality": tools.acquisition_quality,
            "get_product": self.catalog.get_product,
            "find_related_products": self.catalog.find_related_products,
            "search_catalog": self.catalog.search_catalog,
        }

    def ask(self, question: str, *, max_rounds: int = 6) -> str:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": INSTRUCTIONS},
            {"role": "user", "content": question},
        ]
        for _ in range(max_rounds):
            response = self.client.chat.completions.create(
                model=self.settings.groq_model,
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
            )
            message = response.choices[0].message
            tool_calls = message.tool_calls or []
            if not tool_calls:
                return (message.content or "").strip()

            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in tool_calls
                ],
            })
            for call in tool_calls:
                try:
                    arguments = json.loads(call.function.arguments or "{}")
                    result = self.handlers[call.function.name](**arguments)
                    output = json.dumps({"ok": True, "data": result}, default=str)
                except Exception as exc:  # return a bounded tool error for model recovery
                    output = json.dumps({"ok": False, "error": str(exc)})
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": output,
                })
        raise RuntimeError("The analyst exceeded the maximum number of tool rounds")
