/**
 * js/main.js — LIT Nutrition · index.html
 * Entry point: orquesta carga de datos, seller UI, carrusel y producto SPA.
 */

import { loadLandingData, initHeaderScroll, hideLoader, el } from "./core.js";
import { applySeller }          from "./seller.js";
import { renderProducts, openBuyModal, initModalEvents } from "./catalog.js";
import { initProductPageRouting, closeProductPage }      from "./product-page.js";

/* ── Header scroll ───────────────────────────────────────────────────────── */
initHeaderScroll("site-header");

/* ── Modal ESC + overlay click ───────────────────────────────────────────── */
initModalEvents();

// Tecla ESC también cierra página de detalle
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && el("product-page")?.classList.contains("open")) {
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
    closeProductPage();
  }
});

/* ── Bootstrap ───────────────────────────────────────────────────────────── */
async function init() {
  await loadLandingData();

  applySeller();
  renderProducts();

  // Routing SPA para páginas de detalle (pass del modal como callback)
  initProductPageRouting(openBuyModal);

  hideLoader("app-loader", 800);
}

init();