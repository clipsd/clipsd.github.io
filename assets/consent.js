/* ClipSD site: consent banner and visitor counters (Google Analytics 4, Yandex Metrica).
   This file is on the site only when build.py has GA_ID or METRIKA_ID. The counters are NOT in the page: their scripts
   are created here, and only after the visitor accepted. Until then nothing is loaded and no cookie is set.
   Closing the banner (the cross, Escape) without a choice is a refusal. The choice is kept in localStorage under
   "clipsd-consent" as {v: version of the policy and the counters, d: date, ga: bool, ym: bool}; the banner asks again
   after 12 months or when the version changes. "Cookie settings" in the footer opens the banner again (the switches show
   the current choice). Withdrawing a counter deletes the cookies and local keys this site can reach and reloads the page.
   With two counters every one has its own switch (off by default). Yandex Metrica runs without Webvisor; Google signals
   and ad personalisation are off. No noscript pixels. */
(function () {
  "use strict";
  var KEY = "clipsd-consent";
  var YEAR = 365 * 24 * 3600 * 1000;
  var me = document.currentScript || document.querySelector("script[data-ga]");
  var GA = me ? me.getAttribute("data-ga") : "";
  var YM = me ? me.getAttribute("data-ym") : "";
  var VER = me ? me.getAttribute("data-ver") : "";
  var box = document.getElementById("consent");
  var loaded = { ga: false, ym: false };

  function read() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY));
      if (!o || o.v !== VER || !o.d || Date.now() - Date.parse(o.d) > YEAR) return null;
      return { ga: !!o.ga && !!GA, ym: !!o.ym && !!YM };
    } catch (e) { return null; }
  }
  function write(ga, ym) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ v: VER, d: new Date().toISOString(), ga: ga, ym: ym })); } catch (e) { /* no storage: lasts for this page */ }
  }
  function addScript(src) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  function loadGA() {
    if (loaded.ga || !GA) return;
    loaded.ga = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA, { allow_google_signals: false, allow_ad_personalization_signals: false });
    addScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA));
  }
  function loadYM() {
    if (loaded.ym || !YM) return;
    loaded.ym = true;
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = +new Date();
    addScript("https://mc.yandex.ru/metrika/tag.js");
    window.ym(Number(YM), "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
  }

  function wipe(pattern) {
    var host = location.hostname.split(".");
    var domains = [""];
    for (var i = 0; i < host.length - 1; i++) domains.push("; domain=." + host.slice(i).join("."));
    domains.push("; domain=" + location.hostname);
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!pattern.test(name)) return;
      domains.forEach(function (d) { document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d; });
    });
    [window.localStorage, window.sessionStorage].forEach(function (st) {
      try { Object.keys(st).forEach(function (k) { if (pattern.test(k) && k !== KEY) st.removeItem(k); }); } catch (e) { /* none */ }
    });
  }

  function show(on) {
    if (!box) return;
    var cur = read() || { ga: false, ym: false };
    ["ga", "ym"].forEach(function (k) {
      var o = box.querySelector('[data-consent-opt="' + k + '"]');
      if (o) o.checked = !!cur[k];
    });
    box.hidden = !on;
  }

  function apply(ga, ym) {
    var was = read() || { ga: false, ym: false };
    write(ga, ym);
    show(false);
    var withdrawn = (was.ga && !ga) || (was.ym && !ym) || (loaded.ga && !ga) || (loaded.ym && !ym);
    if (withdrawn) {
      if (!ga) wipe(/^(_ga|_gid|_gat)/);
      if (!ym) wipe(/^_ym/);
      location.reload();
      return;
    }
    if (ga) loadGA();
    if (ym) loadYM();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-consent],[data-consent-open]") : null;
    if (!t) return;
    if (t.hasAttribute("data-consent-open")) { show(true); var b = box && box.querySelector(".consent-btn"); if (b) b.focus(); return; }
    var kind = t.getAttribute("data-consent");
    if (kind === "grant") apply(!!GA, !!YM);
    else if (kind === "selected") {
      var g = box.querySelector('[data-consent-opt="ga"]'), y = box.querySelector('[data-consent-opt="ym"]');
      apply(!!(g && g.checked), !!(y && y.checked));
    } else if (kind === "close" && read()) show(false);   // a choice exists: closing only hides the banner
    else apply(false, false);   // "deny", the cross or Escape without a choice: refusal
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && box && !box.hidden) { if (read()) show(false); else apply(false, false); }
  });

  var saved = read();
  if (!saved) show(true);
  else { if (saved.ga) loadGA(); if (saved.ym) loadYM(); }
})();
