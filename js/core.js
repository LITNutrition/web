/**
 * js/core.js
 */

export const API      = "https://worker.litsuplementos.workers.dev";
export const API_FAQ  = "https://worker-faq.litsuplementos.workers.dev";
export const APP_URL  = "https://users.lit-nutrition.com";
export const IMG_BASE = "https://plan-5y4.pages.dev";

/* ── Control global del límite de stock ───────────────────────────────────
   1 = habilitado (comportamiento normal)
   0 = deshabilitado (no se muestran badges, "Sin stock", límites, etc.) */
export const STOCK_LIMIT_ENABLED = 0;

/* Estado global de la sesión de landing */
export const state = {
  seller:      null,   // perfil del seller (o null si no hay invite)
  catalog:     null,   // { products: [] }
  sellerStock: {},     // { product_id: quantity }
  inviteCode:  null,   // string o null
};

export const FALLBACK_CONTACT = {
  name: "LIT Nutrition",
  phone: "+59157358199",
  phones: ["+59157358199", "+59178299604"],
  qr_url: null,
};

export function getActiveContact() {
  if (state.inviteCode && state.seller?.phone) return state.seller;
  return FALLBACK_CONTACT;
}

/* Leer y persistir el inviteCode. Se lee de ?invite=CODE en la URL. En navegación interna (SPA entre páginas) se propaga via preserveInvite(). */
export function initInviteCode() {
  const params = new URLSearchParams(window.location.search);
  state.inviteCode = (params.get("invite") || "").toUpperCase() || null;
  return state.inviteCode;
}

/**
 * Devuelve el search-string actual asegurando que invite= esté presente.
 * Útil para construir links entre páginas sin perder el code del seller.
 * @param {string} [extra=""] — params adicionales sin "?"
 */
export function inviteQuery(extra = "") {
  const parts = [];
  if (state.inviteCode) parts.push(`invite=${state.inviteCode}`);
  if (extra) parts.push(extra);
  return parts.length ? "?" + parts.join("&") : "";
}

/* DOM helper */
export function el(id) { return document.getElementById(id); }

/* Formato moneda boliviana */
export function formatBs(n) {
  return `Bs. ${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/* Construye link de WhatsApp */
export function buildWALink(phone, message) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/* Construye URL de imagen */
export function imgUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return IMG_BASE + "/" + path.replace(/^\//, "");
}

/* Iniciales de un nombre */
export function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* Cliente API */
export const api = {
  async get(path, base = API) {
    const res  = await fetch(`${base}${path}`);
    const data = await res.json();
    return data;
  },
  async post(path, body, base = API) {
    const res  = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  },
};

/* Carga inicial de datos del seller + catálogo + stock */
export async function loadLandingData() {
  initInviteCode();

  const [profileResult, catalogResult, stockResult] = await Promise.allSettled([
    state.inviteCode ? api.get(`/api/public/profile?code=${state.inviteCode}`, API_FAQ) : Promise.resolve(null),
    api.get("/api/public/catalog", API_FAQ),
    state.inviteCode ? api.get(`/api/public/stock?code=${state.inviteCode}`, API_FAQ) : Promise.resolve({}),
  ]);

  state.seller = profileResult.status === "fulfilled" && profileResult.value?.ok
    ? profileResult.value.profile
    : null;

  state.catalog = catalogResult.status === "fulfilled" && catalogResult.value?.ok
    ? catalogResult.value
    : { products: [] };

  state.sellerStock = stockResult.status === "fulfilled" && stockResult.value?.ok
    ? (stockResult.value.stock || {})
    : {};

  return state;
}

/* Helpers de stock */
export function getStock(productId) {
  if (!STOCK_LIMIT_ENABLED) return null;
  if (!state.inviteCode || !state.seller) return null;
  const qty = state.sellerStock[String(productId)];
  return qty !== undefined ? Number(qty) : 0;
}

export function isOutOfStock(productId) {
  if (!STOCK_LIMIT_ENABLED) return false;
  const qty = getStock(productId);
  return qty !== null && qty === 0;
}

export function stockBadgeHtml(productId) {
  if (!STOCK_LIMIT_ENABLED) return "";
  const qty = getStock(productId);
  if (qty === null) return "";
  if (qty === 0)   return `<div class="stock-badge stock-badge--empty">Sin stock</div>`;
  if (qty <= 3)    return `<div class="stock-badge stock-badge--low">Últimas ${qty}</div>`;
  return `<div class="stock-badge stock-badge--ok">En stock</div>`;
}

/* Header scroll */
export function initHeaderScroll(headerId = "site-header") {
  const header = el(headerId);
  if (!header) return;
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });
}

/* Ocultar loader */
export function hideLoader(loaderId = "app-loader", delay = 700) {
  setTimeout(() => {
    const loader = el(loaderId);
    if (loader) loader.classList.add("hidden");
  }, delay);
}