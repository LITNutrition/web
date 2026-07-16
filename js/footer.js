/**
 * js/footer.js — LIT Nutrition
 * Footer compartido para todas las páginas.
 */

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/litnutrit",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Lit-Nutrition/61589575750915/",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@litnutrition",
    icon: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/></svg>`,
  },
];

function _socialLinksHTML(variant = "compact") {
  if (variant === "full") {
    return SOCIALS.map(
      (s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.icon}<span>${s.label}</span></a>`
    ).join("");
  }
  return SOCIALS.map(
    (s) => `<a href="${s.href}" target="_blank" rel="noopener" aria-label="${s.label}">${s.icon}</a>`
  ).join("");
}

export function socialLinksHTML() {
  return _socialLinksHTML("full");
}

export function renderFooter(seller = true) {
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">LIT</span>
        <span class="footer-brand-sub">NUTRITION</span>
      </div>
      <div class="footer-social">${_socialLinksHTML("compact")}</div>
      <p class="footer-copy">&copy; 2026 LIT Nutrition. Todos los derechos reservados. <a href="/privacy.html" class="footer-link">Pol&iacute;tica de privacidad</a></p>
      <div class="footer-seller" id="footer-seller" style="display:none;">
        Tienda de <strong id="footer-seller-name">&ndash;</strong>
        &middot; <span id="footer-seller-code" style="color:var(--accent);">&ndash;</span>
      </div>
    </div>`;
  document.body.appendChild(footer);
}
