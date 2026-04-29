(function () {
  var $searchWrap = $(".search-wrap");
  var $searchInput = $("#searchInput");
  var $searchClear = $("#searchClear");
  var $searchDropdown = $("#searchDropdown");
  var $searchSuggestionTitle = $("#searchSuggestionTitle");
  var $searchSuggestionList = $("#searchSuggestionList");
  var $searchCategoryList = $("#searchCategoryList");
  var $searchPreviewTitle = $("#searchPreviewTitle");
  var $searchPreviewList = $("#searchPreviewList");
  var $langToggle = $("#langToggle");
  var $countryDropdown = $("#countryDropdown");
  var $langCodeLabel = $("#langCodeLabel");
  var $countryLabel = $("#countryLabel");
  var $marketLabel = $("#marketLabel");
  var $accountToggle = $("#accountToggle");
  var $accountDropdown = $("#accountDropdown");
  var $accountGreeting = $("#accountGreeting");
  var $accountSignout = $("#accountSignout");
  var $accountName = $("#accountName");
  var $accountEmail = $("#accountEmail");
  var $accountOnlyLinks = $(".account-only");
  var $accountSectionTitle = $(".account-col-title");
  var BG_COLOR_STORAGE_KEY = "bregBgColor";
  var DEFAULT_BG_COLOR = "#e7eded";
  var $returnsOrdersLink = $('a.action-box[href="order-history.html"]');
  var $cartLink = $("a.cart-box");
  var $headerActions = $(".header-actions").first();
  if ($headerActions.length && !$headerActions.find(".top-quick-order-link").length) {
    $headerActions.prepend(
      "<a class='action-box top-quick-order-link js-quick-order-link' href='#'>" +
        "<span class='action-strong'>Quick Order</span>" +
      "</a>"
    );
  }
  var $subNav = $(".sub-nav .site-max").first();
  var $allToggle = $(".sub-nav-inner .sub-nav-link").filter(function () {
    return $(this).find(".glyphicon-menu-hamburger").length > 0;
  }).first();
  if ($allToggle.length) {
    $allToggle.remove();
    $allToggle = $();
  }
  var $quickOrderLink = $(".sub-nav-inner .sub-nav-link.quick-order").first();
  if ($quickOrderLink.length) {
    $quickOrderLink.remove();
  }
  var allToggleOriginalHtml = $allToggle.length ? $allToggle.html() : "";
  var $allDrawerOverlay = $();
  var allMenuState = { expandedParent: null };

  function isValidHexColor(value) {
    return /^#([0-9a-f]{6})$/i.test(String(value || "").trim());
  }

  function applyBackgroundColor(colorValue) {
    if (!isValidHexColor(colorValue)) return;
    document.documentElement.style.setProperty("--breg-gray", colorValue);
  }

  function getStoredBackgroundColor() {
    try {
      var stored = localStorage.getItem(BG_COLOR_STORAGE_KEY);
      if (isValidHexColor(stored)) return stored;
    } catch (e) {}
    return DEFAULT_BG_COLOR;
  }

  applyBackgroundColor(getStoredBackgroundColor());

  $(document).on("input change", "#floatingBgColorPicker", function () {
    var next = String($(this).val() || "").trim().toLowerCase();
    if (!isValidHexColor(next)) return;
    applyBackgroundColor(next);
    try { localStorage.setItem(BG_COLOR_STORAGE_KEY, next); } catch (e) {}
  });

  $(document).on("click", "#floatingBgColorReset", function () {
    applyBackgroundColor(DEFAULT_BG_COLOR);
    try { localStorage.removeItem(BG_COLOR_STORAGE_KEY); } catch (e) {}
    $("#floatingBgColorPicker").val(DEFAULT_BG_COLOR);
  });

  if (!$searchWrap.length) return;

  var CART_STORAGE_KEY = "breg_cart_v1";

  function readCartLines() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCartLines(lines) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.isArray(lines) ? lines : []));
    } catch (e) {}
  }

  function toPriceNumber(value) {
    if (typeof value === "number") return isFinite(value) ? value : 0;
    var cleaned = String(value || "").replace(/[^0-9.-]/g, "");
    var parsed = parseFloat(cleaned);
    return isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    var n = typeof value === "number" ? value : Number(value || 0);
    if (!isFinite(n)) n = 0;
    try {
      return n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      return n.toFixed(2);
    }
  }

  window.BregFormatMoney = formatMoney;

  function normalizeCartLine(line) {
    var sku = String(line && line.sku ? line.sku : "").trim();
    if (!sku) return null;
    var qty = Number(line && line.qty != null ? line.qty : 1);
    qty = isFinite(qty) ? Math.max(1, Math.round(qty)) : 1;
    return {
      sku: sku,
      qty: qty,
      name: String(line && line.name ? line.name : sku),
      price: toPriceNumber(line && line.price),
      image: String(line && line.image ? line.image : ""),
      category: String(line && line.category ? line.category : ""),
      variant: String(line && line.variant ? line.variant : ""),
      size: String(line && line.size ? line.size : "")
    };
  }

  function addLineBySku(target, line) {
    var normalized = normalizeCartLine(line);
    if (!normalized) return target;
    var existing = target.find(function (x) {
      return String(x && x.sku ? x.sku : "") === normalized.sku;
    });
    if (existing) {
      existing.qty = Number(existing.qty || 0) + normalized.qty;
      if (normalized.name) existing.name = normalized.name;
      if (normalized.price || normalized.price === 0) existing.price = normalized.price;
      if (normalized.image) existing.image = normalized.image;
      if (normalized.category) existing.category = normalized.category;
      if (normalized.variant) existing.variant = normalized.variant;
      if (normalized.size) existing.size = normalized.size;
    } else {
      target.push(normalized);
    }
    return target;
  }

  function addLinesToCart(lines) {
    var cart = readCartLines();
    (Array.isArray(lines) ? lines : []).forEach(function (line) {
      addLineBySku(cart, line);
    });
    saveCartLines(cart);
    syncCartCountBadge();
    return cart;
  }

  function readCartCount() {
    var parsed = readCartLines();
    return parsed.reduce(function (sum, line) {
      return sum + Number(line && line.qty ? line.qty : 0);
    }, 0);
  }

  function syncCartCountBadge() {
    var total = readCartCount();
    $(".cart-count").text(total);
  }

  function ensureSharedCartAddedModal() {
    if ($("#sharedCartAddedModal").length) return;

    if (!$("#sharedCartAddedModalStyles").length) {
      var modalStyles = "" +
        "<style id='sharedCartAddedModalStyles'>" +
          ".bulk-modal{position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;padding:16px;}" +
          ".bulk-modal.open{display:flex;}" +
          ".bulk-dialog{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:12px;border:1px solid #dbe3ea;box-shadow:0 18px 50px rgba(15,23,42,.28);}" +
          ".bulk-head{padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:10px;}" +
          ".bulk-head h3{margin:0;font-size:22px;line-height:1.2;color:var(--breg-darkest,#071d49);font-family:var(--font-headline);}" +
          ".bulk-close{border:0;background:transparent;font-size:28px;line-height:1;color:var(--breg-darkest,#071d49);opacity:.8;padding:0 4px;}" +
          ".cart-added-body{padding:14px 16px 16px;}" +
          ".cart-added-note{margin:0 0 10px;font-size:14px;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".cart-added-sub{margin:0 0 12px;font-size:13px;color:var(--breg-darkest,#071d49);opacity:.85;font-family:var(--font-body);}" +
          ".cart-added-picked{margin:0 0 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:10px;}" +
          ".cart-added-picked h4{margin:0 0 8px;font-size:14px;color:var(--breg-darkest,#071d49);font-family:var(--font-headline);}" +
          ".cart-added-picked-list{margin:0;padding:0;list-style:none;display:grid;gap:6px;}" +
          ".cart-added-picked-row{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:baseline;border-bottom:1px solid #eef2f7;padding-bottom:6px;}" +
          ".cart-added-picked-row:last-child{border-bottom:0;padding-bottom:0;}" +
          ".cart-added-picked-name{font-size:12px;color:var(--breg-darkest,#071d49);line-height:1.35;font-family:var(--font-body);}" +
          ".cart-added-picked-sku,.cart-added-picked-qty{font-size:12px;color:var(--breg-darkest,#071d49);opacity:.8;white-space:nowrap;font-family:var(--font-body);}" +
          ".cart-added-related{border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;padding:10px;}" +
          ".cart-added-related h4{margin:0 0 8px;font-size:14px;color:var(--breg-darkest,#071d49);font-family:var(--font-headline);}" +
          ".cart-added-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}" +
          ".cart-added-item{border:1px solid #dbe3ea;border-radius:8px;background:#fff;padding:8px;display:grid;grid-template-columns:64px 1fr;gap:8px;align-items:center;}" +
          ".cart-added-item img{width:64px;height:64px;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px;background:#fff;padding:4px;}" +
          ".cart-added-item-title{margin:0 0 4px;font-size:12px;line-height:1.35;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".cart-added-item-price{margin:0 0 6px;font-size:12px;color:var(--breg-primary,#0047bb);font-family:var(--font-body);}" +
          ".cart-added-add{border:1px solid var(--breg-primary,#0047bb);background:#fff;border-radius:999px;padding:4px 10px;font-size:12px;color:var(--breg-primary,#0047bb);font-family:var(--font-body);}" +
          ".bulk-foot{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:flex-end;gap:10px;}" +
          ".bulk-btn-cancel,.bulk-btn-check,.bulk-btn-add{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:999px;font-size:13px;text-decoration:none;}" +
          ".bulk-btn-cancel{border:1px solid #d1d5dc;background:#fff;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".bulk-btn-check{border:1px solid var(--breg-primary,#0047bb);background:#fff;color:var(--breg-primary,#0047bb);font-family:var(--font-body);}" +
          ".bulk-btn-add{border:1px solid var(--breg-primary,#0047bb);background:var(--breg-primary,#0047bb);color:#fff;font-family:var(--font-body);}" +
          ".bulk-btn-check:hover,.bulk-btn-check:focus,.bulk-btn-cancel:hover,.bulk-btn-cancel:focus{text-decoration:none;color:var(--breg-darkest,#071d49);}.bulk-btn-add:hover,.bulk-btn-add:focus{text-decoration:none;color:#fff;background:var(--breg-primary-dark,#001E62);border-color:var(--breg-primary-dark,#001E62);}" +
          "@media (max-width:767px){.cart-added-list{grid-template-columns:1fr;}.bulk-foot{flex-wrap:wrap;}}" +
        "</style>";
      $("head").append(modalStyles);
    }

    var modalHtml = "" +
      "<div class='bulk-modal' id='sharedCartAddedModal' aria-hidden='true'>" +
        "<div class='bulk-dialog cart-added-dialog' role='dialog' aria-modal='true' aria-labelledby='sharedCartAddedTitle'>" +
          "<div class='bulk-head'>" +
            "<h3 id='sharedCartAddedTitle'>Added to Cart</h3>" +
            "<button type='button' class='bulk-close' id='sharedCartAddedClose' aria-label='Close'>x</button>" +
          "</div>" +
          "<div class='cart-added-body'>" +
            "<p class='cart-added-note' id='sharedCartAddedSummary'></p>" +
            "<p class='cart-added-sub' id='sharedCartAddedOtherItems'></p>" +
            "<div class='cart-added-picked' id='sharedCartAddedPicked'></div>" +
            "<div class='cart-added-related'>" +
              "<h4>Frequently Purchased Together</h4>" +
              "<div class='cart-added-list' id='sharedCartAddedRelated'></div>" +
            "</div>" +
          "</div>" +
          "<div class='bulk-foot'>" +
            "<button type='button' class='bulk-btn-cancel' id='sharedCartAddedContinue'>Continue Shopping</button>" +
            "<a class='bulk-btn-check' id='sharedCartAddedViewCart' href='shopping-cart.html'>View Cart</a>" +
            "<button type='button' class='bulk-btn-add' id='sharedCartAddedBuyNow'>Buy Now</button>" +
          "</div>" +
        "</div>" +
      "</div>";

    var $firstBodyScript = $("body > script").first();
    if ($firstBodyScript.length) {
      $(modalHtml).insertBefore($firstBodyScript);
    } else {
      $("body").append(modalHtml);
    }

    $(document).on("click", "#sharedCartAddedClose, #sharedCartAddedContinue", function () {
      $("#sharedCartAddedModal").removeClass("open").attr("aria-hidden", "true");
    });
    $(document).on("click", "#sharedCartAddedModal", function (event) {
      if (event.target === this) {
        $("#sharedCartAddedModal").removeClass("open").attr("aria-hidden", "true");
      }
    });
    $(document).on("click", "#sharedCartAddedBuyNow", function () {
      window.location.href = "checkout.html";
    });
    $(document).on("click", ".js-shared-cart-added-add", function () {
      var line = {
        sku: String($(this).attr("data-sku") || ""),
        qty: 1,
        name: String($(this).attr("data-name") || ""),
        price: toPriceNumber($(this).attr("data-price")),
        image: String($(this).attr("data-image") || ""),
        category: String($(this).attr("data-category") || "")
      };
      if (!line.sku) return;
      addLinesToCart([line]);
      $(this).text("Added").prop("disabled", true);
      var baseQty = Number($("#sharedCartAddedModal").data("added-qty") || 0);
      var totalQty = readCartCount();
      var otherQty = Math.max(0, totalQty - baseQty);
      $("#sharedCartAddedOtherItems").text(
        otherQty > 0
          ? ("You also have " + otherQty + " other item" + (otherQty === 1 ? "" : "s") + " in your cart.")
          : "This is the first item in your cart."
      );
    });
    $(document).on("keydown.sharedCartAdded", function (event) {
      if (event.key === "Escape" && $("#sharedCartAddedModal").hasClass("open")) {
        $("#sharedCartAddedModal").removeClass("open").attr("aria-hidden", "true");
      }
    });
  }

  function openSharedCartAddedModal(lines) {
    var addedLines = (Array.isArray(lines) ? lines : [])
      .map(function (line) { return normalizeCartLine(line); })
      .filter(Boolean);
    if (!addedLines.length) return;

    ensureSharedCartAddedModal();

    var addedQty = addedLines.reduce(function (sum, line) { return sum + Number(line.qty || 0); }, 0);
    var totalQty = readCartCount();
    var otherQty = Math.max(0, totalQty - addedQty);
    var summaryText;
    if (addedLines.length === 1) {
      summaryText = addedLines[0].name + " (Qty " + addedQty + ") was added to your cart.";
    } else {
      summaryText = addedLines.length + " SKUs (Qty " + addedQty + ") were added to your cart.";
    }
    $("#sharedCartAddedSummary").text(summaryText);
    $("#sharedCartAddedOtherItems").text(
      otherQty > 0
        ? ("You also have " + otherQty + " other item" + (otherQty === 1 ? "" : "s") + " in your cart.")
        : "These are the first items in your cart."
    );

    var pickedHtml = "<h4>Items added</h4><ul class='cart-added-picked-list'>";
    addedLines.forEach(function (line) {
      pickedHtml += "<li class='cart-added-picked-row'>" +
        "<span class='cart-added-picked-name'>" + escapeHtml(line.name || line.sku || "Product") + "</span>" +
        "<span class='cart-added-picked-sku'>" + escapeHtml(String(line.sku || "")) + "</span>" +
        "<span class='cart-added-picked-qty'>Qty " + Number(line.qty || 0) + "</span>" +
      "</li>";
    });
    pickedHtml += "</ul>";
    $("#sharedCartAddedPicked").html(pickedHtml);

    var missingImg = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/not_available.png";
    var addedSkuSet = {};
    addedLines.forEach(function (line) { addedSkuSet[String(line.sku || "")] = true; });
    var relatedCandidates = readCartLines().filter(function (line) {
      return !addedSkuSet[String(line && line.sku ? line.sku : "")];
    });
    if (!relatedCandidates.length) relatedCandidates = addedLines.slice();
    relatedCandidates = relatedCandidates.slice(0, 4);

    var relatedHtml = relatedCandidates.map(function (line) {
      var img = String(line.image || "").trim() || missingImg;
      var price = Number(line.price || 0);
      var name = String(line.name || line.sku || "Product");
      var sku = String(line.sku || "");
      return "<div class='cart-added-item'>" +
        "<img src='" + escapeHtml(img) + "' onerror=\"this.onerror=null;this.src='" + missingImg + "';\" alt='" + escapeHtml(name) + "'>" +
        "<div>" +
          "<p class='cart-added-item-title'>" + escapeHtml(name) + "</p>" +
          "<p class='cart-added-item-price'>$" + formatMoney(price) + "</p>" +
          "<button type='button' class='cart-added-add js-shared-cart-added-add' data-sku='" + escapeHtml(sku) + "' data-name='" + escapeHtml(name) + "' data-price='" + price.toFixed(2) + "' data-image='" + escapeHtml(img) + "' data-category='" + escapeHtml(line.category || "") + "'>Add</button>" +
        "</div>" +
      "</div>";
    }).join("");
    $("#sharedCartAddedRelated").html(relatedHtml || "<div class='pdp-empty'>No related products found.</div>");

    $("#sharedCartAddedModal").data("added-qty", addedQty);
    $("#sharedCartAddedModal").addClass("open").attr("aria-hidden", "false");
  }

  var QUICK_ORDER_MISSING_IMAGE = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/not_available.png";
  var QUICK_ORDER_IMAGE_BASE = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/";
  var QUICK_ORDER_DEFAULT_ROWS = 5;
  var QUICK_ORDER_DRAFT_STORAGE_KEY = "breg_quick_order_draft_v1";
  var quickOrderCatalog = null;
  var quickOrderCatalogBySku = {};
  var quickOrderCatalogPromise = null;

  function normalizeQuickOrderImage(url) {
    var value = String(url || "").trim();
    if (!value) return QUICK_ORDER_MISSING_IMAGE;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("20260218-all-products.xml/") === 0) {
      value = value.replace(/^20260218-all-products\.xml\//, "");
    }
    if (value.indexOf("medium/") === 0) return QUICK_ORDER_IMAGE_BASE + value;
    if (/^[^\/]+\.(jpg|jpeg|png|webp)$/i.test(value)) return QUICK_ORDER_IMAGE_BASE + "medium/" + value;
    return QUICK_ORDER_IMAGE_BASE + value.replace(/^\/+/, "");
  }

  function quickOrderSkuKey(value) {
    return String(value || "").trim().toUpperCase();
  }

  function buildQuickOrderCatalog(items) {
    var seen = {};
    var list = [];
    (Array.isArray(items) ? items : []).forEach(function (item) {
      var sku = String(item && (item.id || item.sku) ? (item.id || item.sku) : "").trim();
      if (!sku) return;
      var key = quickOrderSkuKey(sku);
      if (!key || seen[key]) return;
      seen[key] = true;
      list.push({
        sku: sku,
        name: String(item && item.name ? item.name : sku),
        image: normalizeQuickOrderImage(item && item.image),
        category: String(item && item.category ? item.category : ""),
        price: toPriceNumber(item && item.price)
      });
    });
    quickOrderCatalog = list;
    quickOrderCatalogBySku = {};
    list.forEach(function (item) {
      quickOrderCatalogBySku[quickOrderSkuKey(item.sku)] = item;
    });
    return list;
  }

  function ensureQuickOrderCatalogLoaded() {
    if (quickOrderCatalog && quickOrderCatalog.length) {
      return $.Deferred().resolve(quickOrderCatalog).promise();
    }
    if (Array.isArray(window.BREG_CATALOG_ITEMS) && window.BREG_CATALOG_ITEMS.length) {
      return $.Deferred().resolve(buildQuickOrderCatalog(window.BREG_CATALOG_ITEMS)).promise();
    }
    if (quickOrderCatalogPromise) return quickOrderCatalogPromise;

    var deferred = $.Deferred();
    quickOrderCatalogPromise = deferred.promise();
    var script = document.querySelector("script[data-quick-order-catalog='1']");

    function resolveFromWindow() {
      var source = Array.isArray(window.BREG_CATALOG_ITEMS) ? window.BREG_CATALOG_ITEMS : [];
      deferred.resolve(buildQuickOrderCatalog(source));
    }

    if (script) {
      script.addEventListener("load", resolveFromWindow, { once: true });
      script.addEventListener("error", function () { deferred.resolve(buildQuickOrderCatalog([])); }, { once: true });
      if (Array.isArray(window.BREG_CATALOG_ITEMS) && window.BREG_CATALOG_ITEMS.length) {
        resolveFromWindow();
      }
      return quickOrderCatalogPromise;
    }

    script = document.createElement("script");
    script.src = "analysis/catalog-data.js?v=20260218b";
    script.async = true;
    script.setAttribute("data-quick-order-catalog", "1");
    script.addEventListener("load", resolveFromWindow, { once: true });
    script.addEventListener("error", function () { deferred.resolve(buildQuickOrderCatalog([])); }, { once: true });
    document.body.appendChild(script);
    return quickOrderCatalogPromise;
  }

  function searchQuickOrderCatalog(term) {
    var q = String(term || "").trim().toLowerCase();
    if (!q) return [];
    var list = quickOrderCatalog || [];
    var ranked = [];
    list.forEach(function (item) {
      var sku = String(item.sku || "").toLowerCase();
      var name = String(item.name || "").toLowerCase();
      var score = -1;
      if (sku.indexOf(q) === 0) score = 400 - sku.length;
      else if (name.indexOf(q) === 0) score = 300 - name.length;
      else if (sku.indexOf(q) > -1) score = 200 - sku.indexOf(q);
      else if (name.indexOf(q) > -1) score = 100 - name.indexOf(q);
      if (score > -1) ranked.push({ score: score, item: item });
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.slice(0, 8).map(function (entry) { return entry.item; });
  }

  function readQuickOrderRows($scope) {
    var rows = [];
    var $root = $scope && $scope.length ? $scope : $("#quickOrderRows");
    $root.find(".quick-order-row").each(function () {
      var $row = $(this);
      var input = String($row.find(".js-quick-order-sku").val() || "").trim();
      var qty = Math.max(1, Number($row.find(".js-quick-order-qty").val() || 1));
      var selected = $row.data("quick-selected");
      if (!input && !(selected && selected.sku)) return;
      rows.push({
        input: input,
        qty: qty,
        selected: selected && selected.sku ? {
          sku: String(selected.sku || ""),
          name: String(selected.name || selected.sku || ""),
          image: String(selected.image || ""),
          category: String(selected.category || ""),
          price: toPriceNumber(selected.price)
        } : null
      });
    });
    return rows;
  }

  function saveQuickOrderDraft(rows) {
    try {
      sessionStorage.setItem(QUICK_ORDER_DRAFT_STORAGE_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
    } catch (e) {}
  }

  function ensureQuickOrderModal() {
    if ($("#quickOrderModal").length) return;

    if (!$("#quickOrderModalStyles").length) {
      var quickStyles = "" +
        "<style id='quickOrderModalStyles'>" +
          ".quick-order-modal{position:fixed;inset:0;z-index:12500;background:rgba(15,23,42,.56);display:none;align-items:center;justify-content:center;padding:16px;}" +
          ".quick-order-modal.open{display:flex;}" +
          ".quick-order-dialog{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:12px;border:1px solid #dbe3ea;box-shadow:0 18px 50px rgba(15,23,42,.28);}" +
          ".quick-order-head{padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;gap:10px;}" +
          ".quick-order-head h3{margin:0;font-size:22px;line-height:1.2;color:var(--breg-darkest,#071d49);font-family:var(--font-headline);}" +
          ".quick-order-close{border:0;background:transparent;font-size:28px;line-height:1;color:var(--breg-darkest,#071d49);opacity:.8;padding:0 4px;}" +
          ".quick-order-body{padding:14px 16px 16px;}" +
          ".quick-order-sub{margin:0 0 12px;font-size:13px;color:var(--breg-darkest,#071d49);opacity:.85;font-family:var(--font-body);}" +
          ".quick-order-grid{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;}" +
          ".quick-order-cell{position:relative;}" +
          ".quick-order-grid-head{font-size:12px;text-transform:uppercase;letter-spacing:.45px;color:var(--breg-darkest,#071d49);opacity:.8;font-weight:600;font-family:var(--font-headline);margin-bottom:6px;}" +
          ".quick-order-row{margin-bottom:8px;}" +
          ".quick-order-input{width:100%;height:36px;border:1px solid #cfd8e3;border-radius:8px;padding:0 10px;font-size:13px;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".quick-order-input:focus{outline:0;border-color:var(--breg-primary,#0047bb);box-shadow:0 0 0 3px rgba(0,71,187,.15);}" +
          ".quick-order-suggest{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:3;background:#fff;border:1px solid #d6dee7;border-radius:10px;box-shadow:0 10px 20px rgba(15,23,42,.12);max-height:280px;overflow:auto;display:none;}" +
          ".quick-order-suggest.open{display:block;}" +
          ".quick-order-suggest-item{width:100%;border:0;background:#fff;padding:8px 10px;display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:center;text-align:left;border-bottom:1px solid #eef2f6;}" +
          ".quick-order-suggest-item:last-child{border-bottom:0;}" +
          ".quick-order-suggest-item:hover,.quick-order-suggest-item:focus{background:#f8fbff;outline:0;}" +
          ".quick-order-suggest-item img{width:44px;height:44px;object-fit:contain;border:1px solid #e4e8ee;border-radius:8px;background:#fff;padding:2px;}" +
          ".quick-order-suggest-name{display:block;font-size:12px;font-weight:700;color:var(--breg-darkest,#071d49);line-height:1.2;font-family:var(--font-body);}" +
          ".quick-order-suggest-sku{display:block;font-size:12px;color:var(--breg-darkest,#071d49);opacity:.8;line-height:1.3;margin-top:2px;font-family:var(--font-body);}" +
          ".quick-order-qty{width:86px;height:36px;border:1px solid #cfd8e3;border-radius:8px;padding:0 10px;font-size:13px;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".quick-order-del{height:36px;width:36px;border:1px solid #d1d5dc;border-radius:8px;background:#fff;color:var(--breg-darkest,#071d49);padding:0;font-size:14px;display:inline-flex;align-items:center;justify-content:center;}" +
          ".quick-order-add-row{height:34px;border:1px solid var(--breg-primary,#0047bb);border-radius:999px;background:#fff;color:var(--breg-primary,#0047bb);padding:0 12px;font-size:12px;font-family:var(--font-body);}" +
          ".quick-order-foot{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:flex-end;gap:10px;}" +
          ".quick-order-cancel,.quick-order-submit{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:999px;font-size:13px;text-decoration:none;}" +
          ".quick-order-cancel{border:1px solid #d1d5dc;background:#fff;color:var(--breg-darkest,#071d49);font-family:var(--font-body);}" +
          ".quick-order-submit{border:1px solid var(--breg-primary,#0047bb);background:var(--breg-primary,#0047bb);color:#fff;font-family:var(--font-body);}" +
          ".quick-order-cancel:hover,.quick-order-cancel:focus{text-decoration:none;color:var(--breg-darkest,#071d49);}.quick-order-submit:hover,.quick-order-submit:focus{text-decoration:none;color:#fff;background:var(--breg-primary-dark,#001E62);border-color:var(--breg-primary-dark,#001E62);}" +
          "@media (max-width:767px){.quick-order-grid{grid-template-columns:1fr 92px 44px;}}" +
        "</style>";
      $("head").append(quickStyles);
    }

    var quickHtml = "" +
      "<div class='quick-order-modal' id='quickOrderModal' aria-hidden='true'>" +
        "<div class='quick-order-dialog' role='dialog' aria-modal='true' aria-labelledby='quickOrderTitle'>" +
          "<div class='quick-order-head'>" +
            "<h3 id='quickOrderTitle'>Quick Order</h3>" +
            "<button type='button' class='quick-order-close' id='quickOrderClose' aria-label='Close'>x</button>" +
          "</div>" +
          "<div class='quick-order-body'>" +
            "<p class='quick-order-sub'>Enter SKU and quantity to add products quickly.</p>" +
            "<div class='quick-order-grid quick-order-grid-head'><div>SKU or Product Name</div><div>Qty</div><div></div></div>" +
            "<div id='quickOrderRows'></div>" +
            "<button type='button' class='quick-order-add-row' id='quickOrderAddRow'>Add Another SKU</button>" +
          "</div>" +
          "<div class='quick-order-foot'>" +
            "<button type='button' class='quick-order-cancel' id='quickOrderCancel'>Cancel</button>" +
            "<button type='button' class='quick-order-submit' id='quickOrderSubmit'>Add to Cart</button>" +
          "</div>" +
        "</div>" +
      "</div>";

    var $firstBodyScript = $("body > script").first();
    if ($firstBodyScript.length) {
      $(quickHtml).insertBefore($firstBodyScript);
    } else {
      $("body").append(quickHtml);
    }

      function addQuickRow(seed) {
      var sku = seed && seed.sku ? String(seed.sku) : "";
      var qty = seed && seed.qty != null ? Number(seed.qty) : 1;
      var row = "" +
        "<div class='quick-order-grid quick-order-row'>" +
          "<div class='quick-order-cell'>" +
            "<input type='text' class='quick-order-input js-quick-order-sku' placeholder='Enter SKU or product name' value='" + escapeHtml(sku) + "' autocomplete='off'>" +
            "<div class='quick-order-suggest js-quick-order-suggest'></div>" +
          "</div>" +
          "<input type='number' class='quick-order-qty js-quick-order-qty' min='1' step='1' value='" + (isFinite(qty) && qty > 0 ? Math.round(qty) : 1) + "'>" +
          "<button type='button' class='quick-order-del js-quick-order-del' aria-label='Remove row'><span class='glyphicon glyphicon-trash'></span></button>" +
        "</div>";
      $("#quickOrderRows").append(row);
    }

    function closeQuickSuggestions($scope) {
      var $root = $scope && $scope.length ? $scope : $("#quickOrderRows");
      $root.find(".js-quick-order-suggest").removeClass("open").empty();
    }

    function renderQuickSuggestions($row, results) {
      var $suggest = $row.find(".js-quick-order-suggest");
      if (!$suggest.length) return;
      if (!results || !results.length) {
        closeQuickSuggestions($row);
        return;
      }
      var html = results.map(function (item) {
        return "" +
          "<button type='button' class='quick-order-suggest-item js-quick-order-suggestion' " +
            "data-sku='" + escapeHtml(item.sku) + "' data-name='" + escapeHtml(item.name) + "' " +
            "data-image='" + escapeHtml(item.image || QUICK_ORDER_MISSING_IMAGE) + "' " +
            "data-price='" + Number(item.price || 0).toFixed(2) + "' " +
            "data-category='" + escapeHtml(item.category || "") + "'>" +
            "<img src='" + escapeHtml(item.image || QUICK_ORDER_MISSING_IMAGE) + "' onerror=\"this.onerror=null;this.src='" + QUICK_ORDER_MISSING_IMAGE + "';\" alt='" + escapeHtml(item.name || item.sku || "Product") + "'>" +
            "<span><span class='quick-order-suggest-name'>" + escapeHtml(item.name || item.sku) + "</span><span class='quick-order-suggest-sku'>SKU: " + escapeHtml(item.sku) + "</span></span>" +
          "</button>";
      }).join("");
      $suggest.html(html).addClass("open");
    }

    function setQuickRowProductMeta($row, item) {
      if (!item) {
        $row.removeData("quick-selected");
        return;
      }
      $row.data("quick-selected", {
        sku: String(item.sku || ""),
        name: String(item.name || item.sku || ""),
        image: String(item.image || ""),
        category: String(item.category || ""),
        price: toPriceNumber(item.price)
      });
    }

    function resetQuickRows() {
      $("#quickOrderRows").empty();
      for (var i = 0; i < QUICK_ORDER_DEFAULT_ROWS; i += 1) {
        addQuickRow({ qty: 1 });
      }
    }

    function closeQuickOrderModal() {
      $("#quickOrderModal").removeClass("open").attr("aria-hidden", "true");
    }

    $(document).on("click", "#quickOrderClose, #quickOrderCancel", function () {
      closeQuickOrderModal();
    });
    $(document).on("click", "#quickOrderModal", function (event) {
      if (event.target === this) closeQuickOrderModal();
    });
    $(document).on("click", "#quickOrderAddRow", function () {
      if ($("#quickOrderModal").data("quick-seeding") === "1") {
        addQuickRow({ qty: 1 });
        return;
      }
      saveQuickOrderDraft(readQuickOrderRows());
      closeQuickOrderModal();
      window.location.href = "quick-order.html";
    });
    $(document).on("input", ".js-quick-order-sku", function () {
      var $input = $(this);
      var $row = $input.closest(".quick-order-row");
      var value = String($input.val() || "").trim();
      setQuickRowProductMeta($row, null);
      if (value.length < 2) {
        closeQuickSuggestions($row);
        return;
      }
      ensureQuickOrderCatalogLoaded().done(function () {
        renderQuickSuggestions($row, searchQuickOrderCatalog(value));
      });
    });
    $(document).on("keydown", ".js-quick-order-sku", function (event) {
      if (event.key !== "Enter") return;
      var $row = $(this).closest(".quick-order-row");
      var $first = $row.find(".js-quick-order-suggest:visible .js-quick-order-suggestion").first();
      if (!$first.length) return;
      event.preventDefault();
      $first.trigger("click");
    });
    $(document).on("click", ".js-quick-order-suggestion", function () {
      var $btn = $(this);
      var $row = $btn.closest(".quick-order-row");
      var item = {
        sku: String($btn.attr("data-sku") || ""),
        name: String($btn.attr("data-name") || ""),
        image: String($btn.attr("data-image") || ""),
        category: String($btn.attr("data-category") || ""),
        price: toPriceNumber($btn.attr("data-price"))
      };
      $row.find(".js-quick-order-sku").val(item.name || item.sku);
      setQuickRowProductMeta($row, item);
      closeQuickSuggestions($row);
      $row.find(".js-quick-order-qty").trigger("focus");
    });
    $(document).on("mousedown", function (event) {
      if (!$(event.target).closest(".quick-order-cell").length) {
        closeQuickSuggestions();
      }
    });
    $(document).on("click", ".js-quick-order-del", function () {
      var $rows = $("#quickOrderRows .quick-order-row");
      if ($rows.length <= 1) {
        $rows.find(".js-quick-order-sku").val("");
        $rows.find(".js-quick-order-qty").val("1");
        return;
      }
      $(this).closest(".quick-order-row").remove();
    });
    $(document).on("click", "#quickOrderSubmit", function () {
      var bySku = {};
      var lineMeta = {};
      var lines = [];
      $("#quickOrderRows .quick-order-row").each(function () {
        var $row = $(this);
        var rawInput = String($(this).find(".js-quick-order-sku").val() || "").trim();
        var qty = Math.max(1, Number($(this).find(".js-quick-order-qty").val() || 1));
        var selected = $row.data("quick-selected");
        if (selected && selected.sku) {
          var selectedKey = quickOrderSkuKey(selected.sku);
          bySku[selectedKey] = (bySku[selectedKey] || 0) + qty;
          lineMeta[selectedKey] = selected;
          return;
        }
        if (!rawInput) return;

        var key = quickOrderSkuKey(rawInput);
        var exactBySku = quickOrderCatalogBySku[key];
        var exactByName = null;
        if (!exactBySku && quickOrderCatalog && quickOrderCatalog.length) {
          var rawLower = rawInput.toLowerCase();
          exactByName = quickOrderCatalog.find(function (item) {
            return String(item && item.name ? item.name : "").toLowerCase() === rawLower;
          }) || null;
          if (exactByName) key = quickOrderSkuKey(exactByName.sku);
        }

        bySku[key] = (bySku[key] || 0) + qty;
        if (exactBySku) {
          lineMeta[key] = exactBySku;
        } else if (exactByName) {
          lineMeta[key] = exactByName;
        } else {
          lineMeta[key] = lineMeta[key] || { sku: rawInput, name: rawInput, price: 0, image: "", category: "Quick Order" };
        }

        if (selected && quickOrderSkuKey(selected.sku) === key) {
          lineMeta[key] = selected;
        }
      });
      Object.keys(bySku).forEach(function (key) {
        var meta = lineMeta[key] || {};
        lines.push({
          sku: String(meta.sku || key),
          qty: bySku[key],
          name: String(meta.name || meta.sku || key),
          price: toPriceNumber(meta.price),
          image: String(meta.image || ""),
          category: String(meta.category || "Quick Order"),
          variant: String(meta.sku || key),
          size: ""
        });
      });
      if (!lines.length) return;
      addLinesToCart(lines);
      closeQuickOrderModal();
      openSharedCartAddedModal(lines);
    });
    $(document).on("keydown.quickOrder", function (event) {
      if (event.key === "Escape" && $("#quickOrderModal").hasClass("open")) {
        closeQuickOrderModal();
      }
    });

    $("#quickOrderModal").data("quick-row-init", "1");
    resetQuickRows();
  }

  function openQuickOrderModal() {
    ensureQuickOrderModal();
    ensureQuickOrderCatalogLoaded();
    $("#quickOrderRows").empty();
    $("#quickOrderModal").data("quick-seeding", "1");
    for (var i = 0; i < QUICK_ORDER_DEFAULT_ROWS; i += 1) {
      $("#quickOrderAddRow").trigger("click");
    }
    $("#quickOrderModal").data("quick-seeding", "0");
    $("#quickOrderModal").addClass("open").attr("aria-hidden", "false");
    $("#quickOrderRows .js-quick-order-sku").first().trigger("focus");
  }

  var recentSearches = ["knee brace", "cold therapy", "shoulder support", "lumbar support belt"];
  var categories = [
    "Knee Bracing",
    "Shoulder Bracing",
    "Spine Bracing",
    "Cold Therapy and DVT",
    "Walker/Ankle/Foot Bracing",
    "Elbow/Wrist Bracing",
    "Hip Bracing",
    "Splints and Fracture Management",
    "Crutches, Canes & Walkers",
    "Home Therapy & Misc.",
    "Pediatrics"
  ];
  var RECENT_CATEGORIES_STORAGE_KEY = "breg_recent_categories_v1";
  var RECENT_CATEGORIES_MAX = 8;
  var SEARCH_MISSING_IMAGE = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/not_available.png";
  var SEARCH_IMAGE_PREFIX = "https://store.breg.com/INTERSHOP/static/WFS/Breg-B2B-Site/-/Breg/en_US/";

  function normalizeSearchImage(rawUrl) {
    var url = String(rawUrl || "").trim();
    if (!url) return SEARCH_MISSING_IMAGE;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf("20260218-all-products.xml/") === 0) url = url.replace(/^20260218-all-products\.xml\//, "");
    if (url.charAt(0) === "/") url = url.slice(1);
    return url ? (SEARCH_IMAGE_PREFIX + url) : SEARCH_MISSING_IMAGE;
  }

  function getCatalogImageForCategory(category) {
    var catalog = window.BREG_CATALOG_ITEMS;
    if (!catalog || !Array.isArray(catalog)) return SEARCH_MISSING_IMAGE;
    var cat = String(category || "").toLowerCase();
    var found = catalog.find(function (p) {
      return p && p.category && String(p.category).toLowerCase() === cat && p.image;
    });
    return found ? normalizeSearchImage(found.image) : SEARCH_MISSING_IMAGE;
  }

  function getCatalogProductsForCategory(category, limit) {
    var catalog = window.BREG_CATALOG_ITEMS;
    if (!catalog || !Array.isArray(catalog)) return [];
    var cat = String(category || "").toLowerCase();
    var valid = catalog.filter(function (p) {
      return p && p.category && String(p.category).toLowerCase() === cat && p.name && p.category !== "Uncategorized";
    });
    return valid.slice(0, limit || 6).map(function (p) {
      return { name: p.name, price: "$" + formatMoney(Number(p.price) || 0), image: normalizeSearchImage(p.image) };
    });
  }

  function buildSearchSuggestionsFromCatalog() {
    var catalog = window.BREG_CATALOG_ITEMS;
    if (!catalog || !Array.isArray(catalog)) return [];
    var seen = {};
    var out = [];
    catalog.forEach(function (p) {
      if (!p || !p.name || !p.category || p.category === "Uncategorized" || seen[p.id]) return;
      seen[p.id] = true;
      out.push({ text: p.name, category: p.category, image: normalizeSearchImage(p.image) });
    });
    return out.slice(0, 12);
  }

  var searchSuggestionsFallback = [
    { text: "Polar Care Kodiak® Cold Therapy System", category: "Cold Therapy and DVT", image: SEARCH_MISSING_IMAGE },
    { text: "FreeSport Knee Brace - Premium Support", category: "Knee Bracing", image: SEARCH_MISSING_IMAGE },
    { text: "SlingShot 3 Shoulder Brace", category: "Shoulder Bracing", image: SEARCH_MISSING_IMAGE },
    { text: "T Scope Premier Post-Op Knee Brace", category: "Knee Bracing", image: SEARCH_MISSING_IMAGE },
    { text: "Lumbar Support Back Brace", category: "Spine Bracing", image: SEARCH_MISSING_IMAGE },
    { text: "Ice Pack Replacement - Universal Fit", category: "Cold Therapy and DVT", image: SEARCH_MISSING_IMAGE }
  ];
  var searchSuggestions = (function () {
    var fromCatalog = buildSearchSuggestionsFromCatalog();
    return fromCatalog.length ? fromCatalog : searchSuggestionsFallback;
  })();

  var previewByCategory = (function () {
    var cats = ["Knee Bracing", "Shoulder Bracing", "Cold Therapy and DVT", "Spine Bracing", "Walker/Ankle/Foot Bracing", "Elbow/Wrist Bracing", "Hip Bracing", "Splints and Fracture Management", "Crutches, Canes & Walkers", "Home Therapy & Misc.", "Pediatrics"];
    var out = {};
    cats.forEach(function (c) {
      var products = getCatalogProductsForCategory(c, 4);
      out[c] = products.length ? products : [{ name: "Products in " + c, price: "", image: SEARCH_MISSING_IMAGE }];
    });
    return out;
  })();

  var categoryImage = (function () {
    var cats = ["Knee Bracing", "Shoulder Bracing", "Cold Therapy and DVT", "Spine Bracing", "Walker/Ankle/Foot Bracing", "Elbow/Wrist Bracing", "Hip Bracing", "Splints and Fracture Management", "Crutches, Canes & Walkers", "Home Therapy & Misc.", "Pediatrics"];
    var out = {};
    cats.forEach(function (c) { out[c] = getCatalogImageForCategory(c); });
    return out;
  })();

  var storedAuth = localStorage.getItem("bregSignedIn");
  var isSignedIn = storedAuth === null ? true : storedAuth === "true";
  var allMenuSections = [
    {
      title: "Shop by Category",
      items: [
        { label: "Knee Bracing", children: ["Adjustable ROM", "Functional OA Bracing", "Knee Ligament Bracing", "Patellofemoral Bracing", "Post-Op Knee Bracing", "Soft Supports"] },
        { label: "Shoulder Bracing", children: ["Immobilizers and Stabilizers", "Slings and Braces"] },
        { label: "Cold Therapy and DVT", children: ["Devices", "Pads", "Gel Packs", "DVT Prophylaxis"] },
        { label: "Spine Bracing", children: ["Cervical Clavicle", "Featured Lower Spine", "Featured Upper Spine", "Lumbar"] },
        { label: "Walker/Ankle/Foot Bracing", children: ["Walking Boots", "Ankle Bracing", "Foot Supports"] },
        { label: "Elbow/Wrist Bracing", children: ["Elbow Bracing", "Wrist Bracing"] },
        { label: "Hip Bracing", children: ["Post Op"] },
        { label: "Splints and Fracture Management", children: ["Fracture Bracing", "Splint and Fracture Management"] },
        { label: "Crutches, Canes & Walkers", children: ["Aluminum Push Button Crutches", "Folding Walker", "Push Button Aluminum Cane"] },
        { label: "Home Therapy & Misc.", children: ["Home Therapy Kits", "Recovery"] },
        { label: "Pediatrics", children: ["Knee Bracing", "Shoulder Bracing", "Elbow/Wrist Bracing", "Foot Supports", "Walking Boots", "Upper Spine", "Miscellaneous"] }
      ]
    },
    {
      title: "Help & Settings",
      items: [
        { label: "Quick Order", href: "#", strong: true, quick: true },
        { label: "Your Account", href: "your-account.html", strong: true, auth: true },
        { label: "Your Orders", href: "order-history.html", strong: true, auth: true }
      ]
    }
  ];

  function renderSharedFooter() {
    if ($("footer[data-shared-footer]").length) return;

    $("footer.home-footer, footer.pl-footer, footer.page-footer, footer.footer").remove();

    var footerHtml = "" +
      "<footer class='site-footer' data-shared-footer='1'>" +
        "<div class='site-footer-wrap'>" +
          "<div class='site-footer-grid'>" +
            "<div>" +
              "<h3 class='site-footer-title'>Information</h3>" +
              "<ul class='site-footer-list'>" +
                "<li><a href='#'>Contact Us</a></li>" +
                "<li><a href='#'>Warranty/Return Policy</a></li>" +
                "<li><a href='#'>BregPay</a></li>" +
                "<li><a href='#'>Instructions for Use (IFUs)</a></li>" +
                "<li><a href='#'>GTIN</a></li>" +
                "<li><a href='#'>Frequently Asked Questions</a></li>" +
                "<li><a href='#'>Breg.com</a></li>" +
              "</ul>" +
            "</div>" +
            "<div>" +
              "<h3 class='site-footer-title'>Products</h3>" +
              "<ul class='site-footer-list'>" +
                "<li><a href='product-list.html?category=Knee%20Bracing'>Knee Bracing</a></li>" +
                "<li><a href='product-list.html?category=Shoulder%20Bracing'>Shoulder Bracing</a></li>" +
                "<li><a href='product-list.html?category=Spine%20Bracing'>Spine Bracing</a></li>" +
                "<li><a href='product-list.html?category=Walker%2FAnkle%2FFoot%20Bracing'>Walker/Ankle/Foot</a></li>" +
                "<li><a href='product-list.html?category=Elbow%2FWrist%20Bracing'>Wrist/Elbow Bracing</a></li>" +
                "<li><a href='product-list.html?category=Cold%20Therapy%20and%20DVT'>Cold Therapy</a></li>" +
                "<li><a href='#'>DVT</a></li>" +
                "<li><a href='product-list.html?category=Hip%20Bracing'>Hip Bracing</a></li>" +
                "<li><a href='#'>Fracture Bracing</a></li>" +
                "<li><a href='product-list.html?category=Crutches%2C%20Canes%20%26%20Walkers'>Canes/Crutches/Walkers</a></li>" +
                "<li><a href='product-list.html?category=Pediatrics'>Pediatrics</a></li>" +
              "</ul>" +
            "</div>" +
            "<div>" +
              "<h3 class='site-footer-title'>My Account</h3>" +
              "<ul class='site-footer-list'>" +
                "<li><a href='order-history.html'>Order History</a></li>" +
                "<li><a href='#'>BregPay</a></li>" +
                "<li><a href='#' class='js-quick-order-link'>Quick Order</a></li>" +
              "</ul>" +
            "</div>" +
            "<div>" +
              "<h3 class='site-footer-title'>Services</h3>" +
              "<ul class='site-footer-list'>" +
                "<li><a href='#'>Breg Impact&reg;</a></li>" +
                "<li><a href='#'>Breg Vision&reg;</a></li>" +
              "</ul>" +
            "</div>" +
          "</div>" +
          "<div class='site-footer-copy'>&copy; 2026 Breg, Inc. All rights reserved.</div>" +
        "</div>" +
      "</footer>";

    var $firstBodyScript = $("body > script").first();
    if ($firstBodyScript.length) {
      $(footerHtml).insertBefore($firstBodyScript);
    } else {
      $("body").append(footerHtml);
    }
  }

  renderSharedFooter();

  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function imageForRecentTerm(term) {
    var t = term.toLowerCase();
    if (t.indexOf("cold") > -1 || t.indexOf("ice") > -1 || t.indexOf("dvt") > -1) return categoryImage["Cold Therapy and DVT"];
    if (t.indexOf("knee") > -1) return categoryImage["Knee Bracing"];
    if (t.indexOf("shoulder") > -1) return categoryImage["Shoulder Bracing"];
    if (t.indexOf("lumbar") > -1 || t.indexOf("spine") > -1 || t.indexOf("back") > -1) return categoryImage["Spine Bracing"];
    if (t.indexOf("walker") > -1 || t.indexOf("ankle") > -1 || t.indexOf("foot") > -1 || t.indexOf("boot") > -1) return categoryImage["Walker/Ankle/Foot Bracing"];
    if (t.indexOf("elbow") > -1 || t.indexOf("wrist") > -1) return categoryImage["Elbow/Wrist Bracing"];
    if (t.indexOf("hip") > -1) return categoryImage["Hip Bracing"];
    if (t.indexOf("fracture") > -1 || t.indexOf("splint") > -1) return categoryImage["Splints and Fracture Management"];
    if (t.indexOf("crutch") > -1 || t.indexOf("cane") > -1) return categoryImage["Crutches, Canes & Walkers"];
    if (t.indexOf("therapy kit") > -1 || t.indexOf("recovery") > -1) return categoryImage["Home Therapy & Misc."];
    if (t.indexOf("pediatric") > -1 || t.indexOf("child") > -1) return categoryImage["Pediatrics"];
    return categoryImage["Cold Therapy and DVT"];
  }

  function renderSearchPreview(category) {
    var key = category || "Cold Therapy and DVT";
    var items = previewByCategory[key] || [];
    $searchPreviewTitle.text("Top Products in " + key);
    $searchPreviewList.empty();
    items.forEach(function (item) {
      var priceHtml = isSignedIn ? ("<div class='search-preview-price'>" + item.price + "</div>") : "";
      $searchPreviewList.append(
        "<button type='button' class='search-preview-item js-search-preview-product' " +
          "data-name='" + escapeHtml(item.name) + "' data-category='" + escapeHtml(key) + "'>" +
          "<img src='" + item.image + "' alt='" + escapeHtml(item.name) + "'>" +
          "<div><div class='search-preview-name'>" + escapeHtml(item.name) + "</div>" + priceHtml + "</div>" +
        "</button>"
      );
    });
  }

  function loadRecentCategories() {
    try {
      var parsed = JSON.parse(localStorage.getItem(RECENT_CATEGORIES_STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(function (name) { return String(name || "").trim(); })
        .filter(function (name, index, arr) { return !!name && arr.indexOf(name) === index; });
    } catch (e) {
      return [];
    }
  }

  function saveRecentCategories(items) {
    try {
      localStorage.setItem(
        RECENT_CATEGORIES_STORAGE_KEY,
        JSON.stringify((Array.isArray(items) ? items : []).slice(0, RECENT_CATEGORIES_MAX))
      );
    } catch (e) {}
  }

  function normalizeCategoryLabel(raw) {
    var label = String(raw || "").trim();
    if (!label) return "";
    var exact = categories.find(function (name) {
      return name.toLowerCase() === label.toLowerCase();
    });
    return exact || label;
  }

  function trackRecentCategory(rawLabel) {
    var label = normalizeCategoryLabel(rawLabel);
    if (!label || label === "All" || label === "Quick Order") return;
    var current = loadRecentCategories().filter(function (name) {
      return name.toLowerCase() !== label.toLowerCase();
    });
    current.unshift(label);
    saveRecentCategories(current);
  }

  function findCategoryByTerm(rawTerm) {
    var term = String(rawTerm || "").trim().toLowerCase();
    if (!term) return "";
    var exact = categories.find(function (name) { return name.toLowerCase() === term; });
    if (exact) return exact;
    var partial = categories.find(function (name) { return name.toLowerCase().indexOf(term) > -1; });
    return partial || "";
  }

  function findCatalogProduct(rawTerm, preferredCategory) {
    var term = String(rawTerm || "").trim().toLowerCase();
    if (!term) return null;
    var preferred = String(preferredCategory || "").trim().toLowerCase();
    var list = Array.isArray(quickOrderCatalog) ? quickOrderCatalog : [];
    if (!list.length) return null;

    function normalize(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    var termNorm = normalize(term);
    if (!termNorm) return null;

    var ranked = list.map(function (item) {
      var nameRaw = String(item && item.name ? item.name : "");
      var skuRaw = String(item && item.sku ? item.sku : "");
      var categoryRaw = String(item && item.category ? item.category : "").toLowerCase();
      var nameNorm = normalize(nameRaw);
      var skuNorm = normalize(skuRaw);
      var score = -1;

      if (skuNorm && skuNorm === termNorm) score = 1000;
      else if (nameNorm && nameNorm === termNorm) score = 950;
      else if (nameNorm && termNorm.indexOf(nameNorm) > -1) score = 900;
      else if (nameNorm && nameNorm.indexOf(termNorm) > -1) score = 850;
      else if (skuNorm && skuNorm.indexOf(termNorm) > -1) score = 800;
      else if (nameNorm) {
        var termWords = termNorm.split(" ").filter(Boolean);
        var matchedWords = 0;
        termWords.forEach(function (w) { if (w.length > 2 && nameNorm.indexOf(w) > -1) matchedWords += 1; });
        if (matchedWords >= Math.min(2, termWords.length)) score = 700 + matchedWords;
      }

      if (score < 0) return { score: -1, item: item };
      if (preferred && categoryRaw === preferred) score += 40;
      return { score: score, item: item };
    }).filter(function (entry) { return entry.score >= 0; });

    if (!ranked.length) return null;
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked[0].item || null;
  }

  function goToCategoryPage(category) {
    var normalized = normalizeCategoryLabel(category);
    if (!normalized) return;
    trackRecentCategory(normalized);
    window.location.href = "product-list.html?category=" + encodeURIComponent(normalized);
  }

  function goToProductPage(product, fallbackCategory) {
    if (!product || !product.sku) return false;
    var category = normalizeCategoryLabel(product.category || fallbackCategory || "");
    var href = "product-detail.html?id=" + encodeURIComponent(product.sku);
    if (category) href += "&category=" + encodeURIComponent(category);
    if (category) trackRecentCategory(category);
    window.location.href = href;
    return true;
  }

  function navigateSearchSelection(term, categoryHint) {
    var value = String(term || "").trim();
    if (!value) {
      closeSearchDropdown();
      return;
    }

    var categoryMatch = findCategoryByTerm(categoryHint || value);
    var hasLoadedCatalog = Array.isArray(quickOrderCatalog) && quickOrderCatalog.length > 0;
    if (hasLoadedCatalog) {
      var productMatch = findCatalogProduct(value, categoryHint || "");
      if (productMatch) {
        goToProductPage(productMatch, categoryMatch || categoryHint || "");
        return;
      }
      if (categoryMatch) {
        goToCategoryPage(categoryMatch);
        return;
      }
    }

    ensureQuickOrderCatalogLoaded().done(function () {
      var loadedProduct = findCatalogProduct(value, categoryHint || "");
      if (loadedProduct) {
        goToProductPage(loadedProduct, categoryHint || "");
        return;
      }
      var fallbackCategory = findCategoryByTerm(categoryHint || value);
      if (fallbackCategory) {
        goToCategoryPage(fallbackCategory);
        return;
      }
      closeSearchDropdown();
    });
  }

  function ensureAccountSignoutInMyAccount() {
    if (!$accountDropdown.length) return;

    if ($accountSignout.length) {
      $accountSignout.remove();
      $accountSignout = $();
    }

    var $yourAccountCol = $accountDropdown.find(".account-col").filter(function () {
      return $.trim($(this).find(".account-col-title").first().text()).toLowerCase() === "your account";
    }).first();
    if (!$yourAccountCol.length) {
      $yourAccountCol = $accountDropdown.find(".account-col").last();
    }
    if (!$yourAccountCol.length) return;

    var $existing = $("#accountSignoutLink");
    if (!$existing.length) {
      $existing = $("<a class='account-link account-only' data-auth-required='1' href='#' id='accountSignoutLink'>Sign out</a>");
      $yourAccountCol.append($existing);
    }
  }

  function setClearState() { $searchClear.toggleClass("visible", !!$searchInput.val().trim()); }
  function openSearchDropdown() { $searchWrap.addClass("search-open"); $searchDropdown.addClass("open"); }
  function closeSearchDropdown() { $searchWrap.removeClass("search-open"); $searchDropdown.removeClass("open"); }
  function closeAllDropdown() {
    $allDrawerOverlay.removeClass("open");
    $allToggle.removeClass("all-open").attr("aria-expanded", "false");
    $("body").removeClass("all-drawer-open");
    allMenuState.expandedParent = null;
  }

  function performSignOut() {
    isSignedIn = false;
    localStorage.setItem("bregSignedIn", "false");
    localStorage.removeItem("bregFirstName");
    localStorage.removeItem("bregAccountName");
    localStorage.removeItem("bregUserEmail");
    updateAccountStateUI();
    $accountDropdown.removeClass("open");
    closeAllDropdown();
  }

  function renderAllDrawerMenu() {
    var $content = $("#allDrawerContent");
    if (!$content.length) return;
    var html = "";

    allMenuSections.forEach(function (section) {
      html += "<section class='all-drawer-section'>";
      html += "<h4 class='all-drawer-section-title'>" + escapeHtml(section.title) + "</h4>";
      section.items.forEach(function (entry) {
        var hasChildren = Array.isArray(entry.children) && entry.children.length;
        var isExpanded = hasChildren && allMenuState.expandedParent === entry.label;
        var href = entry.href || "index.html";
        var classes = "all-drawer-link";
        if (entry.strong) classes += " strong";
        if (entry.muted) classes += " muted";
        if (entry.quick) classes += " quick-order";
        if (entry.auth) classes += " all-drawer-auth";
        if (hasChildren) classes += " all-drawer-parent";
        html += "<div class='all-drawer-item'>";
        html += "<div class='all-drawer-row'>";
        html += "<a class='" + classes + "' href='" + href + "'";
        if (hasChildren) html += " data-parent='" + escapeHtml(entry.label) + "'";
        html += ">" + escapeHtml(entry.label) + "</a>";
        if (hasChildren) html += "<span class='glyphicon glyphicon-chevron-" + (isExpanded ? "down" : "right") + " all-drawer-chevron'></span>";
        html += "</div>";
        if (isExpanded) {
          html += "<div class='all-drawer-subitems'>";
          entry.children.forEach(function (child) {
            var subHref = "product-list.html?category=" + encodeURIComponent(entry.label) + "&subcategory=" + encodeURIComponent(child);
            html += "<div class='all-drawer-subitem'><a class='all-drawer-subitem-link' href='" + subHref + "'>" + escapeHtml(child) + "</a></div>";
          });
          html += "</div>";
        }
        html += "</div>";
      });
      html += "</section>";
    });
    $content.html(html);
  }

  function renderSearchDropdown() {
    var q = $.trim($searchInput.val()).toLowerCase();
    var suggestionResults;
    var categoryResults;
    $searchSuggestionList.empty();
    $searchCategoryList.empty();

    if (q) {
      $searchSuggestionTitle.text("Search Suggestions");
      suggestionResults = searchSuggestions.filter(function (item) {
        return item.text.toLowerCase().indexOf(q) > -1 || item.category.toLowerCase().indexOf(q) > -1;
      }).slice(0, 6);
      if (!suggestionResults.length) {
        $searchSuggestionList.append("<div class='search-row'><div class='search-row-copy'><div class='search-row-title muted'>No suggestions found</div></div></div>");
      } else {
        suggestionResults.forEach(function (item) {
          $searchSuggestionList.append("<button type='button' class='search-row search-suggestion' data-category='" + escapeHtml(item.category) + "' data-value='" + escapeHtml(item.text) + "'><img src='" + item.image + "' alt='" + escapeHtml(item.text) + "'><div class='search-row-copy'><div class='search-row-title'>" + escapeHtml(item.text) + "</div><div class='muted'>in " + escapeHtml(item.category) + "</div></div></button>");
        });
      }
    } else {
      $searchSuggestionTitle.text("Recent Searches");
      recentSearches.forEach(function (term) {
        $searchSuggestionList.append("<button type='button' class='search-row search-term' data-value='" + escapeHtml(term) + "'><img src='" + imageForRecentTerm(term) + "' alt='" + escapeHtml(term) + "'><div class='search-row-copy'><div class='search-row-title'>" + escapeHtml(term) + "</div></div></button>");
      });
    }

    var recentCategories = loadRecentCategories();
    categoryResults = recentCategories.filter(function (name) { return !q || name.toLowerCase().indexOf(q) > -1; });
    $searchDropdown.find(".search-group-title").eq(1).text("Recent Categories");
    if (!categoryResults.length) {
      $searchCategoryList.append("<div class='search-row'><div class='search-row-copy'><div class='search-row-title muted'>No recent categories yet</div></div></div>");
    } else {
      categoryResults.forEach(function (name) {
        $searchCategoryList.append("<button type='button' class='search-row search-category' data-category='" + escapeHtml(name) + "'><img src='" + (categoryImage[name] || categoryImage["Cold Therapy and DVT"]) + "' alt='" + escapeHtml(name) + "'><div class='search-row-copy'><div class='search-row-title'>" + escapeHtml(name) + "</div></div></button>");
      });
    }

    renderSearchPreview(categoryResults[0] || "Cold Therapy and DVT");
  }

  function updateAccountStateUI() {
    var firstName = localStorage.getItem("bregFirstName") || "Medical";
    var displayName = localStorage.getItem("bregAccountName") || "Medical Clinic Inc.";
    var email = localStorage.getItem("bregUserEmail") || "test@breg.com";
    var nameLine = (firstName && displayName) ? (firstName + " \u2013 " + displayName) : (firstName || displayName || "");
    var drawerTitle = isSignedIn ? ("Hello, " + nameLine) : "Hello, sign in";
    $("#allDrawerTitle").text(drawerTitle);
    $("#allDrawerTitle").toggleClass("is-link", !isSignedIn);
    if (isSignedIn) {
      $accountGreeting.text("Hello " + nameLine);
      $accountName.text(displayName);
      $accountEmail.text(email);
      $("#accountSignoutLink").text("Sign out");
      $accountOnlyLinks.removeClass("disabled");
    } else {
      $accountGreeting.text("Hello, sign in");
      $accountName.text("Guest User");
      $accountEmail.text("Sign in for full account access");
      $("#accountSignoutLink").text("Sign in");
      $accountOnlyLinks.addClass("disabled");
    }
  }

  function initAllDropdown() {
    if (!$subNav.length || !$allToggle.length) return;
    function syncAllToggleLabel() {
      if (!$allToggle.length) return;
      if (window.matchMedia("(max-width: 991px)").matches) {
        var iconHtml = $allToggle.find(".glyphicon").first().prop("outerHTML") || "";
        $allToggle.html((iconHtml ? iconHtml + " " : "") + "Menu");
      } else if (allToggleOriginalHtml) {
        $allToggle.html(allToggleOriginalHtml);
      }
    }
    syncAllToggleLabel();
    $(window).on("resize", syncAllToggleLabel);
    $allToggle.attr("href", "#").attr("aria-haspopup", "true").attr("aria-expanded", "false");
    $allDrawerOverlay = $(
      "<div class='all-drawer-overlay' id='allDropdown'>" +
        "<aside class='all-drawer'>" +
          "<div class='all-drawer-head'>" +
            "<span class='all-drawer-user-icon glyphicon glyphicon-user'></span>" +
            "<div class='all-drawer-title' id='allDrawerTitle'>Hello, sign in</div>" +
            "<button type='button' class='all-drawer-close' id='allDrawerClose' aria-label='Close menu'>&times;</button>" +
          "</div>" +
          "<div class='all-drawer-body' id='allDrawerContent'></div>" +
        "</aside>" +
      "</div>"
    );
    $("body").append($allDrawerOverlay);
    $allToggle.on("click", function (event) {
      event.preventDefault();
      var willOpen = !$allDrawerOverlay.hasClass("open");
      closeAllDropdown();
      if (willOpen) {
        renderAllDrawerMenu();
        $allDrawerOverlay.addClass("open");
        $("body").addClass("all-drawer-open");
        $allToggle.addClass("all-open").attr("aria-expanded", "true");
      }
    });
    $allDrawerOverlay.on("click", function (event) {
      if ($(event.target).is(".all-drawer-overlay") || $(event.target).is("#allDrawerClose")) closeAllDropdown();
    });
    $allDrawerOverlay.on("click", ".all-drawer-auth", function (event) {
      if (isSignedIn) return;
      event.preventDefault();
      var target = $(this).attr("href") || "login.html";
      window.location.href = "login.html?redirect=" + encodeURIComponent(target);
    });
    $allDrawerOverlay.on("click", "#allDrawerTitle", function () {
      if (!isSignedIn) window.location.href = "login.html";
    });
    $allDrawerOverlay.on("click", ".all-drawer-parent", function (event) {
      event.preventDefault();
      var parentLabel = $(this).data("parent");
      allMenuState.expandedParent = allMenuState.expandedParent === parentLabel ? null : parentLabel;
      renderAllDrawerMenu();
    });
  }

  $("#searchForm").on("submit", function (event) {
    var term = $.trim($searchInput.val());
    event.preventDefault();
    if (!term) { closeSearchDropdown(); return; }
    recentSearches = [term].concat(recentSearches.filter(function (item) { return item !== term; })).slice(0, 6);
    navigateSearchSelection(term, "");
  });

  $searchInput.on("focus input", function () {
    setClearState();
    renderSearchDropdown();
    openSearchDropdown();
  });

  $searchClear.on("click", function (event) {
    event.preventDefault();
    $searchInput.val("").focus();
    setClearState();
    renderSearchDropdown();
  });

  $searchWrap.on("mouseenter", ".search-category", function () { renderSearchPreview($(this).data("category")); });
  $searchWrap.on("mouseenter", ".search-suggestion", function () { renderSearchPreview($(this).data("category")); });
  $searchWrap.on("click", ".search-term", function () {
    var value = $(this).data("value");
    if (!value) return;
    $searchInput.val(value);
    setClearState();
    recentSearches = [value].concat(recentSearches.filter(function (item) { return item !== value; })).slice(0, 6);
    navigateSearchSelection(value, "");
  });
  $searchWrap.on("click", ".search-suggestion", function () {
    var value = String($(this).data("value") || "").trim();
    var category = String($(this).data("category") || "").trim();
    if (!value) return;
    $searchInput.val(value);
    setClearState();
    recentSearches = [value].concat(recentSearches.filter(function (item) { return item !== value; })).slice(0, 6);
    navigateSearchSelection(value, category);
  });
  $searchWrap.on("click", ".search-category", function () {
    var category = String($(this).data("category") || "").trim();
    if (!category) return;
    $searchInput.val(category);
    setClearState();
    goToCategoryPage(category);
  });
  $searchWrap.on("click", ".js-search-preview-product", function () {
    var name = String($(this).data("name") || "").trim();
    var category = String($(this).data("category") || "").trim();
    if (!name) return;
    ensureQuickOrderCatalogLoaded().done(function () {
      var product = findCatalogProduct(name, category) || findCatalogProduct(name, "");
      if (product) {
        goToProductPage(product, category);
        return;
      }
      if (category) goToCategoryPage(category);
    });
  });

  $(document).on("mousedown", function (event) {
    if (!$(event.target).closest(".search-wrap").length) closeSearchDropdown();
    if (!$(event.target).closest(".lang-wrap").length) $countryDropdown.removeClass("open");
    if (!$(event.target).closest(".account-wrap").length) $accountDropdown.removeClass("open");
  });
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") closeAllDropdown();
  });

  $langToggle.on("click", function (event) { event.preventDefault(); $countryDropdown.toggleClass("open"); });
  $(".js-lang-option").on("click", function () { $langCodeLabel.text($(this).data("lang") || "EN"); $countryDropdown.removeClass("open"); });
  $(".js-country-option").on("click", function () {
    var country = $(this).data("country");
    var market = $(this).data("market");
    if (country) $countryLabel.text(country);
    if (market) $marketLabel.text(market);
    $countryDropdown.removeClass("open");
  });

  $accountToggle.on("click", function (event) {
    event.preventDefault();
    if (!isSignedIn) {
      window.location.href = "login.html";
      return;
    }
    $accountDropdown.toggleClass("open");
  });
  $accountOnlyLinks.on("click", function (event) {
    if (isSignedIn) return;
    event.preventDefault();
    var target = $(this).attr("href") || "account.html";
    window.location.href = "login.html?redirect=" + encodeURIComponent(target);
  });
  $accountSectionTitle.on("click", function () {
    var title = $.trim($(this).text()).toLowerCase();
    if (title !== "your account") return;
    if (isSignedIn) {
      window.location.href = "your-account.html";
      return;
    }
    window.location.href = "login.html?redirect=" + encodeURIComponent("your-account.html");
  }).css("cursor", "pointer");
  $(document).on("click", "#accountSignout, #accountSignoutLink", function (event) {
    event.preventDefault();
    if (isSignedIn) {
      performSignOut();
    } else {
      window.location.href = "login.html";
    }
  });
  $returnsOrdersLink.on("click", function (event) {
    if (isSignedIn) return;
    event.preventDefault();
    var target = $(this).attr("href") || "order-history.html";
    window.location.href = "login.html?redirect=" + encodeURIComponent(target);
  });
  $cartLink.on("click", function (event) {
    if (isSignedIn) return;
    event.preventDefault();
    var target = $(this).attr("href") || "index.html";
    window.location.href = "login.html?redirect=" + encodeURIComponent(target);
  });
  $(document).on("click", "a.js-quick-order-link, a.quick-order", function (event) {
    if ($(this).closest(".sub-nav-inner").length) return;
    event.preventDefault();
    if ($(this).closest("#allDropdown").length) closeAllDropdown();
    openQuickOrderModal();
  });
  $(".sub-nav-inner").on("click", ".sub-nav-link", function (event) {
    if ($allToggle.length && $(this).is($allToggle)) {
      event.preventDefault();
      return;
    }
    var label = $.trim($(this).text()).replace(/\s+/g, " ");
    if (!label || label === "All") return;
    if (label === "Quick Order") {
      event.preventDefault();
      openQuickOrderModal();
      return;
    }
    event.preventDefault();
    trackRecentCategory(label);
    window.location.href = "product-list.html?category=" + encodeURIComponent(label);
  });

  (function seedRecentCategoryFromPage() {
    var params = new URLSearchParams(window.location.search || "");
    var urlCategory = params.get("category");
    if (urlCategory) trackRecentCategory(urlCategory);
  })();

  initAllDropdown();
  updateAccountStateUI();
  ensureAccountSignoutInMyAccount();
  syncCartCountBadge();

  window.BregCart = window.BregCart || {};
  window.BregCart.storageKey = CART_STORAGE_KEY;
  window.BregCart.read = readCartLines;
  window.BregCart.addLine = function (line) { return addLinesToCart([line]); };
  window.BregCart.addLines = addLinesToCart;
  window.BregCart.showAddedModal = openSharedCartAddedModal;
  window.BregCart.parsePrice = toPriceNumber;
  window.BregCart.syncBadge = syncCartCountBadge;

  window.BregQuickOrder = window.BregQuickOrder || {};
  window.BregQuickOrder.defaultRows = QUICK_ORDER_DEFAULT_ROWS;
  window.BregQuickOrder.draftStorageKey = QUICK_ORDER_DRAFT_STORAGE_KEY;
  window.BregQuickOrder.missingImage = QUICK_ORDER_MISSING_IMAGE;
  window.BregQuickOrder.ensureCatalogLoaded = ensureQuickOrderCatalogLoaded;
  window.BregQuickOrder.searchCatalog = searchQuickOrderCatalog;
  window.BregQuickOrder.catalogBySku = function (sku) { return quickOrderCatalogBySku[quickOrderSkuKey(sku)] || null; };
  window.BregQuickOrder.skuKey = quickOrderSkuKey;
  window.BregQuickOrder.readRows = readQuickOrderRows;
  window.BregQuickOrder.saveDraft = saveQuickOrderDraft;

  var FAVORITES_LISTS_STORAGE_KEY = "breg_saved_lists_v1";
  var FAVORITES_ITEMS_STORAGE_KEY = "breg_saved_list_items_v1";
  var FAVORITES_SHOPPING_LIST = "Shopping List";

  function readFavoriteLists() {
    var state = {};
    try {
      var parsed = JSON.parse(localStorage.getItem(FAVORITES_LISTS_STORAGE_KEY) || "{}");
      if (!parsed || typeof parsed !== "object") return state;
      Object.keys(parsed).forEach(function (listName) {
        var entries = parsed[listName];
        if (!Array.isArray(entries)) return;
        state[listName] = entries.map(function (entry) {
          return String(entry || "").trim();
        }).filter(Boolean);
      });
    } catch (e) {}
    return state;
  }

  function saveFavoriteLists(state) {
    try { localStorage.setItem(FAVORITES_LISTS_STORAGE_KEY, JSON.stringify(state || {})); } catch (e) {}
  }

  function readFavoriteItemMeta() {
    try {
      var parsed = JSON.parse(localStorage.getItem(FAVORITES_ITEMS_STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveFavoriteItemMeta(state) {
    try { localStorage.setItem(FAVORITES_ITEMS_STORAGE_KEY, JSON.stringify(state || {})); } catch (e) {}
  }

  function normalizeFavoriteMeta(item) {
    var sku = String(item && (item.sku || item.id) ? (item.sku || item.id) : "").trim();
    if (!sku) return null;
    return {
      sku: sku,
      name: String(item && item.name ? item.name : sku),
      image: String(item && item.image ? item.image : ""),
      category: String(item && item.category ? item.category : ""),
      price: toPriceNumber(item && item.price)
    };
  }

  function ensureFavoriteList(state, listName) {
    var name = String(listName || "").trim() || FAVORITES_SHOPPING_LIST;
    if (!Array.isArray(state[name])) state[name] = [];
    return name;
  }

  function toggleFavoriteSku(listName, item) {
    var meta = normalizeFavoriteMeta(item);
    if (!meta) return false;
    var lists = readFavoriteLists();
    var items = readFavoriteItemMeta();
    var targetList = ensureFavoriteList(lists, listName);
    var list = lists[targetList];
    var idx = list.indexOf(meta.sku);
    var isSaved = idx > -1;
    if (isSaved) {
      list.splice(idx, 1);
    } else {
      list.push(meta.sku);
      items[meta.sku] = meta;
    }
    saveFavoriteLists(lists);
    saveFavoriteItemMeta(items);
    return !isSaved;
  }

  function favoriteListItems(listName) {
    var lists = readFavoriteLists();
    var items = readFavoriteItemMeta();
    var targetList = ensureFavoriteList(lists, listName);
    return (lists[targetList] || []).map(function (sku) {
      var meta = items[sku] || {};
      return {
        sku: sku,
        id: sku,
        name: String(meta.name || sku),
        image: String(meta.image || ""),
        category: String(meta.category || ""),
        price: toPriceNumber(meta.price)
      };
    });
  }

  window.BregFavorites = window.BregFavorites || {};
  window.BregFavorites.shoppingListName = FAVORITES_SHOPPING_LIST;
  window.BregFavorites.readLists = readFavoriteLists;
  window.BregFavorites.readItems = readFavoriteItemMeta;
  window.BregFavorites.toggleShoppingListItem = function (item) {
    return toggleFavoriteSku(FAVORITES_SHOPPING_LIST, item);
  };
  window.BregFavorites.isInShoppingList = function (sku) {
    var lists = readFavoriteLists();
    var list = lists[FAVORITES_SHOPPING_LIST] || [];
    return list.indexOf(String(sku || "").trim()) > -1;
  };
  window.BregFavorites.getShoppingListItems = function () {
    return favoriteListItems(FAVORITES_SHOPPING_LIST);
  };

  window.addEventListener("storage", function (event) {
    if (!event || event.key === CART_STORAGE_KEY || event.key === null) {
      syncCartCountBadge();
    }
  });
})();

// Scroll-to-top button (site-wide, independent of header/search)
(function () {
  function getLoaderElement(target) {
    if (typeof target === "string") return document.querySelector(target);
    return target && target.nodeType === 1 ? target : null;
  }

  function createNoopController() {
    return { show: function () {}, hide: function () {} };
  }

  function createLoaderController(target, options) {
    var loader = getLoaderElement(target);
    if (!loader) return createNoopController();
    if (loader.__bregLoaderController) return loader.__bregLoaderController;

    var opts = options && typeof options === "object" ? options : {};
    var minVisibleMs = Number(opts.minVisibleMs);
    if (!isFinite(minVisibleMs) || minVisibleMs < 0) minVisibleMs = 350;
    var removeOnHideDefault = !!opts.removeOnHide;
    var shownAt = loader.classList.contains("hidden") ? 0 : Date.now();
    var hideTimer = null;
    var removeTimer = null;

    function clearTimers() {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (removeTimer) {
        clearTimeout(removeTimer);
        removeTimer = null;
      }
    }

    function show() {
      if (!loader || !loader.parentNode) return;
      clearTimers();
      shownAt = Date.now();
      loader.classList.remove("hidden");
    }

    function hide(config) {
      if (!loader || !loader.parentNode) return;
      var cfg = config && typeof config === "object" ? config : {};
      var removeOnHide = Object.prototype.hasOwnProperty.call(cfg, "remove")
        ? !!cfg.remove
        : removeOnHideDefault;
      var elapsed = shownAt ? Date.now() - shownAt : minVisibleMs;
      var wait = Math.max(0, minVisibleMs - elapsed);
      clearTimers();
      hideTimer = setTimeout(function () {
        if (!loader || !loader.parentNode) return;
        loader.classList.add("hidden");
        if (!removeOnHide) return;
        removeTimer = setTimeout(function () {
          if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        }, 320);
      }, wait);
    }

    loader.__bregLoaderController = { show: show, hide: hide };
    return loader.__bregLoaderController;
  }

  window.BregPageLoader = window.BregPageLoader || {};
  window.BregPageLoader.for = createLoaderController;
})();

(function () {
  function initScrollTop() {
    var btn = document.querySelector(".scroll-top-btn");
    var quickOrderBtn = document.querySelector(".scroll-quick-order-btn");
    var bgColorControl = document.querySelector(".floating-bg-color-control");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scroll-top-btn";
      btn.setAttribute("aria-label", "Scroll to top");
      btn.innerHTML = "<span class='glyphicon glyphicon-chevron-up'></span>";
      document.body.appendChild(btn);
    }
    if (!quickOrderBtn) {
      quickOrderBtn = document.createElement("a");
      quickOrderBtn.href = "#";
      quickOrderBtn.className = "scroll-quick-order-btn js-quick-order-link";
      quickOrderBtn.setAttribute("aria-label", "Open Quick Order");
      quickOrderBtn.textContent = "Quick Order";
      document.body.appendChild(quickOrderBtn);
    }
    if (!bgColorControl) {
      bgColorControl = document.createElement("div");
      bgColorControl.className = "floating-bg-color-control";
      bgColorControl.innerHTML =
        "<label class='floating-bg-color-label' for='floatingBgColorPicker' title='Page background color'>" +
          "<span class='glyphicon glyphicon-tint' aria-hidden='true'></span>" +
        "</label>" +
        "<input id='floatingBgColorPicker' class='floating-bg-color-input' type='color' aria-label='Pick background color'>" +
        "<button type='button' id='floatingBgColorReset' class='floating-bg-color-reset' aria-label='Reset background color'>Reset</button>";
      document.body.appendChild(bgColorControl);
    }
    var bgColorPicker = document.getElementById("floatingBgColorPicker");
    if (bgColorPicker) bgColorPicker.value = getStoredBackgroundColor();
    if (btn._bregScrollTopInited) return;
    btn._bregScrollTopInited = true;

    function updateVisibility() {
      var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (y > 240) {
        btn.classList.add("visible");
        quickOrderBtn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
        quickOrderBtn.classList.remove("visible");
      }
    }

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollTop);
  } else {
    initScrollTop();
  }
})();
