from __future__ import annotations

from pathlib import Path
from typing import Any

from .bigquery import BigQueryRunner
from .config import Settings


def run_sql_file(
    runner: BigQueryRunner,
    settings: Settings,
    path: str | Path,
    parameters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    sql = Path(path).read_text(encoding="utf-8")
    sql = sql.replace("${EVENTS_TABLE}", settings.events_table)
    if "${" in sql:
        raise ValueError("The SQL file contains an unsupported template placeholder")
    return runner.run(sql, parameters)
