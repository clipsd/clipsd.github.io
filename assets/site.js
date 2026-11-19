/* ClipSD site: three frames on the first screen, system detection for the download button, the copy button
   and the language hint on the root page. No trackers, no cookies; the only thing stored is the chosen language (localStorage clipsd-lang); nothing loaded from other sites (the visitor counters live in consent.js and load only after consent).
   Everything important works without this file: the first frame is shown, the others open through anchors. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var T = {};
  var data = document.getElementById("i18n");
  if (data) { try { T = JSON.parse(data.textContent); } catch (e) { T = {}; } }

  // --- three frames on the first screen (tabs: arrows, Home, End) ------------------------------
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".modes [role=tab]"));
  var live = document.querySelector("[data-stage-live]");
  function pick(tab, focus, announce) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.classList.toggle("on", on);
    });
    if (announce && live) {
      var cap = document.querySelector("#" + tab.getAttribute("aria-controls") + " .stage-cap");
      live.textContent = cap ? cap.textContent : "";
    }
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function (e) { e.preventDefault(); pick(t, false, true); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, j = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i + n - 1) % n;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = n - 1;
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(t, false, true); return; }
      if (j >= 0) { e.preventDefault(); pick(tabs[j], true, true); }
    });
  });
  if (tabs.length) {
    var start = tabs[0];
    tabs.forEach(function (t) { if (location.hash && t.getAttribute("href") === location.hash) start = t; });
    pick(start, false, false);
  }

  // --- system detection --------------------------------------------------------------------------
  var ua = navigator.userAgent || "";
  var pl = ((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "") + " " + ua;
  var os = "other";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) os = "mobile";
  else if (/Win/i.test(pl)) os = "windows";
  else if (/Mac/i.test(pl)) os = "mac";
  else if (/Linux|X11|CrOS/i.test(pl)) os = "linux";
  var q = new URLSearchParams(location.search).get("os");
  if (q && /^(windows|linux|mac|mobile|other)$/.test(q)) os = q;
  document.documentElement.setAttribute("data-os", os);
  if (T.cta) {
    document.querySelectorAll("[data-dl-main]").forEach(function (a) {
      if (os === "windows" || os === "linux") {
        a.querySelector("[data-dl-label]").textContent = T.cta[os];
        a.setAttribute("href", (T.dl && T.dl[os]) || "#dl-" + os);
      }
    });
    document.querySelectorAll("[data-dl-note]").forEach(function (n) {
      n.textContent = T.note[os === "windows" || os === "linux" ? os : "other"];
    });
  }
  document.querySelectorAll("[data-os-card]").forEach(function (c) {
    if (c.getAttribute("data-os-card") === os) c.classList.add("is-mine");
  });
  if (T.os && T.os[os]) {
    document.querySelectorAll("[data-os-name]").forEach(function (e) { e.textContent = T.os[os]; });
  }

  // --- copy button for the Linux command ------------------------------------------------------------
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    if (!navigator.clipboard) return;
    b.hidden = false;
    b.addEventListener("click", function () {
      var text = document.getElementById(b.getAttribute("data-copy")).textContent;
      navigator.clipboard.writeText(text).then(function () {
        var old = b.textContent;
        b.textContent = T.copied || "OK";
        setTimeout(function () { b.textContent = old; }, 1600);
      }, function () {});
    });
  });

  // --- close the mobile menu after a jump ------------------------------------------------------------
  document.querySelectorAll("details.menu nav a").forEach(function (a) {
    a.addEventListener("click", function () { var d = a.closest("details"); if (d) d.open = false; });
  });

  // --- language switcher: opens by the button, Esc and a click outside close it, the choice is remembered ---------
  var sw = document.querySelector("[data-langsw]");
  function rememberLang(a) {
    var l = a.getAttribute("data-lang") || (a.getAttribute("hreflang") || "").split("-")[0];
    try { if (l) window.localStorage.setItem("clipsd-lang", l); } catch (e) { /* no storage: the choice is not kept */ }
  }
  if (sw) {
    var btn = sw.querySelector(".langsw-btn");
    var setOpen = function (on, focusBtn) {
      sw.classList.toggle("open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (!on && focusBtn) btn.focus();
    };
    btn.addEventListener("click", function () { setOpen(!sw.classList.contains("open"), false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sw.classList.contains("open")) { e.stopPropagation(); setOpen(false, true); }
    });
    document.addEventListener("click", function (e) { if (!sw.contains(e.target)) setOpen(false, false); });
    sw.addEventListener("focusout", function (e) { if (e.relatedTarget && !sw.contains(e.relatedTarget)) setOpen(false, false); });
  }
  document.querySelectorAll(".langsw-panel a, footer .langs a").forEach(function (a) {
    a.addEventListener("click", function () { rememberLang(a); });
  });

  // --- root page: point at the visitor's language without redirecting ------------------------------
  var picker = document.querySelector("[data-picker]");
  if (picker) {
    var want = (navigator.languages || [navigator.language || ""]).map(function (l) {
      return String(l).toLowerCase().split("-")[0];
    });
    for (var i = 0; i < want.length; i++) {
      var hit = picker.querySelector('a[hreflang^="' + want[i] + '"]');
      if (hit) { hit.classList.add("suggest"); hit.setAttribute("aria-describedby", "suggest-note"); break; }
    }
  }
})();
