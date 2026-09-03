from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]+$")


class Settings(BaseSettings):
    """Runtime settings. The GA4 dataset is deliberately optional during setup."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gcp_project_id: str = ""
    ga4_dataset: str = ""
    sites_config_file: str = "sites.toml"
    active_site: str = ""
    bigquery_billing_project: str = ""
    bigquery_location: str = "US"
    bigquery_maximum_bytes_billed: int = Field(default=10_000_000_000, gt=0)
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    icm_base_url: str = ""
    icm_site: str = ""
    icm_auth_mode: str = "anonymous"
    icm_username: str = ""
    icm_password: str = ""
    icm_organization: str = ""

    @field_validator("gcp_project_id", "ga4_dataset", "bigquery_billing_project")
    @classmethod
    def validate_identifier(cls, value: str) -> str:
        value = value.strip()
        if value and not IDENTIFIER.fullmatch(value):
            raise ValueError("must be a bare Google Cloud identifier")
        return value

    @property
    def billing_project(self) -> str:
        return self.bigquery_billing_project or self.gcp_project_id

    @property
    def events_table(self) -> str:
        if not self.gcp_project_id or not self.ga4_dataset:
            raise ConfigurationPendingError(
                "Set GCP_PROJECT_ID and GA4_DATASET after the first GA4 export appears."
            )
        return f"`{self.gcp_project_id}.{self.ga4_dataset}.events_*`"


@dataclass(frozen=True)
class Site:
    key: str
    name: str
    gcp_project_id: str
    ga4_dataset: str
    location: str = "US"
    icm_base_url: str = ""
    icm_site: str = ""

    @property
    def ready(self) -> bool:
        return bool(self.gcp_project_id and self.ga4_dataset)


class SiteRegistry:
    """Loads named GA4 properties from a small, local TOML registry."""

    def __init__(self, settings: Settings, path: str | Path | None = None) -> None:
        self.settings = settings
        self.path = Path(path or settings.sites_config_file)
        self.default_site = ""
        self.sites = self._load()

    def _load(self) -> dict[str, Site]:
        if not self.path.exists():
            if self.settings.gcp_project_id or self.settings.ga4_dataset:
                return {"default": Site(
                    key="default", name="Default", gcp_project_id=self.settings.gcp_project_id,
                    ga4_dataset=self.settings.ga4_dataset, location=self.settings.bigquery_location,
                )}
            return {}
        data = tomllib.loads(self.path.read_text(encoding="utf-8"))
        self.default_site = str(data.get("default_site", ""))
        sites: dict[str, Site] = {}
        for key, raw in data.get("sites", {}).items():
            if not IDENTIFIER.fullmatch(key):
                raise ValueError(f"Invalid site key: {key}")
            project = str(raw.get("gcp_project_id", "")).strip()
            dataset = str(raw.get("ga4_dataset", "")).strip()
            if project and not IDENTIFIER.fullmatch(project):
                raise ValueError(f"Invalid project for site: {key}")
            if dataset and not IDENTIFIER.fullmatch(dataset):
                raise ValueError(f"Invalid dataset for site: {key}")
            sites[key] = Site(
                key=key, name=str(raw.get("name", key)), gcp_project_id=project,
                ga4_dataset=dataset, location=str(raw.get("location", "US")),
                icm_base_url=str(raw.get("icm_base_url", "")).strip(),
                icm_site=str(raw.get("icm_site", "")).strip(),
            )
        return sites

    def select(self, key: str = "") -> tuple[Site, Settings]:
        selected = key or self.settings.active_site or self.default_site
        if not selected and len(self.sites) == 1:
            selected = next(iter(self.sites))
        if not selected:
            raise ConfigurationPendingError("Choose a site with --site or set ACTIVE_SITE.")
        if selected not in self.sites:
            choices = ", ".join(sorted(self.sites)) or "none configured"
            raise ConfigurationPendingError(f"Unknown site '{selected}'. Available sites: {choices}.")
        site = self.sites[selected]
        resolved = self.settings.model_copy(update={
            "gcp_project_id": site.gcp_project_id,
            "ga4_dataset": site.ga4_dataset,
            "bigquery_location": site.location,
            "active_site": site.key,
            "icm_base_url": site.icm_base_url or self.settings.icm_base_url,
            "icm_site": site.icm_site or self.settings.icm_site,
        })
        return site, resolved


class ConfigurationPendingError(RuntimeError):
    """Raised when cloud data is not available/configured yet."""


@lru_cache
def get_settings() -> Settings:
    return Settings()
