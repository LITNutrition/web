/**
 * js/seller.js — LIT Nutrition
 * Renderiza toda la UI relacionada con el seller:
 * seller-card en hero, pill en header, datos de footer, links inter-página.
 */

import { state, el, getInitials, buildWALink, inviteQuery } from "./core.js";

/**
 * Aplica los datos del seller a todos los elementos del DOM que lo usan.
 * Llama después de que loadLandingData() haya resuelto.
 */
export function applySeller() {
  updateNav();
  if (!state.seller) return;

  applySellerPill();
  applySellerCard();
  applySellerFooter();
}

/* ── Links de navegación entre páginas (siempre, con o sin seller) ────────── */
function updateNav() {
  // Link FAQ en header
  const faqLink = el("nav-faq");
  if (faqLink) faqLink.href = `faq.html${inviteQuery()}`;

  // Link Inicio en header (desde faq.html)
  const homeLink = el("nav-home");
  if (homeLink) homeLink.href = `index.html${inviteQuery()}`;

  // Botón "Ver productos" del header CTA
  const headerCta = el("header-cta");
  if (headerCta && headerCta.getAttribute("href") === "#catalogo") {
    // ya apunta a ancla local, no tocar
  }

  // Banners del footer de landing
  const btnLogin    = el("btn-login");
  const btnRegister = el("btn-register");
  if (btnLogin)    btnLogin.href    = `${APP_URL}/`;
  if (btnRegister) btnRegister.href = state.inviteCode
    ? `${APP_URL}/?invite=${state.inviteCode}`
    : `${APP_URL}/`;
}

/* ── Seller pill en header ───────────────────────────────────────────────── */
function applySellerPill() {
  const pill = el("seller-pill");
  const name = el("seller-pill-name");
  if (!pill || !name) return;

  name.textContent   = state.seller.name;
  pill.style.display = "flex";
}

/* ── Seller card en hero ─────────────────────────────────────────────────── */
function applySellerCard() {
  const card   = el("seller-card");
  const avatar = el("seller-avatar");
  const name   = el("seller-name");
  const code   = el("seller-code");
  const waBtn  = el("seller-wa-btn");

  if (!card) return;

  if (avatar) avatar.textContent = getInitials(state.seller.name);
  if (name)   name.textContent   = state.seller.name;
  if (code)   code.textContent   =
    state.seller.code + " · " +
    (state.seller.role === "socio" ? "Socio" : "Distribuidor");

  card.style.display = "flex";

  if (waBtn) {
    if (state.seller.phone) {
      waBtn.href = buildWALink(
        state.seller.phone,
        `Hola ${state.seller.name}, me interesa conocer más sobre los productos LIT Nutrition`
      );
      waBtn.style.display = "flex";
    } else {
      waBtn.style.display = "none";
    }
  }
}

/* ── Seller en footer ────────────────────────────────────────────────────── */
function applySellerFooter() {
  const footerSeller = el("footer-seller");
  const footerName   = el("footer-seller-name");
  const footerCode   = el("footer-seller-code");

  if (!footerSeller) return;

  footerSeller.style.display    = "block";
  if (footerName) footerName.textContent = state.seller.name;
  if (footerCode) footerCode.textContent = state.seller.code;
}

/* ── Re-exportamos APP_URL para que seller.js no dependa de core directamente */
import { APP_URL } from "./core.js";