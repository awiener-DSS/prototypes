(function () {
  var SESSION_COOKIE = "bregAuthSession";
  var SESSION_STORAGE_KEY = "bregAuthSession";
  var AUTH_KEYS = [
    "bregSignedIn",
    "bregFirstName",
    "bregLastName",
    "bregUserName",
    "bregAccountName",
    "bregUserEmail",
    "bregUserPhone",
    "bregOrgAccountNumber"
  ];
  var isFileProtocol = String(window.location.protocol || "") === "file:";

  function hasSessionCookie() {
    return new RegExp("(?:^|; )" + SESSION_COOKIE + "=1(?:;|$)").test(document.cookie);
  }

  function setSessionCookie() {
    document.cookie = SESSION_COOKIE + "=1; path=/; SameSite=Lax";
  }

  function clearSessionCookie() {
    document.cookie = SESSION_COOKIE + "=; path=/; Max-Age=0; SameSite=Lax";
  }

  function hasSessionMarker() {
    if (isFileProtocol) {
      try {
        return sessionStorage.getItem(SESSION_STORAGE_KEY) === "1";
      } catch (e) {
        return true;
      }
    }
    return hasSessionCookie();
  }

  function setSessionMarker() {
    if (isFileProtocol) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "1");
      } catch (e) {}
      return;
    }
    setSessionCookie();
  }

  function clearSessionMarker() {
    if (isFileProtocol) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {}
      return;
    }
    clearSessionCookie();
  }

  function clearPersistedAuth() {
    try {
      localStorage.setItem("bregSignedIn", "false");
      AUTH_KEYS.forEach(function (key) {
        if (key === "bregSignedIn") return;
        localStorage.removeItem(key);
      });
    } catch (e) {}
    clearSessionMarker();
  }

  function isSignedIn() {
    try {
      if (localStorage.getItem("bregSignedIn") !== "true") return false;
      // file:// cannot use cookies; trust localStorage for this page origin.
      if (isFileProtocol) return true;
      return hasSessionMarker();
    } catch (e) {
      return false;
    }
  }

  function markSignedIn() {
    try {
      localStorage.setItem("bregSignedIn", "true");
    } catch (e) {}
    setSessionMarker();
  }

  function markSignedOut() {
    clearPersistedAuth();
  }

  // New browser session on http(s): prior localStorage login without a live session cookie.
  // Skip this reset on file:// — cookies are unavailable and would cause a login redirect loop.
  if (!isFileProtocol) {
    try {
      if (localStorage.getItem("bregSignedIn") === "true" && !hasSessionMarker()) {
        clearPersistedAuth();
      }
    } catch (e) {}
  }

  window.BregSessionAuth = {
    isSignedIn: isSignedIn,
    markSignedIn: markSignedIn,
    markSignedOut: markSignedOut
  };

  var page = String(window.location.pathname || "").split("/").pop() || "index.html";
  var publicPages = {
    "login.html": true
  };
  if (isSignedIn()) return;
  if (publicPages[page]) return;
  var redirectTarget = page + (window.location.search || "");
  window.__bregAuthRedirecting = true;
  window.location.replace("login.html?redirect=" + encodeURIComponent(redirectTarget));
})();
