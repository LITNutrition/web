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
        <img src="https://plan-5y4.pages.dev/public/icon/image/logo.png"
             alt="Nutrition" class="header-logo"
             onerror="this.style.display='none'">
        <span class="header-brand-name">NUTRITION</span>
      </div>
      <nav class="header-nav" aria-label="Navegación principal">
        <a href="/" class="header-nav-link${isHome ? " active" : ""}" id="nav-inicio">Inicio</a>
        <a href="/faq" class="header-nav-link${isFaq ? " active" : ""}" id="nav-faq">FAQ</a>
      </nav>
      <div class="seller-pill" id="seller-pill" style="display:none;">
        <span class="seller-pill-dot"></span>
        <span id="seller-pill-name">&ndash;</span>
        <span class="seller-pill-tag">tu asesor</span>
      </div>
      <a href="/" class="header-cta" id="header-cta">Ver productos</a>
    </div>`;
  document.body.prepend(header);
}
