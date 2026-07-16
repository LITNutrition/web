/**
 * js/header.js — LIT Nutrition
 * Header compartido para todas las páginas.
 */

export function renderHeader() {
  const path = window.location.pathname;
  const isHome = path === "/" || path === "";
  const isFaq  = path.includes("faq");

  const header = document.createElement("header");
  header.className = "site-header";
  header.id = "site-header";
  header.innerHTML = `
    <div class="header-inner">
      <div class="header-brand">
        <img src="https://lit-nutrition.com/public/icon/image/logo.png"
             alt="Nutrition" class="header-logo"
             onerror="this.style.display='none'">
        <span class="header-brand-name">NUTRITION</span>
      </div>
      <nav class="header-nav" aria-label="Navegación principal">
        <a href="/" class="header-nav-link${isHome ? " active" : ""}" id="nav-inicio">Inicio</a>
        <a href="/faq.html" class="header-nav-link${isFaq ? " active" : ""}" id="nav-faq">Preguntas Frecuentes</a>
      </nav>
      <div class="seller-pill" id="seller-pill" style="display:none;">
        <span class="seller-pill-dot"></span>
        <span id="seller-pill-name">&ndash;</span>
        <span class="seller-pill-tag">tu asesor</span>
      </div>
      <a href="/" class="header-cta" id="header-cta">Ver productos</a>
    </div>`;
  document.body.prepend(header);

  const bottomNav = document.createElement("nav");
  bottomNav.className = "mobile-bottom-nav";
  bottomNav.setAttribute("aria-label", "Navegación inferior");
  bottomNav.innerHTML = `
    <a href="/" class="mbn-link${isHome ? " active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Inicio</span>
    </a>
    <a href="/faq.html" class="mbn-link${isFaq ? " active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>FAQ</span>
    </a>`;
  document.body.appendChild(bottomNav);
}
