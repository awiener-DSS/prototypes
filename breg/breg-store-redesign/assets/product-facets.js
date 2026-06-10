(function (global) {
  var FACETS = [
    { key: "size", label: "Size", catalogField: "sizeOptions", stateKey: "sizes", filterClass: "filter-size", chipLabel: "Size" },
    { key: "side", label: "Left/Right", catalogField: "sideOptions", stateKey: "sides", filterClass: "filter-side", chipLabel: "Left/Right" },
    { key: "braceType", label: "Brace Type", catalogField: "braceTypeOptions", stateKey: "braceTypes", filterClass: "filter-brace-type", chipLabel: "Brace Type" },
    { key: "option", label: "Option", catalogField: "optionOptions", stateKey: "options", filterClass: "filter-option", chipLabel: "Option" },
    { key: "style", label: "Style", catalogField: "styleOptions", stateKey: "styles", filterClass: "filter-style", chipLabel: "Style" }
  ];

  global.BREG_PRODUCT_FACETS = FACETS;

  global.BregProductFacets = {
    list: function () {
      return FACETS.slice();
    },
    get: function (key) {
      return FACETS.find(function (facet) { return facet.key === key; }) || null;
    },
    catalogField: function (key) {
      var facet = this.get(key);
      return facet ? facet.catalogField : "";
    },
    getCatalogValues: function (product, key) {
      var facet = this.get(key);
      if (!facet || !product) return [];
      return product[facet.catalogField] || [];
    },
    requiredFromProduct: function (product) {
      return FACETS.filter(function (facet) {
        return (product[facet.catalogField] || []).length > 1;
      });
    },
    buildFacetDefs: function (product, valueResolver) {
      return FACETS.map(function (facet) {
        var values = valueResolver
          ? valueResolver(facet, product)
          : (product[facet.catalogField] || []);
        return {
          key: facet.key,
          label: facet.label,
          catalogField: facet.catalogField,
          values: values
        };
      }).filter(function (facet) { return facet.values.length > 0; });
    },
    emptyState: function () {
      var state = { subcategories: [] };
      FACETS.forEach(function (facet) {
        state[facet.stateKey] = [];
      });
      return state;
    }
  };
})(window);
