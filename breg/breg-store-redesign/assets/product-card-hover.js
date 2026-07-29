(function (global, $) {
  if (!$) return;

  var MISSING_IMAGE = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/not_available.png";
  var HOVER_PRICE_DELAY_MS = 2000;
  var cardHoverStates = {};
  var eventsBound = false;
  var activeContainers = {};

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isSignedIn() {
    return global.BregSessionAuth
      ? global.BregSessionAuth.isSignedIn()
      : localStorage.getItem("bregSignedIn") === "true";
  }

  function isDesktopHoverView() {
    return global.matchMedia("(min-width: 768px)").matches &&
      !global.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }

  function uniq(values) {
    var seen = {};
    return (values || []).map(function (v) { return String(v || "").trim(); }).filter(function (v) {
      if (!v || seen[v]) return false;
      seen[v] = true;
      return true;
    });
  }

  function getLoginHref() {
    return "login.html?redirect=" + encodeURIComponent(
      (global.location.pathname.split("/").pop() || "index.html") + (global.location.search || "")
    );
  }

  function collectVariantFacetValues(variants, facetKey) {
    return uniq([].concat.apply([], (variants || []).map(function (variant) {
      return (variant.attributes && variant.attributes[facetKey]) || [];
    }))).sort(function (a, b) { return a.localeCompare(b); });
  }

  function getQuickViewFacetValues(product, variants, facetKey, catalogField) {
    var fromVariants = collectVariantFacetValues(variants, facetKey);
    if (fromVariants.length) return fromVariants;
    return uniq(product[catalogField] || []);
  }

  function getQuickViewConfig(product) {
    if (!product || product.type !== "variation-master") return null;
    var variantsByMaster = global.BREG_VARIANTS_BY_MASTER || {};
    var variants = Array.isArray(variantsByMaster[product.id]) ? variantsByMaster[product.id] : [];
    if (!variants.length) return null;
    var onlineVariants = variants.filter(function (variant) { return variant.online !== false; });
    var facetDefs = (global.BREG_PRODUCT_FACETS || []).map(function (facet) {
      return {
        key: facet.key,
        label: facet.label,
        values: getQuickViewFacetValues(product, onlineVariants, facet.key, facet.catalogField)
      };
    }).filter(function (facet) {
      return facet.values.length > 0;
    });
    var requiredFacets = facetDefs.filter(function (facet) { return facet.values.length > 1; });
    if (!requiredFacets.length) return null;
    return {
      facetDefs: requiredFacets,
      requiredFacets: requiredFacets,
      variants: onlineVariants
    };
  }

  function initQuickViewSelected(config) {
    var selected = {};
    (config.facetDefs || []).forEach(function (facet) {
      selected[facet.key] = facet.values.length === 1 ? String(facet.values[0] || "") : "";
    });
    return selected;
  }

  function normalizeOptionValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getQuickViewFacetKeys(config) {
    return (config && config.facetDefs || []).map(function (facet) { return facet.key; });
  }

  function variantMatchesSelection(variant, selected, facetKeys) {
    var keys = (facetKeys && facetKeys.length) ? facetKeys : Object.keys(selected || {});
    return keys.every(function (key) {
      var value = normalizeOptionValue(selected[key]);
      if (!value) return true;
      var values = (variant.attributes && variant.attributes[key]) || [];
      return values.some(function (attr) {
        return normalizeOptionValue(attr) === value;
      });
    });
  }

  function resolveQuickViewVariant(product, config, selected) {
    var variantsByMaster = global.BREG_VARIANTS_BY_MASTER || {};
    if (!config) {
      if (product && product.type === "variation-master") {
        var masterVariants = (variantsByMaster[product.id] || []).filter(function (variant) {
          return variant.online !== false;
        });
        if (masterVariants.length) {
          return {
            sku: String(masterVariants[0].sku || product.id || ""),
            variant: masterVariants[0],
            reason: ""
          };
        }
      }
      return { sku: String(product.id || ""), variant: null, reason: "" };
    }
    var variants = config.variants || [];
    if (!variants.length) {
      return { sku: "", variant: null, reason: "Variant data unavailable for this product." };
    }
    if (!(config.requiredFacets || []).length) {
      return {
        sku: String(variants[0].sku || product.id || ""),
        variant: variants[0],
        reason: ""
      };
    }
    var facetKeys = getQuickViewFacetKeys(config);
    var missing = (config.requiredFacets || []).filter(function (facet) { return !selected[facet.key]; });
    if (missing.length) {
      return { sku: "", variant: null, reason: "Choose " + missing[0].label + " to continue." };
    }
    var matches = variants.filter(function (variant) {
      return variantMatchesSelection(variant, selected, facetKeys);
    });
    if (matches.length === 1) {
      return { sku: String(matches[0].sku || ""), variant: matches[0], reason: "" };
    }
    if (!matches.length) {
      return { sku: "", variant: null, reason: "No sellable SKU matches the selected options." };
    }
    var allVisibleSelected = (config.facetDefs || []).every(function (facet) { return !!selected[facet.key]; });
    if (allVisibleSelected) {
      var masterStem = String(product.id || "").split("-")[0] || "";
      var preferred = matches.find(function (variant) {
        return masterStem && String(variant.sku || "").indexOf(masterStem) === 0;
      });
      var chosen = preferred || matches[0];
      return { sku: String(chosen.sku || ""), variant: chosen, reason: "" };
    }
    return { sku: "", variant: null, reason: "Select additional options to resolve a single SKU." };
  }

  function normalizeProductImageUrl(url) {
    var value = String(url || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return value;
  }

  function getQuickViewImage(product, variant) {
    if (variant && Array.isArray(variant.images) && variant.images.length) {
      return normalizeProductImageUrl(variant.images[0]) || MISSING_IMAGE;
    }
    return product.image || MISSING_IMAGE;
  }

  function stateKeyForCard($card) {
    return String($card.find(".p-card-hover-panel").attr("data-product-id") || "");
  }

  function getCardHoverState(productId) {
    return cardHoverStates[String(productId || "")] || null;
  }

  function initCardHoverState(product) {
    if (!product) return null;
    var config = getQuickViewConfig(product);
    var state = {
      product: product,
      config: config,
      selected: config ? initQuickViewSelected(config) : {},
      qty: 1,
      resolvedSku: String(product.id || ""),
      resolvedVariant: null,
      priceTimer: null,
      priceReadyKey: null,
      priceDisplayed: false
    };
    cardHoverStates[String(product.id)] = state;
    return state;
  }

  function productNeedsOptionSelection(config) {
    if (global.BregPriceLoading && typeof global.BregPriceLoading.productNeedsOptionSelection === "function") {
      return global.BregPriceLoading.productNeedsOptionSelection(config);
    }
    return !!(config && config.requiredFacets && config.requiredFacets.length);
  }

  function canShowHoverPrice(config, resolved) {
    if (global.BregPriceLoading && typeof global.BregPriceLoading.canShowPriceAfterOptions === "function") {
      return global.BregPriceLoading.canShowPriceAfterOptions(config, resolved, isSignedIn());
    }
    if (!isSignedIn()) return false;
    if (!productNeedsOptionSelection(config)) return true;
    return !resolved.reason;
  }

  function formatHoverPrice(product) {
    var amount = Number(product && product.price ? product.price : 0);
    return "$" + (global.BregFormatMoney ? global.BregFormatMoney(amount) : amount.toFixed(2));
  }

  function getHoverSelectionProgress(state) {
    var facets = (state && state.config && state.config.facetDefs) || [];
    var total = facets.length;
    var done = facets.reduce(function (sum, facet) {
      return sum + (state.selected && state.selected[facet.key] ? 1 : 0);
    }, 0);
    return { done: done, total: total, complete: total === 0 || done === total };
  }

  function nextHoverPrompt(state, resolved) {
    if (resolved && resolved.reason) return resolved.reason;
    var facets = (state && state.config && state.config.facetDefs) || [];
    var next = facets.find(function (facet) {
      return !(state.selected && state.selected[facet.key]);
    });
    return next ? ("Select " + next.label + " to continue.") : "All options selected.";
  }

  function getNextHoverFacetKey(state) {
    var facets = (state && state.config && state.config.facetDefs) || [];
    var next = facets.find(function (facet) {
      return !(state.selected && state.selected[facet.key]);
    });
    return next ? String(next.key || "") : "";
  }

  function scrollCardHoverToNextOption($card, state) {
    var $body = $card.find(".p-hover-body");
    var nextKey = getNextHoverFacetKey(state);
    if (nextKey) {
      if (!$body.length) return;
      var $target = $body.find(".p-hover-group").filter(function () {
        return String($(this).attr("data-facet") || "") === nextKey;
      }).first();
      if (!$target.length) return;
      var bodyEl = $body.get(0);
      var targetEl = $target.get(0);
      if (!bodyEl || !targetEl) return;
      var bodyRect = bodyEl.getBoundingClientRect();
      var targetRect = targetEl.getBoundingClientRect();
      var nextTop = bodyEl.scrollTop + (targetRect.top - bodyRect.top) - 8;
      var maxTop = Math.max(0, bodyEl.scrollHeight - bodyEl.clientHeight);
      nextTop = Math.max(0, Math.min(nextTop, maxTop));
      if (typeof bodyEl.scrollTo === "function") {
        bodyEl.scrollTo({ top: nextTop, behavior: "smooth" });
      } else {
        bodyEl.scrollTop = nextTop;
      }
      return;
    }

    // All options selected — scroll options to the end and bring Add to Cart into view
    if ($body.length) {
      var scrollBody = $body.get(0);
      if (scrollBody) {
        if (typeof scrollBody.scrollTo === "function") {
          scrollBody.scrollTo({ top: scrollBody.scrollHeight, behavior: "smooth" });
        } else {
          scrollBody.scrollTop = scrollBody.scrollHeight;
        }
      }
    }
    var footerEl = $card.find(".p-hover-footer, .js-card-hover-add").get(0);
    if (footerEl && typeof footerEl.scrollIntoView === "function") {
      footerEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }

  function positionCardHoverPanel($card) {
    var $panel = $card.find(".p-card-hover-panel");
    if (!$panel.length) return;
    var panelEl = $panel.get(0);
    if (!panelEl) return;
    $panel.removeClass("is-above is-fixed").css({
      position: "",
      top: "",
      bottom: "",
      right: "",
      width: "",
      maxHeight: "",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: ""
    });
    requestAnimationFrame(function () {
      if (!$card.is(":hover")) return;
      var pad = 12;
      $panel.css({ left: "50%", transform: "translateX(-50%)" });
      var panelRect = panelEl.getBoundingClientRect();
      var shift = 0;
      if (panelRect.left < pad) shift = pad - panelRect.left;
      if (panelRect.right > global.innerWidth - pad) shift = (global.innerWidth - pad) - panelRect.right;
      if (shift) {
        $panel.css("transform", "translateX(calc(-50% + " + shift + "px))");
      }
    });
  }

  function clearCardHoverPanelPosition($card) {
    $card.find(".p-card-hover-panel")
      .removeClass("is-above is-fixed")
      .css({
        left: "",
        top: "",
        bottom: "",
        right: "",
        width: "",
        maxHeight: "",
        transform: "",
        position: "",
        zIndex: ""
      });
  }

  function renderCardHoverFacets($card, state) {
    var $config = $card.find(".js-card-hover-config");
    if (!state || !state.config) {
      $config.empty();
      return;
    }
    var html = "";
    (state.config.facetDefs || []).forEach(function (facet, index) {
      var isLocked = facet.values.length === 1;
      var selectedValue = state.selected[facet.key];
      var optionsHtml = facet.values.map(function (value) {
        var selected = selectedValue === value ? " selected" : "";
        var disabledAttr = isLocked ? " disabled" : "";
        return "<button type='button' class='p-hover-choice js-card-hover-option" + selected + "' data-facet='" + escapeHtml(facet.key) + "' data-value='" + escapeHtml(value) + "'" + disabledAttr + ">" + escapeHtml(value) + "</button>";
      }).join("");
      html +=
        "<section class='p-hover-group' data-facet='" + escapeHtml(facet.key) + "'>" +
          "<div class='p-hover-group-title'>" +
            "<span class='p-hover-step'>" + (index + 1) + "</span>" +
            escapeHtml(facet.label) +
            (selectedValue ? "" : " <span class='p-hover-req'>• Required</span>") +
          "</div>" +
          "<div class='p-hover-choices'>" + optionsHtml + "</div>" +
        "</section>";
    });
    $config.html(html);
  }

  function refreshCardHoverAddButton($card, state, resolved) {
    var $addBtn = $card.find(".js-card-hover-add");
    var progress = getHoverSelectionProgress(state);
    var canAdd = !!resolved.sku && !resolved.reason;
    var waitingForPrice = isSignedIn() && canShowHoverPrice(state.config, resolved) && !state.priceDisplayed;
    var remaining = Math.max(0, progress.total - progress.done);
    var label;
    var enabled = false;

    if (!isSignedIn()) {
      label = "Login to add to cart";
      enabled = true;
    } else if (!canAdd) {
      label = remaining > 0
        ? ("Select " + remaining + " more option" + (remaining === 1 ? "" : "s"))
        : "Select options";
      enabled = false;
    } else if (waitingForPrice) {
      label = "Loading price";
      enabled = false;
    } else {
      label = "Add to Cart";
      enabled = true;
    }

    $addBtn
      .text(label)
      .toggleClass("enabled", enabled)
      .prop("disabled", !enabled)
      .attr("title", label)
      .attr("aria-label", label);
  }

  function updateCardHoverPrice($card, state, product, resolved) {
    var $price = $card.find(".js-card-hover-price");
    var $loading = $card.find(".js-card-hover-price-loading");
    var $box = $card.find(".js-card-hover-price-box");
    var $pending = $card.find(".js-card-hover-price-pending");
    var shouldShow = canShowHoverPrice(state.config, resolved);
    var priceText = formatHoverPrice(product);
    var readyKey = String(resolved.sku || product.id || "") + "|" + priceText;

    function setPending(active) {
      $box.toggleClass("pending", !!active);
      if (active) $pending.show();
      else $pending.hide();
    }

    function refreshAddButton() {
      var currentResolved = resolveQuickViewVariant(product, state.config, state.selected || {});
      refreshCardHoverAddButton($card, state, currentResolved);
    }

    if (!global.BregPriceLoading) {
      if (shouldShow) {
        setPending(false);
        $price.text(priceText).show();
        state.priceDisplayed = true;
      } else {
        setPending(true);
        $price.hide().text("");
        state.priceDisplayed = false;
      }
      refreshAddButton();
      return;
    }

    global.BregPriceLoading.apply({
      state: state,
      shouldShow: shouldShow,
      priceText: priceText,
      readyKey: readyKey,
      delayMs: HOVER_PRICE_DELAY_MS,
      $loading: $loading,
      $price: $price,
      onLoading: function () {
        setPending(false);
        state.priceDisplayed = false;
        refreshAddButton();
      },
      onHidden: function () {
        setPending(true);
        state.priceDisplayed = false;
        refreshAddButton();
      },
      onShown: function () {
        setPending(false);
        state.priceDisplayed = true;
        refreshAddButton();
      },
      validate: function () {
        if (!$card.closest("body").length) return false;
        var currentState = getCardHoverState(stateKeyForCard($card));
        if (!currentState || currentState !== state) return false;
        var currentResolved = resolveQuickViewVariant(product, state.config, state.selected || {});
        return canShowHoverPrice(state.config, currentResolved) &&
          String(currentResolved.sku || product.id || "") + "|" + priceText === readyKey;
      }
    });
  }

  function updateCardHoverPanel($card, options) {
    options = options || {};
    var productId = stateKeyForCard($card);
    var state = getCardHoverState(productId);
    if (!state || !state.product) return;
    var product = state.product;
    var resolved = resolveQuickViewVariant(product, state.config, state.selected || {});
    state.resolvedSku = resolved.sku;
    state.resolvedVariant = resolved.variant;

    var progress = getHoverSelectionProgress(state);
    var needsOptions = productNeedsOptionSelection(state.config);
    $card.find(".p-card-hover-panel").toggleClass("no-options", !needsOptions);
    $card.find(".p-hover-name").text(product.name || product.id);
    $card.find(".js-card-hover-progress-count").text(progress.done + " of " + progress.total + " selected");
    $card.find(".js-card-hover-progress-bar").css("width", (progress.total ? (progress.done / progress.total) * 100 : 100) + "%");

    if (!options.skipPrice) {
      updateCardHoverPrice($card, state, product, resolved);
    }

    renderCardHoverFacets($card, state);

    var $notice = $card.find(".js-card-hover-msg");
    if (!needsOptions || (progress.complete && !resolved.reason)) {
      $notice.hide().text("").removeClass("success");
    } else {
      $notice
        .text(nextHoverPrompt(state, resolved))
        .removeClass("success")
        .show();
    }

    $card.find(".js-card-hover-qty-val").text(String(state.qty || 1));
    refreshCardHoverAddButton($card, state, resolved);

    var image = getQuickViewImage(product, resolved.variant);
    $card.find(".p-thumb, .js-card-hover-thumb").attr("src", image);
  }

  function addLineToCart(line) {
    if (!line || !String(line.sku || "")) return false;
    if (global.BregCart && typeof global.BregCart.addLine === "function") {
      global.BregCart.addLine(line);
      if (typeof global.BregCart.syncBadge === "function") global.BregCart.syncBadge();
      return true;
    }
    return false;
  }

  function buildPanelHtml(product, missingImage) {
    var fallback = missingImage || MISSING_IMAGE;
    var image = product.image || fallback;
    return "" +
      "<div class='p-card-hover-panel' data-product-id='" + escapeHtml(product.id) + "'>" +
        "<div class='p-hover-head'>" +
          "<div class='p-hover-thumb'><img class='js-card-hover-thumb' src='" + escapeHtml(image) + "' onerror=\"this.onerror=null;this.src='" + fallback + "';\" alt=''></div>" +
          "<div>" +
            "<div class='p-hover-name'>" + escapeHtml(product.name || product.id) + "</div>" +
            "<p class='p-hover-sub'>Choose all required options before adding this item to the cart.</p>" +
          "</div>" +
        "</div>" +
        "<div class='p-hover-progress-wrap'>" +
          "<div class='p-hover-progress-line'>" +
            "<span>Complete all required selections</span>" +
            "<span class='js-card-hover-progress-count'>0 of 0 selected</span>" +
          "</div>" +
          "<div class='p-hover-bar'><span class='js-card-hover-progress-bar'></span></div>" +
        "</div>" +
        "<div class='p-hover-body'>" +
          "<div class='p-hover-config js-card-hover-config'></div>" +
          "<div class='p-hover-notice js-card-hover-msg'></div>" +
        "</div>" +
        "<div class='p-hover-footer'>" +
          "<div>" +
            "<div class='p-hover-qty-label'>Quantity</div>" +
            "<div class='p-hover-qty-stepper'>" +
              "<button type='button' class='js-card-hover-qty-dec' aria-label='Decrease quantity'>&minus;</button>" +
              "<span class='p-hover-qty-val js-card-hover-qty-val'>1</span>" +
              "<button type='button' class='js-card-hover-qty-inc' aria-label='Increase quantity'>&plus;</button>" +
            "</div>" +
          "</div>" +
          "<div>" +
            "<div class='p-hover-price-label'>Price</div>" +
            "<div class='p-hover-price-box js-card-hover-price-box pending'>" +
              "<span class='p-hover-price-loading js-card-hover-price-loading' role='status' aria-label='Loading price'></span>" +
              "<span class='p-hover-price-pending js-card-hover-price-pending'>Select options</span>" +
              "<span class='p-hover-price js-card-hover-price' style='display:none;'></span>" +
            "</div>" +
          "</div>" +
          "<button type='button' class='p-hover-add-btn js-card-hover-add' disabled aria-label='Select options'>Select options</button>" +
        "</div>" +
      "</div>";
  }

  function buildCardHtml(product, options) {
    options = options || {};
    var missingImage = options.missingImage || MISSING_IMAGE;
    var category = product.category || options.defaultCategory || "Knee Bracing";
    var detailHref = "product-detail.html?category=" + encodeURIComponent(category) + "&id=" + encodeURIComponent(product.id);
    var image = product.image || missingImage;
    var name = escapeHtml(product.name || product.id);
    var enableHover = options.enableHover !== false;
    return "" +
      "<article class='p-card' style='border:0;box-shadow:none;'>" +
        "<div class='p-media'>" +
          "<a class='p-card-link' href='" + detailHref + "'>" +
            "<img class='p-thumb' src='" + escapeHtml(image) + "' onerror=\"this.onerror=null;this.src='" + missingImage + "';\" alt='" + name + "'>" +
          "</a>" +
          (enableHover ? buildPanelHtml(product, missingImage) : "") +
        "</div>" +
        "<a class='p-card-body-link p-card-default-body' href='" + detailHref + "'>" +
          "<div class='p-body'>" +
            "<h3 class='p-title'>" + name + "</h3>" +
          "</div>" +
        "</a>" +
      "</article>";
  }

  function findProductInContainers(productId) {
    var id = String(productId || "");
    var keys = Object.keys(activeContainers);
    for (var i = 0; i < keys.length; i += 1) {
      var finder = activeContainers[keys[i]].findProduct;
      if (typeof finder === "function") {
        var product = finder(id);
        if (product) return product;
      }
    }
    var catalog = global.BREG_CATALOG_ITEMS || [];
    return catalog.find(function (item) { return String(item.id) === id; }) || null;
  }

  function initContainer(selector, options) {
    options = options || {};
    var $container = $(selector);
    if (!$container.length) return;
    $container.addClass("has-product-card-hover");
    activeContainers[selector] = {
      selector: selector,
      findProduct: options.findProduct || findProductInContainers
    };

    if (!isDesktopHoverView()) return;

    $container.find(".p-card").each(function () {
      var $card = $(this);
      var productId = stateKeyForCard($card);
      var product = (options.findProduct || findProductInContainers)(productId);
      if (!product) return;
      initCardHoverState(product);
      var hoverState = getCardHoverState(productId);
      updateCardHoverPanel($card, {
        skipPrice: hoverState && !productNeedsOptionSelection(hoverState.config)
      });
    });
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    $(document)
      .on("mouseenter.bregCardHover", ".has-product-card-hover .p-card", function () {
        if (!isDesktopHoverView()) return;
        var $card = $(this);
        positionCardHoverPanel($card);
        var productId = stateKeyForCard($card);
        var state = getCardHoverState(productId);
        if (!state || !state.product || !isSignedIn()) return;
        if (!productNeedsOptionSelection(state.config)) {
          state.priceReadyKey = null;
          var resolved = resolveQuickViewVariant(state.product, state.config, state.selected || {});
          updateCardHoverPrice($card, state, state.product, resolved);
        }
      })
      .on("mouseleave.bregCardHover", ".has-product-card-hover .p-card", function () {
        clearCardHoverPanelPosition($(this));
      })
      .on("click.bregCardHover", ".has-product-card-hover .js-card-hover-option", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if ($(this).prop("disabled")) return;
        var $card = $(this).closest(".p-card");
        var state = getCardHoverState(stateKeyForCard($card));
        if (!state || !state.config) return;
        var facetKey = String($(this).attr("data-facet") || "");
        var facetValue = String($(this).attr("data-value") || "");
        if (!facetKey) return;
        state.selected[facetKey] = facetValue;
        updateCardHoverPanel($card);
        requestAnimationFrame(function () {
          scrollCardHoverToNextOption($card, state);
          positionCardHoverPanel($card);
        });
      })
      .on("click.bregCardHover", ".has-product-card-hover .js-card-hover-qty-dec", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $card = $(this).closest(".p-card");
        var state = getCardHoverState(stateKeyForCard($card));
        if (!state) return;
        state.qty = Math.max(1, Number(state.qty || 1) - 1);
        updateCardHoverPanel($card);
      })
      .on("click.bregCardHover", ".has-product-card-hover .js-card-hover-qty-inc", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $card = $(this).closest(".p-card");
        var state = getCardHoverState(stateKeyForCard($card));
        if (!state) return;
        state.qty = Math.min(99, Number(state.qty || 1) + 1);
        updateCardHoverPanel($card);
      })
      .on("click.bregCardHover", ".has-product-card-hover .js-card-hover-add", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if ($(this).prop("disabled")) return;
        var $card = $(this).closest(".p-card");
        var state = getCardHoverState(stateKeyForCard($card));
        if (!state || !state.product) return;
        if (!isSignedIn()) {
          global.location.href = getLoginHref();
          return;
        }
        var product = state.product;
        var resolved = resolveQuickViewVariant(product, state.config, state.selected || {});
        var resolvedSku = String(resolved.sku || state.resolvedSku || "");
        if (!resolvedSku || resolved.reason) {
          updateCardHoverPanel($card);
          return;
        }
        var variant = resolved.variant || state.resolvedVariant;
        var line = {
          sku: resolvedSku,
          qty: Math.max(1, Math.round(Number(state.qty || 1))),
          name: String((variant && variant.name) || product.name || resolvedSku),
          price: Number(product.price || 0),
          image: getQuickViewImage(product, variant),
          category: String(product.category || "")
        };
        if (!addLineToCart(line)) return;
        if (global.BregCart && typeof global.BregCart.showAddedModal === "function") {
          global.BregCart.showAddedModal([line]);
        }
      });
  }

  global.BregProductCardHover = {
    MISSING_IMAGE: MISSING_IMAGE,
    buildPanelHtml: buildPanelHtml,
    buildCardHtml: buildCardHtml,
    initContainer: initContainer,
    bindEvents: bindEvents,
    escapeHtml: escapeHtml
  };
})(window, window.jQuery);
