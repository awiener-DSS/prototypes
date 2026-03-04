/**
 * Resolves product images from BREG_CATALOG_ITEMS (same source as PLP/PDP)
 */
(function () {
  var PREFIX = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/";
  var MISSING = PREFIX + "not_available.png";

  function normalizeUrl(raw) {
    var url = String(raw || "").trim();
    if (!url) return MISSING;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf("20260218-all-products.xml/") === 0) url = url.replace(/^20260218-all-products\.xml\//, "");
    if (url.charAt(0) === "/") url = url.slice(1);
    return url ? (PREFIX + url) : MISSING;
  }

  function findCatalogImageByName(productName) {
    var catalog = window.BREG_CATALOG_ITEMS;
    if (!catalog || !Array.isArray(catalog)) return MISSING;
    var search = String(productName || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!search) return MISSING;
    var best = null;
    var bestScore = 0;
    catalog.forEach(function (p) {
      if (!p || !p.image || !p.name) return;
      var name = String(p.name).toLowerCase();
      if (name.indexOf(search) > -1 || search.indexOf(name) > -1) {
        var score = Math.min(name.length, search.length);
        if (score > bestScore) {
          bestScore = score;
          best = p;
        }
      }
    });
    return best ? normalizeUrl(best.image) : MISSING;
  }

  function findCatalogImageById(productId) {
    var catalog = window.BREG_CATALOG_ITEMS;
    if (!catalog || !Array.isArray(catalog)) return null;
    var id = String(productId || "").trim();
    if (!id) return null;
    var found = catalog.find(function (p) {
      return p && String(p.id || "").toUpperCase() === id.toUpperCase();
    });
    return found && found.image ? normalizeUrl(found.image) : null;
  }

  window.BregCatalogImage = {
    normalize: normalizeUrl,
    byName: findCatalogImageByName,
    byId: findCatalogImageById,
    missing: MISSING
  };
})();
