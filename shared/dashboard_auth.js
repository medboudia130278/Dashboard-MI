(function () {
  "use strict";

  var AUTH_KEY = "dashboard-mi-authenticated";
  var AUTH_VALUE = "yes";
  var PASSWORD = "mohamed";

  function storageAvailable() {
    try {
      window.sessionStorage.setItem("__dashboard_auth_test__", "1");
      window.sessionStorage.removeItem("__dashboard_auth_test__");
      return true;
    } catch (err) {
      return false;
    }
  }

  function getNextUrl(value) {
    var fallback = "index_Vref.html";
    var next = String(value || "").trim();
    if (!next) return fallback;
    try {
      next = decodeURIComponent(next);
    } catch (err) {
      return fallback;
    }
    if (/^(https?:)?\/\//i.test(next)) return fallback;
    if (/^javascript:/i.test(next)) return fallback;
    if (next.indexOf("index.html") !== -1) return fallback;
    return next;
  }

  function isAuthenticated() {
    if (!storageAvailable()) return false;
    return window.sessionStorage.getItem(AUTH_KEY) === AUTH_VALUE;
  }

  function authenticate(password) {
    if (String(password || "") !== PASSWORD || !storageAvailable()) return false;
    window.sessionStorage.setItem(AUTH_KEY, AUTH_VALUE);
    return true;
  }

  function logout() {
    if (storageAvailable()) window.sessionStorage.removeItem(AUTH_KEY);
    window.location.href = "index.html";
  }

  function requireAuth() {
    if (isAuthenticated()) return;
    var current = window.location.pathname.split("/").pop() || "index_Vref.html";
    var search = window.location.search || "";
    var next = current + search;
    window.location.replace("index.html?next=" + encodeURIComponent(next));
  }

  window.DashboardAuth = {
    authenticate: authenticate,
    getNextUrl: getNextUrl,
    isAuthenticated: isAuthenticated,
    logout: logout,
    requireAuth: requireAuth,
  };

  var script = document.currentScript;
  if (script && script.getAttribute("data-require-auth") === "true") {
    requireAuth();
  }
})();
