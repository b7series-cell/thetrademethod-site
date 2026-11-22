/* inside.js — mini charts + stepper for the homepage "Inside every page" section (#inside). */
(function () {
  function candles(list) { // [x, o, c, h, l]
    return list.map(function (c) {
      var x = c[0], o = c[1], cl = c[2], h = c[3], l = c[4], up = cl < o; // y grows downward
      var top = Math.min(o, cl), hgt = Math.max(3, Math.abs(o - cl));
      return '<line class="wk" x1="' + (x + 5) + '" x2="' + (x + 5) + '" y1="' + h + '" y2="' + l + '"/>' +
             '<rect class="' + (up ? "up" : "dn") + '" x="' + x + '" y="' + top + '" width="10" height="' + hgt + '" rx="1.5"/>';
    }).join("");
  }
  var BARS = [[14,92,84,96,80],[32,84,88,92,78],[50,88,76,90,72],[68,76,62,78,58],[86,62,66,70,58],[104,66,70,74,62],[122,70,60,72,56],[140,60,46,62,42],[158,46,40,50,34],[176,40,44,48,36],[194,44,32,46,28],[212,32,22,34,18]];
  var ILL = {
    thesis:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' +
      '<line class="ln hi" x1="16" x2="150" y1="22" y2="22"/>' +
      '<line class="ln" x1="16" x2="224" y1="46" y2="46"/><line class="ln" x1="16" x2="200" y1="66" y2="66"/>' +
      '<line class="ln" x1="16" x2="214" y1="86" y2="86"/><line class="ln" x1="16" x2="120" y1="106" y2="106"/>' +
      '<rect x="128" y="96" width="96" height="20" rx="10" fill="#2997ff" opacity=".18"/><text class="lab" x="176" y="110" text-anchor="middle" fill="#2997ff" style="fill:#2997ff">before any chart</text></svg>',
    stages:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' + candles(BARS) +
      '<circle class="dot" cx="55" cy="64" r="9"/><text class="dtx" x="55" y="64">1</text>' +
      '<circle class="dot" cx="109" cy="52" r="9"/><text class="dtx" x="109" y="52">2</text>' +
      '<circle class="dot" cx="163" cy="24" r="9"/><text class="dtx" x="163" y="24">3</text>' +
      '<circle class="dot" cx="217" cy="8" r="7"/><text class="dtx" x="217" y="8" style="font-size:9px">4</text></svg>',
    filters:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' +
      [["ok","Volume above average",20],["ok","Trend agrees",46],["no","Into a major level",72],["ok","Not into news",98]].map(function (r) {
        var mark = r[0] === "ok"
          ? '<circle class="ok" cx="24" cy="' + r[2] + '" r="8"/><path d="M20 ' + r[2] + ' l3 3 l5 -6" stroke="#000" stroke-width="2" fill="none"/>'
          : '<circle class="no" cx="24" cy="' + r[2] + '" r="8"/><path d="M20.5 ' + (r[2]-3.5) + ' l7 7 M27.5 ' + (r[2]-3.5) + ' l-7 7" stroke="#000" stroke-width="2"/>';
        return mark + '<text class="lab" x="42" y="' + (r[2] + 4) + '" style="font-size:13px;fill:' + (r[0] === "ok" ? "#a1a1a6" : "#f5f5f7") + '">' + r[1] + '</text>';
      }).join("") + '<text class="lab" x="226" y="76" text-anchor="end" style="fill:#ff453a;font-weight:600">skip</text></svg>',
    invalidation:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' + candles(BARS.slice(0, 9)) +
      '<line class="lvl" x1="8" x2="232" y1="98" y2="98"/><text class="lab" x="232" y="114" text-anchor="end" style="fill:#ff453a;font-weight:600">wrong below here</text></svg>',
    examples:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' + candles(BARS) +
      '<line class="tgt" x1="120" x2="232" y1="20" y2="20"/><text class="lab" x="122" y="14" style="fill:#30d158">target</text>' +
      '<line class="ent" x1="120" x2="232" y1="62" y2="62"/><text class="lab" x="232" y="56" text-anchor="end" style="fill:#2997ff">entry</text>' +
      '<line class="lvl" x1="120" x2="232" y1="80" y2="80"/><text class="lab" x="232" y="94" text-anchor="end" style="fill:#ff453a">stop</text></svg>',
    indicators:
      '<svg class="ill" viewBox="0 0 240 120" aria-hidden="true">' +
      '<text class="code" x="14" y="24"><tspan class="kw">//@version=</tspan>6</text>' +
      '<text class="code" x="14" y="44"><tspan class="fn">indicator</tspan>("Setup levels")</text>' +
      '<text class="code" x="14" y="64">lvl = ta.<tspan class="fn">highest</tspan>(high, 20)</text>' +
      '<text class="code" x="14" y="84"><tspan class="fn">plot</tspan>(lvl, color=color.red)</text>' +
      '<text class="code" x="14" y="104"><tspan class="fn">alertcondition</tspan>(close &gt; lvl)</text></svg>'
  };
  document.querySelectorAll("[data-ill]").forEach(function (el) { el.innerHTML = ILL[el.getAttribute("data-ill")] || ""; });

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* B: tabs drive the panel, auto-advance until touched */
  document.querySelectorAll(".ib").forEach(function (root) {
    var tabs = root.querySelectorAll(".ib-tabs button"), slides = root.querySelectorAll(".ib-slide"), i = 0, t;
    function go(n, user) {
      i = n;
      tabs.forEach(function (b, k) { b.classList.toggle("on", k === n); b.setAttribute("aria-selected", k === n); });
      slides.forEach(function (s, k) { s.classList.toggle("on", k === n); });
      if (user) { var b = tabs[n]; b.parentNode.parentNode.scrollTo({ left: b.parentNode.offsetLeft - 16, behavior: "smooth" }); }
    }
    tabs.forEach(function (b, k) { b.addEventListener("click", function () { clearInterval(t); root.classList.add("paused"); go(k, true); }); });
    go(0);
    if (!reduce) t = setInterval(function () { go((i + 1) % tabs.length); }, 5000);
  });

})();
