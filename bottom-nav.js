/* =========================================================
   الورشة الفنية — شريط التنقل السفلي الثابت (bottom-nav.js)
   =========================================================
   شريط ثابت أسفل كل صفحات النظام (بيتحمّل زي global-search.js
   في كل صفحة) فيه أيقونات صغيرة للأقسام الرئيسية: العملاء،
   الأجهزة، أوامر الشغل، خط السير، الحسابات — وزرار بحث بيفتح
   نفس نافذة البحث الشامل الموجودة أصلًا (gsBtn) من غير ما
   نكرر منطقها. بندوس على أيقونة فبيوديك لصفحة القسم على طول.

   الاعتماد: مفيش أي اعتماد على بيانات النظام — بس DOM +
   location، فمينفعش يتحمّل في أي وقت، لكن ورّيناه بعد
   global-search.js في كل صفحة عشان يبقى الترتيب موحّد.
   ========================================================= */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  var TABS = [
    { key: "customers", icon: "👤", label: "عملاء", href: "customers.html", pages: ["customers.html", "customer.html"] },
    { key: "devices", icon: "🔧", label: "أجهزة", href: "devices.html", pages: ["devices.html", "device.html"] },
    { key: "requests", icon: "🛠️", label: "أوامر", href: "requests.html", pages: ["requests.html", "request.html"] },
    { key: "route", icon: "🗺️", label: "خط سير", href: "route.html", pages: ["route.html"] },
    { key: "wallets", icon: "💳", label: "حسابات", href: "wallets.html", pages: ["wallets.html", "wallet.html"] }
  ];

  function currentPage() {
    var parts = location.pathname.split("/");
    return (parts[parts.length - 1] || "index.html").toLowerCase();
  }

  function injectStyles() {
    if (document.getElementById("bottomNavStyle")) return;
    var style = document.createElement("style");
    style.id = "bottomNavStyle";
    style.textContent =
      "#gsBtn{display:none!important}" +
      "body.has-bottom-nav{padding-bottom:74px}" +
      "#bottomNav{position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#fff;border-top:1px solid #e2e6eb;box-shadow:0 -2px 12px rgba(0,0,0,.08);display:flex;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));gap:2px}" +
      "#bottomNav a,#bottomNav button{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;text-decoration:none;color:#687583;background:transparent;border:0;font:inherit;cursor:pointer;padding:6px 2px;border-radius:10px}" +
      "#bottomNav a i,#bottomNav button i{font-style:normal;font-size:20px;line-height:1}" +
      "#bottomNav a small,#bottomNav button small{font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}" +
      "#bottomNav a.active{color:#17324d;background:#e8f1ff;font-weight:bold}" +
      "#bottomNav a:active,#bottomNav button:active{opacity:.7}";
    document.head.appendChild(style);
  }

  function injectUI() {
    if (document.getElementById("bottomNav")) return;
    injectStyles();

    var page = currentPage();
    var nav = document.createElement("nav");
    nav.id = "bottomNav";

    nav.innerHTML = TABS.map(function (t) {
      var active = t.pages.indexOf(page) !== -1;
      return '<a href="' + t.href + '" class="' + (active ? "active" : "") + '"><i>' + t.icon + "</i><small>" + t.label + "</small></a>";
    }).join("") + '<button type="button" id="bottomNavSearch"><i>🔍</i><small>بحث</small></button>';

    document.body.appendChild(nav);
    document.body.classList.add("has-bottom-nav");

    var searchBtn = document.getElementById("bottomNavSearch");
    searchBtn.addEventListener("click", function () {
      var gsBtn = document.getElementById("gsBtn");
      if (gsBtn) gsBtn.click();
    });
  }

  ready(injectUI);
})();
