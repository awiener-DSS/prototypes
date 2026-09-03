from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from ..bigquery import QueryClient
from ..config import Settings
from ..text import decode_product_name


def _decode_product_rows(rows: list[dict[str, Any]], *fields: str) -> list[dict[str, Any]]:
    decoded: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        for field in fields:
            if field in item and item[field] is not None:
                item[field] = decode_product_name(str(item[field]))
        decoded.append(item)
    return decoded


PURCHASE_ITEM_REVENUE_USD = """
COALESCE(
  NULLIF(item.item_revenue_in_usd, 0),
  SAFE_MULTIPLY(
    COALESCE(NULLIF(item.price_in_usd, 0), NULLIF(item.price, 0)),
    COALESCE(item.quantity, 1)
  ),
  0
)
""".strip()


@dataclass
class AnalyticsTools:
    settings: Settings
    queries: QueryClient

    def _run(
        self,
        sql: str,
        start_date: str,
        end_date: str,
        **extra: Any,
    ) -> list[dict[str, Any]]:
        _validate_dates(start_date, end_date)
        parameters: dict[str, Any] = {"start_date": start_date, "end_date": end_date, **extra}
        return self.queries.run(sql, parameters)

    def site_summary(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        SELECT
          COUNT(DISTINCT user_pseudo_id) AS users,
          COUNT(DISTINCT NULLIF(user_id, '')) AS authenticated_users,
          COUNTIF(event_name = 'session_start') AS sessions,
          COUNTIF(event_name = 'view_item') AS product_views,
          COUNTIF(event_name = 'add_to_cart') AS add_to_carts,
          COUNTIF(event_name = 'purchase') AS purchases,
          ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd
        FROM {self.settings.events_table}
        WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
        """
        return self._run(sql, start_date, end_date)

    def funnel(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        WITH user_steps AS (
          SELECT COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
            LOGICAL_OR(event_name = 'view_item') AS viewed,
            LOGICAL_OR(event_name = 'add_to_cart') AS added,
            LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
            LOGICAL_OR(event_name = 'purchase') AS purchased
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
          GROUP BY actor_id
        )
        SELECT COUNTIF(viewed) AS viewed_users, COUNTIF(added) AS cart_users,
          COUNTIF(checkout) AS checkout_users, COUNTIF(purchased) AS purchasers,
          SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) AS view_to_cart_rate,
          SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) AS checkout_conversion_rate
        FROM user_steps
        """
        return self._run(sql, start_date, end_date)

    def product_performance(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        SELECT item.item_id, ANY_VALUE(item.item_name) AS item_name,
          COUNTIF(event_name = 'view_item') AS views,
          COUNTIF(event_name = 'add_to_cart') AS adds,
          COUNTIF(event_name = 'purchase') AS purchases,
          COUNT(DISTINCT IF(event_name = 'view_item', COALESCE(NULLIF(user_id, ''), user_pseudo_id), NULL)) AS viewing_users,
          ROUND(SUM(IF(event_name = 'purchase', item.item_revenue_in_usd, 0)), 2) AS item_revenue_usd,
          SAFE_DIVIDE(COUNTIF(event_name = 'purchase'), COUNTIF(event_name = 'view_item')) AS conversion_rate
        FROM {self.settings.events_table}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
          AND event_name IN ('view_item', 'add_to_cart', 'purchase')
        GROUP BY item.item_id
        ORDER BY item_revenue_usd DESC
        LIMIT 100
        """
        return _decode_product_rows(self._run(sql, start_date, end_date), "item_name")

    def top_selling_products(
        self,
        start_date: str,
        end_date: str,
        *,
        limit: int = 25,
        sort: str = "orders",
    ) -> list[dict[str, Any]]:
        if limit < 1 or limit > 100:
            raise ValueError("limit must be between 1 and 100")
        if sort == "units":
            order_by = "units_sold DESC, orders DESC, item_revenue_usd DESC"
        elif sort == "orders":
            order_by = "orders DESC, units_sold DESC, item_revenue_usd DESC"
        else:
            order_by = "item_revenue_usd DESC, units_sold DESC, orders DESC"
        sql = f"""
        SELECT item.item_id, ANY_VALUE(item.item_name) AS item_name,
          SUM(COALESCE(item.quantity, 1)) AS units_sold,
          COUNT(*) AS purchase_lines,
          COUNT(DISTINCT COALESCE(
            NULLIF(ecommerce.transaction_id, ''),
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id')
          )) AS orders,
          ROUND(SUM({PURCHASE_ITEM_REVENUE_USD}), 2) AS item_revenue_usd
        FROM {self.settings.events_table}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
          AND event_name = 'purchase'
          AND item.item_id IS NOT NULL AND item.item_id != ''
        GROUP BY item.item_id
        ORDER BY {order_by}
        LIMIT @limit
        """
        return _decode_product_rows(
            self._run(sql, start_date, end_date, limit=limit),
            "item_name",
        )

    def search_products(
        self,
        start_date: str,
        end_date: str,
        query: str,
        *,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        cleaned = query.strip()
        if not cleaned:
            raise ValueError("query is required")
        if limit < 1 or limit > 25:
            raise ValueError("limit must be between 1 and 25")
        sql = f"""
        WITH product_rows AS (
          SELECT item.item_id, item.item_name
          FROM {self.settings.events_table}, UNNEST(items) AS item
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
            AND event_name IN ('view_item', 'add_to_cart', 'purchase')
            AND item.item_id IS NOT NULL AND item.item_id != ''
        )
        SELECT item_id, ANY_VALUE(item_name) AS item_name, COUNT(*) AS event_rows
        FROM product_rows
        WHERE LOWER(item_id) LIKE CONCAT('%', LOWER(@query), '%')
          OR LOWER(COALESCE(item_name, '')) LIKE CONCAT('%', LOWER(@query), '%')
        GROUP BY item_id
        ORDER BY event_rows DESC
        LIMIT @limit
        """
        return _decode_product_rows(
            self._run(sql, start_date, end_date, query=cleaned, limit=limit),
            "item_name",
        )

    def product_affinities(
        self,
        start_date: str,
        end_date: str,
        item_id: str,
        *,
        limit: int = 15,
    ) -> dict[str, Any]:
        anchor = item_id.strip()
        if not anchor:
            raise ValueError("item_id is required")
        if limit < 1 or limit > 50:
            raise ValueError("limit must be between 1 and 50")

        purchased = self._run(
            f"""
            WITH order_lines AS (
              SELECT
                COALESCE(
                  NULLIF(ecommerce.transaction_id, ''),
                  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id'),
                  CONCAT(COALESCE(NULLIF(user_id, ''), user_pseudo_id), '-', CAST(event_timestamp AS STRING))
                ) AS order_id,
                item.item_id,
                item.item_name
              FROM {self.settings.events_table}, UNNEST(items) AS item
              WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
                AND event_name = 'purchase'
                AND item.item_id IS NOT NULL AND item.item_id != ''
            ), anchor_orders AS (
              SELECT DISTINCT order_id
              FROM order_lines
              WHERE item_id = @item_id
            )
            SELECT ol.item_id, ANY_VALUE(ol.item_name) AS item_name,
              COUNT(DISTINCT ol.order_id) AS co_occurrences
            FROM order_lines AS ol
            JOIN anchor_orders AS ao ON ol.order_id = ao.order_id
            WHERE ol.item_id != @item_id
            GROUP BY ol.item_id
            ORDER BY co_occurrences DESC
            LIMIT @limit
            """,
            start_date,
            end_date,
            item_id=anchor,
            limit=limit,
        )

        cart = self._run(
            f"""
            WITH cart_lines AS (
              SELECT
                CONCAT(
                  COALESCE(NULLIF(user_id, ''), user_pseudo_id),
                  '-',
                  CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
                ) AS session_key,
                item.item_id,
                item.item_name
              FROM {self.settings.events_table}, UNNEST(items) AS item
              WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
                AND event_name = 'add_to_cart'
                AND item.item_id IS NOT NULL AND item.item_id != ''
            ), anchor_sessions AS (
              SELECT DISTINCT session_key
              FROM cart_lines
              WHERE item_id = @item_id
            )
            SELECT cl.item_id, ANY_VALUE(cl.item_name) AS item_name,
              COUNT(DISTINCT cl.session_key) AS co_occurrences
            FROM cart_lines AS cl
            JOIN anchor_sessions AS aos ON cl.session_key = aos.session_key
            WHERE cl.item_id != @item_id
            GROUP BY cl.item_id
            ORDER BY co_occurrences DESC
            LIMIT @limit
            """,
            start_date,
            end_date,
            item_id=anchor,
            limit=limit,
        )

        anchor_meta = self._run(
            f"""
            SELECT ANY_VALUE(item.item_name) AS item_name
            FROM {self.settings.events_table}, UNNEST(items) AS item
            WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
              AND event_name = 'purchase'
              AND item.item_id = @item_id
            """,
            start_date,
            end_date,
            item_id=anchor,
        )
        anchor_name = str(anchor_meta[0]["item_name"]) if anchor_meta and anchor_meta[0].get("item_name") else None

        anchor_orders = self._run(
            f"""
            SELECT COUNT(DISTINCT COALESCE(
              NULLIF(ecommerce.transaction_id, ''),
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'transaction_id'),
              CONCAT(COALESCE(NULLIF(user_id, ''), user_pseudo_id), '-', CAST(event_timestamp AS STRING))
            )) AS anchor_orders
            FROM {self.settings.events_table}, UNNEST(items) AS item
            WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
              AND event_name = 'purchase'
              AND item.item_id = @item_id
            """,
            start_date,
            end_date,
            item_id=anchor,
        )

        anchor_sessions = self._run(
            f"""
            SELECT COUNT(DISTINCT CONCAT(
              COALESCE(NULLIF(user_id, ''), user_pseudo_id),
              '-',
              CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)
            )) AS anchor_sessions
            FROM {self.settings.events_table}, UNNEST(items) AS item
            WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
              AND event_name = 'add_to_cart'
              AND item.item_id = @item_id
            """,
            start_date,
            end_date,
            item_id=anchor,
        )

        order_count = int(anchor_orders[0]["anchor_orders"]) if anchor_orders else 0
        session_count = int(anchor_sessions[0]["anchor_sessions"]) if anchor_sessions else 0

        return {
            "anchor_item_id": anchor,
            "anchor_item_name": decode_product_name(anchor_name),
            "anchor_orders": order_count,
            "anchor_cart_sessions": session_count,
            "purchased_together": _decode_product_rows(purchased, "item_name"),
            "cart_together": _decode_product_rows(cart, "item_name"),
        }

    def search_performance(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        WITH search_events AS (
          SELECT event_name, COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
            (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'search_term') AS search_term
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
            AND event_name IN ('search', 'search_page_view', 'view_search_results', 'search_no_results')
        )
        SELECT search_term,
          COUNTIF(event_name = 'search') AS searches,
          COUNTIF(event_name = 'view_search_results') AS result_views,
          COUNTIF(event_name = 'search_no_results') AS no_result_events,
          COUNT(DISTINCT actor_id) AS users
        FROM search_events
        GROUP BY search_term
        HAVING search_term IS NOT NULL
        ORDER BY searches DESC, result_views DESC
        LIMIT 100
        """
        return self._run(sql, start_date, end_date)

    def inventory_friction(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        WITH zero_stock AS (
          SELECT
            COALESCE(
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_id'),
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id'),
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'sku'),
              CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'sku') AS STRING)
            ) AS item_id,
            COUNT(*) AS zero_stock_views,
            COUNT(DISTINCT COALESCE(NULLIF(user_id, ''), user_pseudo_id)) AS affected_users
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
            AND event_name = 'zero_stock_view'
          GROUP BY item_id
          HAVING item_id IS NOT NULL AND item_id != ''
        ), commerce AS (
          SELECT
            item.item_id AS item_id,
            COUNTIF(event_name = 'add_to_cart') AS cart_adds,
            COUNTIF(event_name = 'purchase') AS purchases,
            COUNT(DISTINCT IF(
              event_name = 'add_to_cart',
              COALESCE(NULLIF(user_id, ''), user_pseudo_id),
              NULL
            )) AS cart_users
          FROM {self.settings.events_table}, UNNEST(items) AS item
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
            AND event_name IN ('add_to_cart', 'purchase')
            AND item.item_id IS NOT NULL AND item.item_id != ''
          GROUP BY item_id
        )
        SELECT
          z.item_id,
          z.zero_stock_views,
          z.affected_users,
          COALESCE(c.cart_adds, 0) AS cart_adds,
          COALESCE(c.cart_users, 0) AS cart_users,
          COALESCE(c.purchases, 0) AS purchases,
          IF(COALESCE(c.cart_adds, 0) > 0, 'backorder_allowed', 'oos_messaging_only') AS oos_pattern
        FROM zero_stock AS z
        LEFT JOIN commerce AS c USING (item_id)
        ORDER BY z.zero_stock_views DESC
        LIMIT 100
        """
        return self._run(sql, start_date, end_date)

    def segmentation(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        sql = f"""
        SELECT
          COALESCE(device.category, 'unknown') AS device,
          COALESCE(traffic_source.source, 'unknown') AS source,
          COALESCE(traffic_source.medium, 'unknown') AS medium,
          COUNT(DISTINCT user_pseudo_id) AS users,
          COUNTIF(event_name = 'purchase') AS purchases,
          ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd
        FROM {self.settings.events_table}
        WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
        GROUP BY device, source, medium
        ORDER BY revenue_usd DESC
        LIMIT 100
        """
        return self._run(sql, start_date, end_date)

    def landing_page_performance(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """Sessions by first-hit landing path with commerce quality and engagement."""
        sql = f"""
        WITH hits AS (
          SELECT
            user_pseudo_id,
            COALESCE(
              (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'),
              FARM_FINGERPRINT(CONCAT(user_pseudo_id, CAST(event_timestamp AS STRING)))
            ) AS session_id,
            event_timestamp,
            event_name,
            ecommerce.purchase_revenue_in_usd AS purchase_revenue_usd,
            (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') AS engagement_msec,
            COALESCE(
              traffic_source.source,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source'),
              '(direct)'
            ) AS source,
            COALESCE(
              traffic_source.name,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign'),
              '(not set)'
            ) AS campaign,
            COALESCE(
              REGEXP_EXTRACT(
                COALESCE(
                  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'),
                  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_path'),
                  ''
                ),
                r'^(?:https?://[^/]+)?([^?#]*)'
              ),
              '(unknown)'
            ) AS page_path
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
        ), ranked AS (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp) AS hit_n
          FROM hits
        ), landings AS (
          SELECT user_pseudo_id, session_id,
            NULLIF(page_path, '') AS landing_path,
            source,
            campaign
          FROM ranked
          WHERE hit_n = 1
        ), outcomes AS (
          SELECT user_pseudo_id, session_id,
            LOGICAL_OR(event_name = 'view_item') AS viewed,
            LOGICAL_OR(event_name = 'add_to_cart') AS added,
            LOGICAL_OR(event_name = 'purchase') AS purchased,
            ROUND(SUM(IF(event_name = 'purchase', COALESCE(purchase_revenue_usd, 0), 0)), 2) AS revenue_usd,
            SUM(COALESCE(engagement_msec, 0)) AS engagement_msec
          FROM ranked
          GROUP BY user_pseudo_id, session_id
        )
        SELECT
          COALESCE(l.landing_path, '(unknown)') AS landing_path,
          COUNT(*) AS sessions,
          COUNTIF(o.viewed) AS viewed_sessions,
          COUNTIF(o.added) AS cart_sessions,
          COUNTIF(o.purchased) AS purchase_sessions,
          ROUND(SUM(o.revenue_usd), 2) AS revenue_usd,
          SAFE_DIVIDE(COUNTIF(o.purchased), COUNT(*)) AS purchase_rate,
          SAFE_DIVIDE(COUNTIF(o.added), COUNTIF(o.viewed)) AS view_to_cart_rate,
          ROUND(SAFE_DIVIDE(AVG(o.engagement_msec), 1000), 1) AS avg_engagement_sec,
          APPROX_TOP_COUNT(l.source, 1)[OFFSET(0)].value AS top_source,
          APPROX_TOP_COUNT(l.campaign, 1)[OFFSET(0)].value AS top_campaign
        FROM landings AS l
        JOIN outcomes AS o USING (user_pseudo_id, session_id)
        GROUP BY landing_path
        HAVING sessions >= 5
        ORDER BY sessions DESC
        LIMIT 50
        """
        return self._run(sql, start_date, end_date)

    def taxonomy_performance(
        self,
        start_date: str,
        end_date: str,
        *,
        dimension: str = "brand",
    ) -> list[dict[str, Any]]:
        """Brand or category funnel + revenue from item dimensions."""
        dim = dimension.strip().lower()
        if dim not in {"brand", "category"}:
            raise ValueError("dimension must be 'brand' or 'category'")
        # Lowest non-empty item_categoryN (category5 → category); skip root/unset nodes.
        def leaf_category(field: str) -> str:
            return (
                f"NULLIF(IF(LOWER(TRIM(COALESCE({field}, ''))) IN ('', 'shop', '(not set)'), "
                f"NULL, NULLIF({field}, '')), NULL)"
            )

        dim_expr = (
            "COALESCE(NULLIF(item.item_brand, ''), '(unknown)')"
            if dim == "brand"
            else f"""COALESCE(
              {leaf_category("item.item_category5")},
              {leaf_category("item.item_category4")},
              {leaf_category("item.item_category3")},
              {leaf_category("item.item_category2")},
              {leaf_category("item.item_category")},
              '(unknown)'
            )"""
        )
        sql = f"""
        SELECT
          {dim_expr} AS taxonomy_value,
          '{dim}' AS dimension,
          COUNTIF(event_name = 'view_item') AS views,
          COUNTIF(event_name = 'add_to_cart') AS adds,
          COUNTIF(event_name = 'purchase') AS purchases,
          COUNT(DISTINCT IF(event_name = 'view_item', COALESCE(NULLIF(user_id, ''), user_pseudo_id), NULL)) AS viewing_users,
          ROUND(SUM(IF(event_name = 'purchase', {PURCHASE_ITEM_REVENUE_USD}, 0)), 2) AS item_revenue_usd,
          SAFE_DIVIDE(COUNTIF(event_name = 'add_to_cart'), COUNTIF(event_name = 'view_item')) AS add_rate,
          SAFE_DIVIDE(COUNTIF(event_name = 'purchase'), COUNTIF(event_name = 'view_item')) AS conversion_rate
        FROM {self.settings.events_table}, UNNEST(items) AS item
        WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
          AND event_name IN ('view_item', 'add_to_cart', 'purchase')
        GROUP BY taxonomy_value
        HAVING views >= 8
          AND LOWER(taxonomy_value) NOT IN ('shop', '(not set)')
        ORDER BY views DESC
        LIMIT 50
        """
        return self._run(sql, start_date, end_date)

    def acquisition_quality(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """Source / medium / campaign quality: traffic vs purchasers."""
        sql = f"""
        WITH hits AS (
          SELECT
            user_pseudo_id,
            COALESCE(
              (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id'),
              FARM_FINGERPRINT(CONCAT(user_pseudo_id, CAST(event_timestamp AS STRING)))
            ) AS session_id,
            event_name,
            ecommerce.purchase_revenue_in_usd AS purchase_revenue_usd,
            COALESCE(traffic_source.source, '(direct)') AS source,
            COALESCE(traffic_source.medium, '(none)') AS medium,
            COALESCE(
              traffic_source.name,
              (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign'),
              '(not set)'
            ) AS campaign
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
        ), sessions AS (
          SELECT
            ANY_VALUE(source) AS source,
            ANY_VALUE(medium) AS medium,
            ANY_VALUE(campaign) AS campaign,
            user_pseudo_id,
            session_id,
            LOGICAL_OR(event_name = 'purchase') AS purchased,
            ROUND(SUM(IF(event_name = 'purchase', COALESCE(purchase_revenue_usd, 0), 0)), 2) AS revenue_usd
          FROM hits
          GROUP BY user_pseudo_id, session_id
        )
        SELECT
          source,
          medium,
          campaign,
          COUNT(*) AS sessions,
          COUNTIF(purchased) AS purchase_sessions,
          ROUND(SUM(revenue_usd), 2) AS revenue_usd,
          SAFE_DIVIDE(COUNTIF(purchased), COUNT(*)) AS purchase_rate
        FROM sessions
        GROUP BY source, medium, campaign
        HAVING sessions >= 8
        ORDER BY sessions DESC
        LIMIT 50
        """
        return self._run(sql, start_date, end_date)

    def available_event_dates(self) -> list[str]:
        """List completed daily export suffixes present in the GA4 dataset."""
        project = self.settings.gcp_project_id
        dataset = self.settings.ga4_dataset
        if not project or not dataset:
            return []
        sql = f"""
        SELECT REGEXP_EXTRACT(table_name, r'^events_(\\d{{8}})$') AS event_date
        FROM `{project}.{dataset}.INFORMATION_SCHEMA.TABLES`
        WHERE REGEXP_CONTAINS(table_name, r'^events_\\d{{8}}$')
        ORDER BY event_date
        """
        rows = self.queries.run(sql)
        return [str(row["event_date"]) for row in rows if row.get("event_date")]

    def daily_performance(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """Per-day site and funnel metrics for baseline / anomaly detection."""
        sql = f"""
        WITH daily_events AS (
          SELECT *, _TABLE_SUFFIX AS report_date
          FROM {self.settings.events_table}
          WHERE _TABLE_SUFFIX BETWEEN @start_date AND @end_date
        ), metrics AS (
          SELECT report_date,
            COUNT(DISTINCT user_pseudo_id) AS users,
            COUNTIF(event_name = 'session_start') AS sessions,
            COUNTIF(event_name = 'purchase') AS purchases,
            ROUND(SUM(IF(event_name = 'purchase', ecommerce.purchase_revenue_in_usd, 0)), 2) AS revenue_usd
          FROM daily_events
          GROUP BY report_date
        ), actors AS (
          SELECT report_date,
            COALESCE(NULLIF(user_id, ''), user_pseudo_id) AS actor_id,
            LOGICAL_OR(event_name = 'view_item') AS viewed,
            LOGICAL_OR(event_name = 'add_to_cart') AS added,
            LOGICAL_OR(event_name = 'begin_checkout') AS checkout,
            LOGICAL_OR(event_name = 'purchase') AS purchased
          FROM daily_events
          GROUP BY report_date, actor_id
        ), funnel AS (
          SELECT report_date,
            COUNTIF(viewed) AS viewed_users,
            COUNTIF(added) AS cart_users,
            COUNTIF(checkout) AS checkout_users,
            COUNTIF(purchased) AS purchasers,
            SAFE_DIVIDE(COUNTIF(added), COUNTIF(viewed)) AS view_to_cart_rate,
            SAFE_DIVIDE(COUNTIF(purchased), COUNTIF(checkout)) AS checkout_conversion_rate
          FROM actors
          GROUP BY report_date
        )
        SELECT m.*, f.viewed_users, f.cart_users, f.checkout_users, f.purchasers,
          f.view_to_cart_rate, f.checkout_conversion_rate,
          SAFE_DIVIDE(m.revenue_usd, NULLIF(m.sessions, 0)) AS revenue_per_session
        FROM metrics AS m
        JOIN funnel AS f USING (report_date)
        ORDER BY report_date
        """
        return self._run(sql, start_date, end_date)


def _validate_dates(start_date: str, end_date: str) -> None:
    try:
        start = datetime.strptime(start_date, "%Y%m%d").date()
        end = datetime.strptime(end_date, "%Y%m%d").date()
    except ValueError as exc:
        raise ValueError("Dates must use YYYYMMDD format") from exc
    if start > end:
        raise ValueError("start_date cannot be after end_date")
