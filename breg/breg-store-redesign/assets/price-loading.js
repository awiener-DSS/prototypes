(function (global, $) {
  if (!$) return;

  var STYLE_ID = "bregPriceLoadingStyles";
  var DEFAULT_DELAY_MS = 2000;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = "" +
      ".breg-price-loading-wrap{display:flex;align-items:center;min-height:22px;}" +
      ".breg-price-loading-wrap--pdp{min-height:36px;}" +
      ".breg-price-loading,.p-hover-price-loading{display:none;width:22px;height:22px;flex:0 0 22px;border:3px solid rgba(0,71,187,.18);border-top-color:var(--breg-primary,#0047bb);border-radius:50%;animation:bregPriceSpin .75s linear infinite;}" +
      ".breg-price-loading.is-active,.p-hover-price-loading.is-active{display:inline-block;}" +
      ".breg-price-loading--sm{width:18px;height:18px;flex-basis:18px;border-width:2px;}" +
      "@keyframes bregPriceSpin{to{transform:rotate(360deg);}}";
    document.head.appendChild(style);
  }

  function clearTimer(state) {
    if (!state || !state.priceTimer) return;
    clearTimeout(state.priceTimer);
    state.priceTimer = null;
  }

  function setLoadingActive($loading, active) {
    if ($loading && $loading.length) {
      $loading.toggleClass("is-active", !!active);
    }
  }

  function productNeedsOptionSelection(config) {
    return !!(config && config.requiredFacets && config.requiredFacets.length);
  }

  function canShowPriceAfterOptions(config, resolved, signedIn) {
    if (!signedIn) return false;
    if (!productNeedsOptionSelection(config)) return true;
    return !(resolved && resolved.reason);
  }

  function canShowPdpPrice(hasConfigurableOptions, unresolvedReason, signedIn) {
    if (!signedIn) return false;
    if (!hasConfigurableOptions) return true;
    return !unresolvedReason;
  }

  function apply(options) {
    ensureStyles();
    var state = options.state || {};
    var $loading = options.$loading;
    var $price = options.$price;
    clearTimer(state);

    if (!options.shouldShow) {
      if ($price && $price.length) $price.hide().text("");
      setLoadingActive($loading, false);
      state.priceReadyKey = null;
      if (typeof options.onHidden === "function") options.onHidden();
      return;
    }

    var priceText = String(options.priceText || "");
    var readyKey = String(options.readyKey != null ? options.readyKey : priceText);

    if (state.priceReadyKey === readyKey) {
      setLoadingActive($loading, false);
      if ($price && $price.length) $price.text(priceText).show();
      if (typeof options.onShown === "function") options.onShown(priceText);
      return;
    }

    if ($price && $price.length) {
      $price.hide().text(priceText);
    }
    setLoadingActive($loading, true);
    state.priceReadyKey = null;
    if (typeof options.onLoading === "function") options.onLoading(priceText);

    var delay = options.delayMs != null ? options.delayMs : DEFAULT_DELAY_MS;
    state.priceTimer = setTimeout(function () {
      state.priceTimer = null;
      if (typeof options.validate === "function" && !options.validate()) {
        if (typeof options.onHidden === "function") options.onHidden();
        return;
      }
      setLoadingActive($loading, false);
      if ($price && $price.length) $price.text(priceText).show();
      state.priceReadyKey = readyKey;
      if (typeof options.onShown === "function") options.onShown(priceText);
    }, delay);
  }

  global.BregPriceLoading = {
    DELAY_MS: DEFAULT_DELAY_MS,
    ensureStyles: ensureStyles,
    apply: apply,
    clearTimer: clearTimer,
    setLoadingActive: setLoadingActive,
    productNeedsOptionSelection: productNeedsOptionSelection,
    canShowPriceAfterOptions: canShowPriceAfterOptions,
    canShowPdpPrice: canShowPdpPrice
  };
})(window, window.jQuery);
