from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Protocol

from google.cloud import bigquery

from .config import Settings

_COMMENT = re.compile(r"(?:--[^\n]*|/\*.*?\*/)", re.DOTALL)
_MUTATING = re.compile(
    r"\b(ALTER|CALL|CLONE|COPY|CREATE|DELETE|DROP|EXPORT|GRANT|INSERT|LOAD|MERGE|RENAME|REVOKE|TRUNCATE|UPDATE)\b",
    re.IGNORECASE,
)


class QueryClient(Protocol):
    def run(self, sql: str, parameters: Mapping[str, Any] | None = None) -> list[dict[str, Any]]: ...


@dataclass(frozen=True)
class DryRunResult:
    total_bytes_processed: int


def assert_read_only(sql: str) -> None:
    cleaned = _COMMENT.sub(" ", sql).strip().rstrip(";").strip()
    if not cleaned or not re.match(r"^(SELECT|WITH)\b", cleaned, re.IGNORECASE):
        raise ValueError("Only SELECT or WITH queries are permitted")
    if ";" in cleaned:
        raise ValueError("Only one SQL statement is permitted")
    if _MUTATING.search(cleaned):
        raise ValueError("Mutating or administrative SQL is not permitted")


class BigQueryRunner:
    """Executes guarded, Standard SQL read queries with a cost ceiling."""

    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self.settings = settings
        self.client = client or bigquery.Client(
            project=settings.billing_project or None,
            location=settings.bigquery_location,
        )

    def _job_config(
        self, parameters: Mapping[str, Any] | None, *, dry_run: bool = False
    ) -> bigquery.QueryJobConfig:
        config = bigquery.QueryJobConfig(
            use_legacy_sql=False,
            dry_run=dry_run,
            maximum_bytes_billed=self.settings.bigquery_maximum_bytes_billed,
        )
        config.query_parameters = [
            bigquery.ScalarQueryParameter(name, _parameter_type(value), value)
            for name, value in (parameters or {}).items()
        ]
        return config

    def run(self, sql: str, parameters: Mapping[str, Any] | None = None) -> list[dict[str, Any]]:
        assert_read_only(sql)
        job = self.client.query(
            sql,
            job_config=self._job_config(parameters),
            location=self.settings.bigquery_location,
        )
        return [dict(row.items()) for row in job.result()]

    def dry_run(self, sql: str, parameters: Mapping[str, Any] | None = None) -> DryRunResult:
        assert_read_only(sql)
        job = self.client.query(
            sql,
            job_config=self._job_config(parameters, dry_run=True),
            location=self.settings.bigquery_location,
        )
        return DryRunResult(total_bytes_processed=int(job.total_bytes_processed or 0))


def _parameter_type(value: Any) -> str:
    if isinstance(value, bool):
        return "BOOL"
    if isinstance(value, int):
        return "INT64"
    if isinstance(value, float):
        return "FLOAT64"
    return "STRING"

