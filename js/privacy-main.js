/**
 * js/privacy-main.js — LIT Nutrition · privacy.html
 * Entry point: carga minimal (seller para header/footer).
 */

import { loadLandingData, initHeaderScroll, hideLoader, state } from "./core.js";
import { applySeller } from "./seller.js";
import { renderFooter, socialLinksHTML } from "./footer.js";
import { renderHeader } from "./header.js";

renderHeader();
initHeaderScroll("site-header");

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

async function init() {
  await loadLandingData();

  applySeller();
  _propagateInvite();
  renderFooter();

  const socialContainer = document.getElementById('privacy-social');
  if (socialContainer) socialContainer.innerHTML = socialLinksHTML();

  lucide.createIcons();
  hideLoader("app-loader", 600);
}

init();
