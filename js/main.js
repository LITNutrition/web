/**
 * js/main.js — LIT Nutrition · index.html (SPA)
 * Maneja vista Home y vista FAQ sin recargar la página.
 */

import { loadLandingData, initHeaderScroll, hideLoader, el, state, buildWALink } from "./core.js";
import { applySeller }                                    from "./seller.js";
import { renderProducts, openBuyModal, initModalEvents }  from "./catalog.js";
import { initProductPageRouting, closeProductPage }       from "./product-page.js";
import { loadFAQ, initFAQSearch }                         from "./faq.js";

/* ── Secciones de la SPA ─────────────────────────────────────────────────── */
// "home"  → muestra hero + catálogo + banners + testimonios
// "faq"   → muestra sección FAQ
const HOME_IDS = ["hero", "catalogo", "ad-banner-section-wrap",
                  ".testimonials-section", ".banners-section"];

let _faqLoaded = false; // carga el FAQ solo una vez

/* ── Ocultar/mostrar vistas ──────────────────────────────────────────────── */
function _showView(view) {
  const isHome = view !== "faq";

  // Alternar secciones de home
  document.querySelectorAll(
    "#hero, .catalog-section, .ad-banner-section, .testimonials-section, .banners-section"
  ).forEach(s => { s.style.display = isHome ? "" : "none"; });

  // Alternar sección FAQ
  const faqView = el("view-faq");
  if (faqView) faqView.style.display = isHome ? "none" : "";

  // Actualizar nav activo
  el("nav-inicio")?.classList.toggle("active", isHome);
  el("nav-faq")?.classList.toggle("active", !isHome);

  // Scroll top al cambiar vista
  window.scrollTo({ top: 0, behavior: "instant" });

  // Cargar FAQ la primera vez que se accede
  if (!isHome && !_faqLoaded) {
    _faqLoaded = true;
    loadFAQ().then(() => {
      initFAQSearch();
      _applyFAQSeller();
    });
  }
}

/* ── Seller en el CTA de contacto del FAQ ────────────────────────────────── */
function _applyFAQSeller() {
  const waBtn       = el("faq-wa-btn");
  const sub         = el("faq-contact-sub");
  const noSellerMsg = el("faq-no-seller-note");

  if (state.seller?.phone) {
    const msg = `Hola ${state.seller.name}! Tengo una consulta sobre los productos LIT Nutrition.`;
    if (waBtn) waBtn.href = buildWALink(state.seller.phone, msg);
    if (sub)   sub.textContent = `Escríbele directamente a ${state.seller.name} y te responde a la brevedad.`;
  } else {
    if (waBtn) waBtn.style.display = "none";
    if (noSellerMsg) noSellerMsg.style.display = "block";
  }

  // "desde aquí" vuelve al catálogo sin reload
  el("faq-back-catalog")?.addEventListener("click", e => {
    e.preventDefault();
    _navigate("home");
  });
}

/* ── Router ──────────────────────────────────────────────────────────────── */
function _navigate(view) {
  const q = state.inviteCode ? `?invite=${state.inviteCode}` : "";
  const path = view === "faq" ? `/faq${q}` : `/${q}`;
  window.history.pushState({ view }, "", path);
  _showView(view);
}

function _routeFromURL() {
  const isFaq = window.location.pathname.includes("faq");
  _showView(isFaq ? "faq" : "home");
}

/* ── Interceptar todos los links data-view ───────────────────────────────── */
function _bindNavLinks() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;
    e.preventDefault();
    _navigate(link.dataset.view);
  });
}

/* ── Header scroll ───────────────────────────────────────────────────────── */
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
  await loadLandingData();

  applySeller();
  renderProducts();
  initProductPageRouting(openBuyModal);
  _bindNavLinks();

  // popstate (botón atrás/adelante del browser)
  window.addEventListener("popstate", (e) => {
    _showView(e.state?.view ?? (window.location.pathname.includes("faq") ? "faq" : "home"));
  });

  // Ruta inicial
  _routeFromURL();

  hideLoader("app-loader", 800);
}

init();