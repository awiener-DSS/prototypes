import pytest

from commerce_analyst.config import ConfigurationPendingError, Settings, SiteRegistry


def test_dataset_can_be_pending() -> None:
    settings = Settings(gcp_project_id="adam-test-506904", ga4_dataset="")
    with pytest.raises(ConfigurationPendingError):
        _ = settings.events_table


def test_events_table_is_quoted() -> None:
    settings = Settings(gcp_project_id="my-project", ga4_dataset="analytics_123")
    assert settings.events_table == "`my-project.analytics_123.events_*`"


def test_rejects_qualified_dataset() -> None:
    with pytest.raises(ValueError):
        Settings(ga4_dataset="project.analytics_123")


def test_site_registry_selects_named_site(tmp_path) -> None:
    path = tmp_path / "sites.toml"
    path.write_text('''default_site = "western"
[sites.western]
name = "Western"
gcp_project_id = "project-one"
ga4_dataset = "analytics_123"
''', encoding="utf-8")
    # Explicit empty active_site so a local .env ACTIVE_SITE cannot leak into the test.
    site, settings = SiteRegistry(Settings(active_site=""), path).select()
    assert site.name == "Western"
    assert settings.events_table == "`project-one.analytics_123.events_*`"
    assert settings.active_site == "western"


def test_site_registry_rejects_unknown_site(tmp_path) -> None:
    path = tmp_path / "sites.toml"
    path.write_text("[sites.western]\nga4_dataset = 'analytics_1'", encoding="utf-8")
    with pytest.raises(ConfigurationPendingError, match="Available sites: western"):
        SiteRegistry(Settings(active_site=""), path).select("missing")


def test_legacy_settings_become_default_site(tmp_path) -> None:
    registry = SiteRegistry(
        Settings(gcp_project_id="project", ga4_dataset="analytics_1", active_site=""),
        tmp_path / "missing.toml",
    )
    site, _ = registry.select()
    assert site.key == "default"
