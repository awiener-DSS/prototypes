/**
 * PLP/search listing rules: show variation masters and standalone products only.
 */
(function (global) {
  var childIndex = null;

  function normalizeSku(value) {
    var sku = String(value || "").trim().toUpperCase();
    if (!sku) return "";
    var stripped = sku.replace(/^0+/, "");
    return stripped || "0";
  }

  function buildChildIndex() {
    if (childIndex) return childIndex;

    var exact = {};
    var normalized = {};
    var variantsByMaster = global.BREG_VARIANTS_BY_MASTER;
    if (variantsByMaster && typeof variantsByMaster === "object") {
      Object.keys(variantsByMaster).forEach(function (masterId) {
        var variants = variantsByMaster[masterId];
        if (!Array.isArray(variants)) return;
        variants.forEach(function (variant) {
          var sku = String(variant && variant.sku ? variant.sku : "").trim();
          if (!sku) return;
          exact[sku] = true;
          normalized[normalizeSku(sku)] = true;
        });
      });
    }

    childIndex = { exact: exact, normalized: normalized };
    return childIndex;
  }

  function isVariantChildSku(sku) {
    var id = String(sku || "").trim();
    if (!id) return false;
    var index = buildChildIndex();
    return !!index.exact[id] || !!index.normalized[normalizeSku(id)];
  }

  function isListable(item) {
    if (!item || !item.id) return false;

    var type = String(item.type || "product");
    if (type === "variation-product") return false;
    if (type === "variation-master") return true;
    if (type !== "product") return false;

    return !isVariantChildSku(item.id);
  }

  function filterListable(items) {
    return (Array.isArray(items) ? items : []).filter(isListable);
  }

  global.BregCatalogListing = {
    normalizeSku: normalizeSku,
    isVariantChildSku: isVariantChildSku,
    isListable: isListable,
    filterListable: filterListable,
    resetIndex: function () {
      childIndex = null;
    }
  };
})(window);
