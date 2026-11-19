/* ClipSD site: three frames on the first screen, system detection for the download button, the copy button
   and the language hint on the root page. No trackers, no cookies; the only thing stored is the chosen language (localStorage clipsd-lang); nothing loaded from other sites except one GET of the ratings summary from the receiver (RATINGS_URL in build.py; the visitor counters live in consent.js and load only after consent).
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
  var uad = navigator.userAgentData;
  var pl = ((uad && uad.platform) || navigator.platform || "") + " " + ua;
  var mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var touch = (navigator.maxTouchPoints || 0) > 1;
  var coarse = mm("(pointer:coarse)");
  var noHover = mm("(hover:none) and (pointer:coarse)");
  var narrow = !!(window.screen && Math.min(window.screen.width || 9999, window.screen.height || 9999) < 1024);
  // phone or tablet first (also when it pretends to be a Mac or Linux PC: iPadOS, Android "desktop site", Samsung Internet),
  // only then a computer
  var phone = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (uad && uad.mobile === true) ||
    (/Mac|Linux|X11|CrOS/i.test(pl) && ((touch && (coarse || narrow)) || noHover)) ||
    (/Linux/i.test(pl) && /arm|aarch64/i.test(navigator.platform || ""));   // no ARM build: never offer the x86-64 file
  var os = "other";
  if (phone) os = "mobile";
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
        a.setAttribute("data-os", os);   // the Tux next to the Linux button (CSS)
        a.setAttribute("href", (T.dl && T.dl[os]) || "#dl-" + os);
      }
    });
    document.querySelectorAll("[data-dl-note]").forEach(function (n) {
      n.textContent = T.note[os === "windows" || os === "linux" ? os : (os === "mobile" && T.note.mobile ? "mobile" : "other")];
    });
  }
  // sticky "Download" in the header: shown when the first-screen button has scrolled away; it leads to the download section (#download, smooth scroll under the sticky header)
  document.querySelectorAll("[data-dl-sticky]").forEach(function (a) {
    var hero = document.querySelector(".hero [data-dl-main]");
    var top = a.closest("header");
    if (!hero || !top || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (es) {
      var e = es[0];
      top.classList.toggle("dl-on", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(hero);
  });

  // the other system next to the main button: one link when the system is known, both links otherwise
  document.querySelectorAll("[data-dl-other]").forEach(function (box) {
    var known = os === "windows" || os === "linux";
    box.querySelectorAll("[data-os-link]").forEach(function (a) {
      a.hidden = known && a.getAttribute("data-os-link") === os;
    });
    box.querySelectorAll("[data-os-sep]").forEach(function (s) { s.hidden = known; });
    var lab = box.querySelector("[data-dl-other-label]");
    if (lab && T.other) lab.textContent = known ? T.other.one : T.other.both;
  });
  document.querySelectorAll("[data-os-card]").forEach(function (c) {
    if (c.getAttribute("data-os-card") === os) c.classList.add("is-mine");
  });
  if (T.os && T.os[os]) {
    document.querySelectorAll("[data-os-name]").forEach(function (e) { e.textContent = T.os[os]; });
  }

  // --- selection frame on the first screen: the size label shows the real size of the frame, also while it is drawn and
  // while the cursor stretches it by the corner (variant b) ------------------------------------------------------
  document.querySelectorAll("[data-snap]").forEach(function (box) {
    var lab = box.querySelector("[data-snap-size]"), fmt = box.getAttribute("data-snap-fmt") || "";
    var grow = box.querySelector("[data-snap-grow]");
    if (!lab || !fmt) return;
    var put = function (k) {
      var r = (grow || box).getBoundingClientRect();
      lab.textContent = fmt.replace("{w}", Math.round(r.width * k)).replace("{h}", Math.round(r.height * k));
    };
    put(1);
    var head = document.querySelector("header.top");
    // The frame and its label must stay below the sticky header: room is measured in page coordinates, with the real height
    // of the headline (fonts, language, window width); the label goes under the frame when there is no room above it.
    var room = { above: 0, frame: 0 };
    var place = function () {
      var hh = head ? head.offsetHeight : 68;
      box.style.marginTop = "";
      var topDoc = box.getBoundingClientRect().top + window.pageYOffset;
      var labelH = lab.offsetHeight + 5;
      var need = hh + 8;
      var add = Math.max(0, need - topDoc);
      if (add > 0) { box.style.marginTop = (parseFloat(window.getComputedStyle(box).marginTop) + add) + "px"; topDoc += add; }
      var above = topDoc - hh - 8 - labelH >= 0;
      box.setAttribute("data-label", above ? "above" : "under");
      room.above = above ? topDoc - hh - 8 - labelH : 0;   // how far the top edge may still go up with the label above it
      room.frame = topDoc - hh - 8;                        // how far the top edge may go up at all
      put(1);
    };
    place();
    window.addEventListener("resize", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (box.classList.contains("snap-b") && !calm) {
      var t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var el = t - t0, k = Math.min(1, el / 800);
        put(1 - Math.pow(1 - k, 3));
        if (el < 2700) window.requestAnimationFrame(step); else put(1);
      };
      window.requestAnimationFrame(step);
      if (grow && box.animate && "IntersectionObserver" in window) startRepeats(box, grow, put, room, place);
    }
  });

  // After the first scenario the cursor takes the next corner every ~8 s (lower right, lower left, upper left, upper right),
  // the frame is pulled a little and returns, the size label follows. Only while the first screen is visible and the tab is
  // active; a hover or focus on the headline pauses it; nothing is repeated with "reduce motion".
  function startRepeats(box, grow, put, room, place) {
    var cursor = grow.querySelector(".snap-cursor");
    if (!cursor) return;
    var corners = ["br", "bl", "tl", "tr"], next = 0;
    var visible = true, hover = false, focus = false, running = [], pulling = false;
    var phone = function () { return window.matchMedia("(max-width: 640px)").matches; };
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(box);
    var paused = function () { return document.hidden || !visible || hover || focus; };
    var setPause = function () { running.forEach(function (a) { try { if (paused()) a.pause(); else a.play(); } catch (e) { /* done */ } }); };
    document.addEventListener("visibilitychange", setPause);
    box.addEventListener("mouseenter", function () { hover = true; setPause(); });
    box.addEventListener("mouseleave", function () { hover = false; setPause(); });
    box.addEventListener("focusin", function () { focus = true; setPause(); });
    box.addEventListener("focusout", function () { focus = false; setPause(); });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; setPause(); }).observe(box);

    function pull(corner) {
      var left = corner === "bl" || corner === "tl", top = corner === "tl" || corner === "tr";
      var sx = left ? -1 : 1, sy = top ? -1 : 1;
      // how far the corner goes out (negative: inward); on a phone the left corners and the top go inward or down,
      // so the frame never leaves the screen
      var ox = phone() ? (left ? -3 : 4) : 22, oy = phone() ? (top ? -3 : 18) : 16;
      place();
      // the top edge goes up only while it stays below the header (and, with the label above, below the label room)
      var upRoom = box.getAttribute("data-label") === "above" ? room.above : room.frame;
      if (top && oy > 0 && upRoom < oy + 2) oy = -Math.min(6, Math.abs(oy));   // no room above: pull inward instead
      var from = {}, to = {};
      from[left ? "left" : "right"] = "0px"; to[left ? "left" : "right"] = -ox + "px";
      from[top ? "top" : "bottom"] = "0px"; to[top ? "top" : "bottom"] = -oy + "px";
      var kfs = [from, to, from];
      grow.setAttribute("data-corner", corner);
      var off = "translate(" + sx * 46 + "px," + sy * 34 + "px)";
      var a1 = grow.animate(kfs.map(function (f, i) { return Object.assign({ offset: [0, 0.45, 1][i] }, f); }),
        { duration: 1100, delay: 450, easing: "cubic-bezier(.45,0,.35,1)", fill: "none" });
      var a2 = cursor.animate([
        { opacity: 0, transform: off, offset: 0 }, { opacity: 1, transform: "none", offset: 0.25 },
        { opacity: 1, transform: "none", offset: 0.85 }, { opacity: 0, transform: "translate(" + sx * 8 + "px," + sy * 6 + "px)", offset: 1 }],
        { duration: 1700, fill: "none" });
      running = [a1, a2];
      a1.finished.then(function () { running = running.concat(shoot()); setPause(); }, function () { /* cancelled */ });
      pulling = true;
      setPause();
      var loop = function () { put(1); if (pulling) window.requestAnimationFrame(loop); };
      window.requestAnimationFrame(loop);
      a2.finished.then(function () { pulling = false; running = []; put(1); }, function () { pulling = false; });
    }
    // --- screenshot inside the frame (data-shot on the box): a flash, then a thumbnail flies into the green button -------
    // Only opacity and transform are animated, nothing leaves the frame upwards (the thumbnail goes down to the green button).
    var kind = box.hasAttribute("data-shot"), shotEl = grow.querySelector(".snap-shot");
    function shoot() {
      if (!kind || !shotEl) return [];
      var q = function (c) { return shotEl.querySelector(c); };
      var out = [], at = function (el, kf, o) { var a = el.animate(kf, Object.assign({ fill: "none" }, o)); out.push(a); return a; };
      var wash = q(".sh-wash");
      if (kind) {
        var h1 = box.querySelector("h1"), gr = grow.getBoundingClientRect(), hr = h1 && h1.getBoundingClientRect();
        var pan = box.querySelector(".snap-panel"), pr = pan && pan.getBoundingClientRect();
        at(wash, [{ opacity: 0 }, { opacity: 0.7, offset: 0.2 }, { opacity: 0 }], { duration: 420, easing: "ease-out" });
        if (h1 && gr.width > 40 && gr.height > 40) {
          // the thumbnail is a small copy of what is inside the frame: it appears at once, then flies into the green button
          var th = document.createElement("span"), inner = document.createElement("div"), copy = h1.cloneNode(true);
          th.className = "snap-thumb"; th.setAttribute("aria-hidden", "true");
          copy.removeAttribute("id");
          inner.style.cssText = "left:" + (hr.left - gr.left - 3) + "px;top:" + (hr.top - gr.top - 3) + "px;width:" + hr.width + "px";
          inner.appendChild(copy); th.appendChild(inner); grow.appendChild(th);
          var tx = 0, ty = gr.height / 2 + 40;
          if (pr) { tx = pr.left + pr.width / 2 - (gr.left + gr.width / 2); ty = pr.top + pr.height / 2 - (gr.top + gr.height / 2); }
          var sc = Math.max(0.08, Math.min(0.2, 90 / gr.width));
          var fly = at(th, [
            { opacity: 0, transform: "scale(1)", offset: 0 }, { opacity: 1, transform: "scale(.985)", offset: 0.12 },
            { opacity: 1, transform: "scale(.985)", offset: 0.38 },
            { opacity: 1, transform: "translate(" + tx + "px," + ty + "px) scale(" + sc + ")", offset: 0.92 },
            { opacity: 0, transform: "translate(" + tx + "px," + ty + "px) scale(" + sc * 0.8 + ")", offset: 1 }],
            { duration: 1300, easing: "cubic-bezier(.5,0,.3,1)", delay: 120 });
          fly.finished.then(function () { th.remove(); }, function () { th.remove(); });
          if (pan) at(pan, [{ transform: "none" }, { transform: "scale(1.08)", offset: 0.5 }, { transform: "none" }], { duration: 380, delay: 120 + 1300 * 0.9 });
        }
      }
      return out;
    }
    window.addEventListener("clipsd-snap-pull", function (e) { if (!pulling) pull(e.detail); });   // used by the layout tests
    function cycle() {
      if (paused() || pulling) { window.setTimeout(cycle, 800); return; }
      pull(corners[next]);
      next = (next + 1) % corners.length;
      window.setTimeout(cycle, 8000);
    }
    if (kind) window.setTimeout(function () { if (!paused()) running = running.concat(shoot()); }, 2500);   // the first scenario: right after the frame returns
    window.setTimeout(cycle, kind ? 11500 : 10500);   // the first scenario lasts about 2.9 s, with the screenshot about 4.2 s
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

  // --- scroll-spy: the menu item of the section that crosses a line at 35% of the screen; nothing on the first screen ---
  (function () {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#'], .menu nav a[href^='#']"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var targets = [];
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t && targets.indexOf(t) < 0) targets.push(t);
    });
    targets.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });   // document order
    var inband = {}, current = null;
    var show = function (id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { inband[e.target.id] = e.isIntersecting; });
      var hit = null;
      targets.forEach(function (t) { if (inband[t.id]) hit = t.id; });
      if (hit) show(hit);
      else if (targets[0].getBoundingClientRect().top > window.innerHeight * 0.35) show(null);   // above the first section: nothing
    }, { rootMargin: "-35% 0px -64% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  })();

  // --- the header never gets wider than the screen: when the full menu does not fit (long words, a narrow window), the
  // menu button takes over; measured with the sticky download button shown, so nothing jumps while scrolling -------
  (function () {
    var top = document.querySelector("header.top"), wrap = top && top.querySelector(".wrap");
    if (!top || !wrap) return;
    var fits = function () {
      var cs = window.getComputedStyle(wrap), limit = wrap.getBoundingClientRect().right - parseFloat(cs.paddingRight);
      var kids = Array.prototype.filter.call(wrap.children, function (e) { return e.offsetWidth > 0; });
      var last = kids.length ? kids[kids.length - 1].getBoundingClientRect().right : 0;
      return last <= limit + 0.5 && document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    };
    var fit = function () {
      var hadDl = top.classList.contains("dl-on");
      top.classList.add("dl-on");
      var nav = top.querySelector(".nav");
      top.classList.remove("nav-off", "t1", "t2");
      if (nav && window.getComputedStyle(nav).display !== "none") {
        // steps: full, tighter (no language name, short download button), icon-only download button, then the menu button
        var ok = fits();
        if (!ok) { top.classList.add("t1"); ok = fits(); }
        if (!ok) { top.classList.remove("t1"); top.classList.add("t2"); ok = fits(); }
        if (!ok) { top.classList.remove("t2"); top.classList.add("nav-off"); }
      }
      if (!hadDl) top.classList.remove("dl-on");
    };
    fit();
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

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
  // --- ratings: refresh the numbers and the reviews from the receiver (short answer, textContent only) ----------
  // The page already holds the values from the build; any failure keeps them as they are.
  var R = T.rating, box = document.querySelector("[data-rating]");
  function intIn(x, lo, hi) { return typeof x === "number" && isFinite(x) && Math.floor(x) === x && x >= lo && x <= hi; }
  function okSummary(d) {
    if (!d || typeof d !== "object" || !intIn(d.count, 0, 1e9) || !d.by_stars) return false;
    for (var i = 1; i <= 5; i++) if (!intIn(d.by_stars[String(i)], 0, 1e9)) return false;
    if (d.count > 0 && !(typeof d.average === "number" && d.average >= 1 && d.average <= 5)) return false;
    return true;
  }
  function okReview(r) {
    return r && typeof r === "object" && intIn(r.stars, 1, 5) && typeof r.text === "string" && r.text.length > 0 &&
      r.text.length <= 2000 && typeof r.lang === "string" && /^[a-z]{2,3}$/.test(r.lang) && typeof r.version === "string" &&
      /^[0-9A-Za-z.+_-]{0,24}$/.test(r.version) && typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date);
  }
  function rq(name) { return box.querySelector('[data-r="' + name + '"]'); }
  function rfill(d) {
    var h = Math.round(d.average * 100), t = Math.floor((h + 5) / 10);
    rq("avg").textContent = Math.floor(t / 10) + R.sep + (t % 10);
    var st = rq("stars");
    st.className = "stars s" + Math.floor((h + 25) / 50);
    st.setAttribute("aria-label", R.stars.replace("{v}", rq("avg").textContent));
    rq("count").textContent = String(d.count);
    for (var i = 1; i <= 5; i++) {
      rq("n" + i).textContent = String(d.by_stars[String(i)]);
      var p = rq("n" + i).parentNode.querySelector("progress");
      p.max = Math.max(d.count, 1); p.value = d.by_stars[String(i)];
    }
  }
  function readReviews() {
    var out = [];
    box.querySelectorAll(".rev").forEach(function (li) {
      out.push({ stars: +li.getAttribute("data-stars"), lang: li.getAttribute("data-lang"), date: li.getAttribute("data-date"),
        version: li.getAttribute("data-ver"), text: li.querySelector(".rev-text").textContent });
    });
    return out;
  }
  function rmk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function drawReviews(list, known) {
    // the same rule as in the build: reviews in the language of the page, else the others with the language marked
    var mine = list.filter(function (r) { return r.lang === R.lang; }), other = !mine.length;
    var show = (other ? list : mine).slice(0, R.max || 6), ul = rq("revs");
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    show.forEach(function (r) {
      var li = rmk("li", "rev"), s = rmk("span", "stars s" + r.stars * 2);
      li.setAttribute("data-lang", r.lang); li.setAttribute("data-stars", String(r.stars));
      li.setAttribute("data-date", r.date); li.setAttribute("data-ver", r.version);
      s.setAttribute("role", "img"); s.setAttribute("aria-label", R.stars.replace("{v}", String(r.stars)));
      li.appendChild(s); li.appendChild(rmk("p", "rev-text", r.text));
      var m = rmk("p", "rev-meta");
      if (other) m.appendChild(rmk("span", "rev-lang", (R.names && R.names[r.lang]) || r.lang.toUpperCase()));
      m.appendChild(rmk("span", "rev-when", r.date + (r.version ? " · " + R.ver + " " + r.version : "")));
      li.appendChild(m); ul.appendChild(li);
    });
    rq("revs-h").hidden = !show.length;
    rq("other").hidden = !(show.length && other);
  }
  function refreshRatings() {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    // reviews=2: the answer stays far below 16 KB (some providers cut longer answers from Cloudflare); newer reviews are
    // merged into the ones already on the page
    fetch(R.url + "/summary?reviews=2", { mode: "cors", credentials: "omit", signal: ctl ? ctl.signal : undefined })
      .then(function (resp) { if (!resp.ok) throw new Error("status"); return resp.json(); })
      .then(function (d) {
        clearTimeout(timer);
        if (!okSummary(d) || d.count === 0) return;
        rfill(d);
        box.hidden = false;
        var have = readReviews(), seen = {};
        have.forEach(function (r) { seen[r.date + "|" + r.stars + "|" + r.text] = 1; });
        var add = (Array.isArray(d.approved_reviews) ? d.approved_reviews : []).filter(okReview).filter(function (r) {
          return !seen[r.date + "|" + r.stars + "|" + r.text];
        });
        if (add.length) drawReviews(add.concat(have), true);
      })
      .catch(function () { clearTimeout(timer); });
  }
  if (R && R.url && box && window.fetch) {
    if (document.readyState === "complete") setTimeout(refreshRatings, 0);
    else window.addEventListener("load", function () { setTimeout(refreshRatings, 0); });
  }
})();

/* download block: the folded "manual install" part is open on wide screens only */
(function () {
  if (window.matchMedia && window.matchMedia("(max-width:640px)").matches)
    document.querySelectorAll(".dlv details.fold[open]").forEach(function (d) { d.open = false; });
})();
