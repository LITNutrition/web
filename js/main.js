/**
 * js/main.js — LIT Nutrition · index.html
 * Página principal: hero, catálogo, banners, testimonios.
 */

import { loadLandingData, initHeaderScroll, hideLoader, el, state, renderNotFound } from "./core.js";
import { applySeller }                                    from "./seller.js";
import { renderProducts, openBuyModal, initModalEvents }  from "./catalog.js";
import { initProductPageRouting, closeProductPage }       from "./product-page.js";
import { renderFooter }                                   from "./footer.js";
import { renderHeader }                                   from "./header.js";

if (sessionStorage.getItem('lit-loaded')) {
  const loader = document.getElementById('app-loader');
  if (loader) loader.classList.add('hidden');
} else {
  sessionStorage.setItem('lit-loaded', '1');
}

/* ── Propagar invite code a los links del header ──────────────────────────── */
function _propagateInvite() {
  if (!state.inviteCode) return;
  const q = `?invite=${state.inviteCode}`;
  document.querySelectorAll('.header-nav-link, #hero-faq-link').forEach(a => {
    const href = a.getAttribute('href');
    if (href && !href.includes('invite=')) {
      a.href = href + q;
    }
  });
}

/* ── Header scroll ───────────────────────────────────────────────────────── */
renderHeader();
initHeaderScroll("site-header");

/* ── Modal ───────────────────────────────────────────────────────────────── */
initModalEvents();
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && el("product-page")?.classList.contains("open")) {
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
    closeProductPage();
  }
});

/* ── Bootstrap ───────────────────────────────────────────────────────────── */
async function init() {
  // Precargar hero video en cache mientras el loader está activo
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) heroVideo.load();

  await loadLandingData();

  if (state.invalidInvite) {
    renderNotFound();
    hideLoader("app-loader", 0);
    return;
  }

  applySeller();
  _propagateInvite();
  renderFooter();
  renderProducts();
  initProductPageRouting(openBuyModal);

  // Inicializar iconos Lucide en el HTML estático
  lucide.createIcons();

  hideLoader("app-loader", 800);
}

init();
