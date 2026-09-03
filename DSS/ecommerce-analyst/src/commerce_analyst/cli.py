from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta

from .agent import CommerceAnalystAgent
from .bigquery import BigQueryRunner
from .config import ConfigurationPendingError, SiteRegistry, get_settings
from .detect import detect_opportunities
from .query_runner import run_sql_file
from .report import build_daily_report
from .tools import AnalyticsTools, CatalogTools


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Read-only GA4 ecommerce analyst")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("sites", help="List configured sites")
    commands.add_parser("status", help="Show configuration readiness")
    check = commands.add_parser("check-bigquery", help="Run a zero-data connectivity check")
    check.add_argument("--site", default="")
    query = commands.add_parser("query", help="Run a checked-in read-only SQL file")
    query.add_argument("--site", default="")
    query.add_argument("--sql-file", required=True)
    query.add_argument("--start-date", required=True)
    query.add_argument("--end-date", required=True)
    ask = commands.add_parser("ask", help="Ask the AI analyst")
    ask.add_argument("--site", default="")
    ask.add_argument("question")
    report = commands.add_parser("report", help="Build a GA4-only daily report without AI")
    report.add_argument("--site", default="")
    report.add_argument("--date", required=True, help="Date in YYYYMMDD format")
    opportunities = commands.add_parser(
        "opportunities",
        help="Detect and rank revenue opportunities without AI",
    )
    opportunities.add_argument("--site", default="")
    opportunities.add_argument("--date", required=True, help="Date in YYYYMMDD format")
    opportunities.add_argument("--limit", type=int, default=3, help="Max opportunities to return")
    top_products = commands.add_parser("top-products", help="Rank top-selling products from purchase events")
    top_products.add_argument("--site", default="")
    top_products.add_argument("--date", required=True, help="End date in YYYYMMDD format")
    top_products.add_argument("--days", type=int, default=90, help="Rolling window size ending on --date")
    top_products.add_argument("--limit", type=int, default=25)
    top_products.add_argument("--sort", choices=["revenue", "units", "orders"], default="orders")
    product_affinity = commands.add_parser(
        "product-affinity",
        help="Find products frequently purchased or carted with a given SKU",
    )
    product_affinity.add_argument("--site", default="")
    product_affinity.add_argument("--date", required=True, help="End date in YYYYMMDD format")
    product_affinity.add_argument("--days", type=int, default=90, help="Rolling window size ending on --date")
    product_affinity.add_argument("item_id", help="Anchor SKU / item_id")
    product_affinity.add_argument("--limit", type=int, default=15)
    return root


def _date_range(end_date: str, days: int) -> tuple[str, str]:
    if days < 1:
        raise ValueError("days must be >= 1")
    end = datetime.strptime(end_date, "%Y%m%d").date()
    start = end - timedelta(days=days - 1)
    return start.strftime("%Y%m%d"), end_date


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    settings = get_settings()
    registry = SiteRegistry(settings)
    if args.command == "sites":
        print(json.dumps([
            {"key": site.key, "name": site.name, "ready": site.ready}
            for site in registry.sites.values()
        ], indent=2))
        return 0
    if args.command == "status":
        print(json.dumps({
            "gcp_project_configured": bool(settings.gcp_project_id),
            "ga4_dataset_configured": bool(settings.ga4_dataset),
            "groq_configured": bool(settings.groq_api_key),
            "catalog_configured": bool(settings.icm_base_url and settings.icm_site) or any(
                site.icm_base_url and site.icm_site for site in registry.sites.values()
            ),
            "configured_sites": len(registry.sites),
            "ready_sites": sum(site.ready for site in registry.sites.values()),
        }, indent=2))
        return 0
    try:
        site, selected_settings = registry.select(args.site)
        runner = BigQueryRunner(selected_settings)
        if args.command == "check-bigquery":
            print(json.dumps({"site": site.key, "result": runner.run("SELECT 1 AS ok")}, indent=2))
        elif args.command == "query":
            selected_settings.events_table
            rows = run_sql_file(runner, selected_settings, args.sql_file, {
                "start_date": args.start_date, "end_date": args.end_date
            })
            print(json.dumps(rows, indent=2, default=str))
        elif args.command == "ask":
            tools = AnalyticsTools(selected_settings, runner)
            catalog = CatalogTools(selected_settings)
            print(CommerceAnalystAgent(selected_settings, tools, catalog=catalog).ask(args.question))
        elif args.command == "report":
            tools = AnalyticsTools(selected_settings, runner)
            print(json.dumps(build_daily_report(tools, args.date), indent=2, default=str))
        elif args.command == "opportunities":
            tools = AnalyticsTools(selected_settings, runner)
            print(json.dumps(
                detect_opportunities(tools, args.date, limit=args.limit),
                indent=2,
                default=str,
            ))
        elif args.command == "top-products":
            tools = AnalyticsTools(selected_settings, runner)
            start_date, end_date = _date_range(args.date, args.days)
            print(json.dumps({
                "start_date": start_date,
                "end_date": end_date,
                "sort": args.sort,
                "products": tools.top_selling_products(
                    start_date,
                    end_date,
                    limit=args.limit,
                    sort=args.sort,
                ),
            }, indent=2, default=str))
        elif args.command == "product-affinity":
            tools = AnalyticsTools(selected_settings, runner)
            start_date, end_date = _date_range(args.date, args.days)
            payload = tools.product_affinities(
                start_date,
                end_date,
                args.item_id,
                limit=args.limit,
            )
            payload["start_date"] = start_date
            payload["end_date"] = end_date
            print(json.dumps(payload, indent=2, default=str))
        return 0
    except ConfigurationPendingError as exc:
        print(f"Configuration pending: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
