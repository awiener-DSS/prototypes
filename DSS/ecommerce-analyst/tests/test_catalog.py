import pytest

from commerce_analyst.catalog import IcmCatalogClient


def test_get_product_uses_related_title_without_stock(monkeypatch: pytest.MonkeyPatch) -> None:
    client = IcmCatalogClient(base_url="https://example.test", site="SITE")

    def get_json(path, accept="application/json"):  # noqa: ANN001
        assert not path.startswith("inventories")
        if path.endswith("/links"):
            return {
                "elements": [{
                    "linkType": "accessory",
                    "productLinks": [{
                        "uri": "SUREWERX-SWC_CA-Site/-/products/V3520150-M",
                        "title": "Related Jacket",
                        "description": "<p>Desc</p>",
                    }],
                }],
            }
        if path.startswith("products/") and "?" not in path:
            raise RuntimeError("detail broken")
        raise AssertionError(path)

    monkeypatch.setattr(client, "_get_json", get_json)
    product = client.get_product("V3520250-M")
    assert product.sku == "V3520250-M"
    assert product.name == "Related Jacket"
    assert product.related[0].sku == "V3520150-M"
    assert product.detail_available is False
    assert any("stock" in warning.lower() for warning in product.warnings)
    assert "in_stock" not in product.to_dict()


def test_search_catalog_maps_attrs(monkeypatch: pytest.MonkeyPatch) -> None:
    client = IcmCatalogClient(base_url="https://example.test", site="SITE")

    def get_json(path, accept="application/json"):  # noqa: ANN001
        assert "searchTerm=jacket" in path
        return {
            "elements": [{
                "uri": "SITE/-/products/IG81218",
                "title": "FR Econoweld Jackets",
                "attributes": [
                    {"name": "sku", "value": "IG81218"},
                    {"name": "manufacturer", "value": "Ranpro"},
                ],
            }],
        }

    monkeypatch.setattr(client, "_get_json", get_json)
    hits = client.search_catalog("jacket", limit=3)
    assert hits[0].sku == "IG81218"
    assert hits[0].manufacturer == "Ranpro"
