import pytest

from commerce_analyst.bigquery import BigQueryRunner, assert_read_only
from commerce_analyst.config import Settings


class FakeRow(dict):
    def items(self):
        return super().items()


class FakeJob:
    total_bytes_processed = 42

    def result(self):
        return [FakeRow(ok=1)]


class FakeClient:
    def __init__(self):
        self.calls = []

    def query(self, sql, **kwargs):
        self.calls.append((sql, kwargs))
        return FakeJob()


@pytest.mark.parametrize("sql", [
    "DELETE FROM `p.d.t`", "WITH x AS (SELECT 1) UPDATE t SET x=1",
    "SELECT 1; SELECT 2", "CREATE TABLE x AS SELECT 1",
])
def test_rejects_non_read_only_sql(sql: str) -> None:
    with pytest.raises(ValueError):
        assert_read_only(sql)


def test_runner_returns_plain_dicts_and_sets_cap() -> None:
    client = FakeClient()
    settings = Settings(bigquery_maximum_bytes_billed=1234)
    rows = BigQueryRunner(settings, client=client).run("SELECT @n AS ok", {"n": 1})
    assert rows == [{"ok": 1}]
    config = client.calls[0][1]["job_config"]
    assert config.maximum_bytes_billed == 1234
    assert config.use_legacy_sql is False


def test_dry_run_reports_bytes() -> None:
    result = BigQueryRunner(Settings(), client=FakeClient()).dry_run("SELECT 1")
    assert result.total_bytes_processed == 42

