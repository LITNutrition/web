/**
 * js/faq-main.js — LIT Nutrition · faq.html
 * Entry point: carga minimal (seller + FAQ + contacto).
 */

import { loadLandingData, initHeaderScroll, hideLoader, el, state, buildWALink, renderNotFound } from "./core.js";
import { applySeller }          from "./seller.js";
import { loadFAQ, initFAQSearch } from "./faq.js";
import { renderFooter }          from "./footer.js";
import { renderHeader }          from "./header.js";

if (sessionStorage.getItem('lit-loaded')) {
  const loader = document.getElementById('app-loader');
  if (loader) loader.classList.add('hidden');
} else {
  sessionStorage.setItem('lit-loaded', '1');
}

renderHeader();
initHeaderScroll("site-header");

/* ── Seller en el CTA de contacto ─────────────────────────────────────────── */
function _applyFAQSeller() {
  const waBtn       = el("faq-wa-btn");
  const sub         = el("faq-contact-sub");
  const noSellerMsg = el("faq-no-seller-note");
  const isInviteFlow = Boolean(state.inviteCode);
  const hasSeller = Boolean(isInviteFlow && state.seller?.phone);
  const sellerName = state.seller?.name || "LIT Nutrition";

  if (hasSeller) {
    const msg = `Hola ${sellerName}! Tengo una consulta sobre los productos LIT Nutrition.`;
    if (waBtn) {
      waBtn.href = buildWALink(state.seller.phone, msg);
      waBtn.style.display = "inline-flex";
    }
    if (sub) {
      sub.innerHTML = `Escríbele directamente a <strong>${sellerName}</strong> y te responde a la brevedad.`;
    }
    if (noSellerMsg) noSellerMsg.style.display = "none";
  } else if (!isInviteFlow) {
    if (waBtn) waBtn.style.display = "none";
    if (sub) {
      const msg = "Hola LIT Nutrition! Tengo una consulta sobre los productos LIT Nutrition.";
      sub.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
          <a href="${buildWALink('+59157358199', msg)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-weight:600;">
            WhatsApp +59157358199
          </a>
          <a href="${buildWALink('+59178299604', msg)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent);font-weight:600;">
            WhatsApp +59178299604
          </a>
        </div>`;
    }
    if (noSellerMsg) noSellerMsg.style.display = "none";
  } else {
    if (waBtn) waBtn.style.display = "none";
    if (sub) sub.innerHTML = "Tu asesor no configuró WhatsApp.";
    if (noSellerMsg) noSellerMsg.style.display = "block";
  }
}

/* ── Propagar invite code a los links del header ──────────────────────────── */
function _propagateInvite() {
  if (!state.inviteCode) return;
  const q = `?invite=${state.inviteCode}`;
  document.querySelectorAll('.header-nav-link, .header-cta').forEach(a => {
    const href = a.getAttribute('href');
    if (href && !href.includes('invite=')) {
      a.href = href + q;
    }
  });
}

/* ── Bootstrap ────────────────────────────────────────────────────────────── */
async function init() {
  await loadLandingData();

  if (state.invalidInvite) {
    renderNotFound();
    hideLoader("app-loader", 0);
    return;
  }

  applySeller();
  _propagateInvite();
  renderFooter();
  await loadFAQ();
  initFAQSearch();
  _applyFAQSeller();

  lucide.createIcons();
  hideLoader("app-loader", 600);
}

init();
