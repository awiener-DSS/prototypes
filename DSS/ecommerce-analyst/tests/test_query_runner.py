from pathlib import Path

from commerce_analyst.config import Settings
from commerce_analyst.query_runner import run_sql_file


class RecordingRunner:
    def __init__(self):
        self.sql = ""

    def run(self, sql, parameters=None):
        self.sql = sql
        return []


def test_runner_expands_only_the_events_table_placeholder(tmp_path: Path) -> None:
    sql_file = tmp_path / "query.sql"
    sql_file.write_text("SELECT * FROM ${EVENTS_TABLE}", encoding="utf-8")
    runner = RecordingRunner()
    settings = Settings(gcp_project_id="project", ga4_dataset="analytics_1")
    assert run_sql_file(runner, settings, sql_file) == []
    assert runner.sql == "SELECT * FROM `project.analytics_1.events_*`"
