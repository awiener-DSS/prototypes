from __future__ import annotations

from typing import Any

from ..catalog import CatalogNotConfiguredError, IcmCatalogClient, catalog_client_from_settings
from ..config import Settings


class CatalogTools:
    """Named catalog tools for on-demand product enrichment."""

    def __init__(self, settings: Settings, client: IcmCatalogClient | None = None) -> None:
        self.settings = settings
        self.client = client if client is not None else catalog_client_from_settings(settings)

    def _require(self) -> IcmCatalogClient:
        if self.client is None or not self.client.configured:
            raise CatalogNotConfiguredError(
                "Catalog enrichment is not configured. Set ICM_BASE_URL and ICM_SITE "
                "(or icm_* fields on the active site in sites.toml)."
            )
        return self.client

    def get_product(self, sku: str) -> dict[str, Any]:
        return self._require().get_product(sku).to_dict()

    def find_related_products(self, sku: str) -> list[dict[str, Any]]:
        return [link.__dict__ for link in self._require().find_related(sku)]

    def search_catalog(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        return [item.to_dict() for item in self._require().search_catalog(query, limit=limit)]
