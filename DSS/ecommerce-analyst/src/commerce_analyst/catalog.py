from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass, field
from typing import Any

from .text import decode_html_entities, decode_product_name

USER_AGENT = "Mozilla/5.0 (compatible; CommerceAnalyst/1.0; +read-only)"


@dataclass(frozen=True)
class ProductLink:
    sku: str
    title: str = ""
    link_type: str = ""
    description: str = ""


@dataclass(frozen=True)
class ProductContext:
    sku: str
    name: str | None = None
    manufacturer: str | None = None
    detail_available: bool = False
    related: list[ProductLink] = field(default_factory=list)
    source: str = "icm"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CatalogNotConfiguredError(RuntimeError):
    """Raised when ICM catalog settings are missing."""


class IcmCatalogClient:
    """Read-only Intershop ICM REST client for on-demand product enrichment."""

    def __init__(
        self,
        *,
        base_url: str,
        site: str,
        auth_mode: str = "anonymous",
        username: str = "",
        password: str = "",
        organization: str = "",
        timeout_seconds: float = 20,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.site = site.strip()
        self.auth_mode = (auth_mode or "anonymous").strip().lower()
        self.username = username
        self.password = password
        self.organization = organization
        self.timeout_seconds = timeout_seconds
        self._access_token: str | None = None

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.site)

    @property
    def rest_root(self) -> str:
        return f"{self.base_url}/INTERSHOP/rest/WFS/{self.site}/-"

    def get_product(self, sku: str) -> ProductContext:
        sku = sku.strip()
        if not sku:
            raise ValueError("sku is required")
        warnings: list[str] = [
            "ICM stock/availability is not loaded for this site — do not treat catalog stock fields as truth.",
        ]
        name: str | None = None
        manufacturer: str | None = None
        detail_available = False

        try:
            detail = self._get_json(f"products/{urllib.parse.quote(sku, safe='')}")
            name = _first_str(detail, "name", "title", "productName")
            manufacturer = _attr(detail, "manufacturer") or _first_str(detail, "manufacturer")
            detail_available = True
        except Exception as exc:  # SureWerx currently 500s singular product GETs
            warnings.append(f"Product detail endpoint unavailable ({exc}).")

        related = self.find_related(sku)
        if not name and related:
            # Same-family accessories often carry usable titles when PDP GET is broken.
            name = related[0].title or None
            warnings.append("Product name inferred from a related/accessory title.")

        if not detail_available and not related:
            # Last resort: keyword search may still miss exact SKUs on this tenant.
            hits = self.search_catalog(sku, limit=3)
            for hit in hits:
                if hit.sku.upper() == sku.upper():
                    name = hit.name or name
                    manufacturer = hit.manufacturer or manufacturer
                    detail_available = True
                    break

        return ProductContext(
            sku=sku,
            name=decode_product_name(name),
            manufacturer=decode_product_name(manufacturer),
            detail_available=detail_available,
            related=related,
            warnings=warnings,
        )

    def find_related(self, sku: str) -> list[ProductLink]:
        try:
            payload = self._get_json(f"products/{urllib.parse.quote(sku, safe='')}/links")
        except Exception:
            return []
        related: list[ProductLink] = []
        for group in payload.get("elements") or []:
            link_type = str(group.get("linkType") or "")
            for link in group.get("productLinks") or []:
                uri = str(link.get("uri") or "")
                linked_sku = uri.rstrip("/").split("/")[-1]
                if not linked_sku:
                    continue
                related.append(ProductLink(
                    sku=linked_sku,
                    title=decode_html_entities(str(link.get("title") or "")),
                    link_type=link_type,
                    description=_strip_html(str(link.get("description") or ""))[:400],
                ))
        return related

    def search_catalog(self, query: str, *, limit: int = 5) -> list[ProductContext]:
        query = query.strip()
        if not query:
            return []
        params = urllib.parse.urlencode({
            "searchTerm": query,
            "amount": max(1, min(limit, 20)),
            "attrs": "sku,name,manufacturer",
        })
        payload = self._get_json(f"products?{params}")
        results: list[ProductContext] = []
        for element in payload.get("elements") or []:
            sku = _attr(element, "sku") or str(element.get("uri") or "").rstrip("/").split("/")[-1]
            if not sku:
                continue
            results.append(ProductContext(
                sku=sku,
                name=decode_product_name(str(element.get("title") or "") or _attr(element, "name")),
                manufacturer=decode_product_name(_attr(element, "manufacturer")),
                detail_available=True,
            ))
        return results

    def _ensure_token(self) -> str:
        if self._access_token:
            return self._access_token
        if not self.configured:
            raise CatalogNotConfiguredError("Set ICM_BASE_URL and ICM_SITE to enable catalog enrichment.")
        if self.auth_mode == "anonymous":
            body = b"grant_type=anonymous"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
            }
        elif self.auth_mode == "password":
            form = {
                "grant_type": "password",
                "username": self.username,
                "password": self.password,
            }
            if self.organization:
                form["organization"] = self.organization
            body = urllib.parse.urlencode(form).encode()
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
            }
        else:
            raise CatalogNotConfiguredError(f"Unsupported ICM auth mode: {self.auth_mode}")

        request = urllib.request.Request(
            f"{self.rest_root}/token",
            data=body,
            method="POST",
            headers=headers,
        )
        with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
            payload = json.load(response)
        token = payload.get("access_token")
        if not token:
            raise RuntimeError("ICM token response did not include access_token")
        self._access_token = str(token)
        return self._access_token

    def _get_json(self, path: str, *, accept: str = "application/json") -> dict[str, Any]:
        token = self._ensure_token()
        request = urllib.request.Request(
            f"{self.rest_root}/{path.lstrip('/')}",
            headers={
                "Accept": accept,
                "Authorization": f"Bearer {token}",
                "User-Agent": USER_AGENT,
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            raise RuntimeError(f"ICM {exc.code}: {detail}") from exc


def _attr(payload: dict[str, Any], name: str) -> str | None:
    attrs = payload.get("attributes")
    if isinstance(attrs, list):
        for item in attrs:
            if str(item.get("name") or "").lower() == name.lower():
                value = item.get("value")
                return None if value is None else str(value)
    if isinstance(attrs, dict) and name in attrs:
        return str(attrs[name])
    return None


def _first_str(payload: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key)
        if value:
            return str(value)
    return None


def _strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", text).strip()


def catalog_client_from_settings(settings: Any) -> IcmCatalogClient | None:
    base_url = getattr(settings, "icm_base_url", "") or ""
    site = getattr(settings, "icm_site", "") or ""
    if not base_url or not site:
        return None
    return IcmCatalogClient(
        base_url=base_url,
        site=site,
        auth_mode=getattr(settings, "icm_auth_mode", "anonymous") or "anonymous",
        username=getattr(settings, "icm_username", "") or "",
        password=getattr(settings, "icm_password", "") or "",
        organization=getattr(settings, "icm_organization", "") or "",
    )
