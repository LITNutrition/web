/**
 * js/product-page.js
 * Página de detalle de producto como overlay SPA.
 * Se activa via hash #producto/ID y vuelve al catálogo con back/ESC.
 */

import {
  state, el, api, API_FAQ,
  imgUrl, formatBs, buildWALink,
  getStock, isOutOfStock, getActiveContact,
} from "./core.js";

/* Routing por hash */
export function initProductPageRouting(onOpenBuyModal) {
  _openBuyModalFn = onOpenBuyModal;

  handleRoute();
  window.addEventListener("popstate", handleRoute);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && el("product-page")?.classList.contains("open")) {
      _pushHomeHash();
      closeProductPage();
    }
  });
}

let _openBuyModalFn = null;

function handleRoute() {
  const match = window.location.hash.match(/^#producto\/(\d+)$/);
  if (match) openProductPage(Number(match[1]));
  else closeProductPage();
}

export function navigateToProduct(prod) {
  window.history.pushState({}, "", `${window.location.pathname}${window.location.search}#producto/${prod.id}`);
  openProductPage(prod.id);
}

function _pushHomeHash() {
  window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
}

/* Abrir / cerrar */
async function openProductPage(productId) {
  const prod = (state.catalog?.products ?? []).find(p => Number(p.id) === Number(productId));
  if (!prod) { closeProductPage(); return; }

  const page    = el("product-page");
  const content = el("product-page-content");
  if (!page || !content) return;

  page.classList.add("open");
  document.body.style.overflow = "hidden";
  content.innerHTML = renderSkeleton();

  const data = await api.get(`/api/public/product-details?product_id=${productId}`, API_FAQ);
  const details = data.ok ? data.details : null;

  content.innerHTML = renderProductDetail(prod, details);
  lucide.createIcons();
  bindProductPageEvents(prod, details);
}

export function closeProductPage() {
  const page = el("product-page");
  if (!page) return;
  page.classList.remove("open");
  document.body.style.overflow = "";
}

/* Eventos internos de la página de detalle */
function bindProductPageEvents(prod) {
  const content = el("product-page-content");
  if (!content) return;

  content.querySelector("#pd-back-btn")?.addEventListener("click", () => {
    _pushHomeHash();
    closeProductPage();
  });

  content.querySelector("#pd-buy-btn")?.addEventListener("click", () => {
    if (!isOutOfStock(prod.id) && _openBuyModalFn) _openBuyModalFn(prod);
  });

  // Tabs
  content.querySelectorAll(".pd-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      content.querySelectorAll(".pd-tab-btn")
        .forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      content.querySelectorAll(".pd-tab-panel")
        .forEach(p => p.classList.toggle("active", p.dataset.tab === tab));
    });
  });
}

/* Skeleton */
function renderSkeleton() {
  return `
    <div class="pd-skeleton">
      <div class="pd-skel-img"></div>
      <div class="pd-skel-body">
        <div class="pd-skel-line" style="width:60%;height:14px;"></div>
        <div class="pd-skel-line" style="width:80%;height:28px;margin-top:10px;"></div>
        <div class="pd-skel-line" style="width:90%;height:14px;margin-top:12px;"></div>
        <div class="pd-skel-line" style="width:70%;height:14px;margin-top:6px;"></div>
      </div>
    </div>`;
}

/* ── Benefits carousel helpers ────────────────────────────────────────────── */
const BENEFIT_ICONS = ["sparkles", "shield-check", "zap", "heart", "star", "check-circle", "leaf", "flame"];

function _buildBenefitsCards(benefits) {
  if (benefits.length <= 3) {
    const padded = [...benefits];
    while (padded.length < 3) padded.push("");
    return padded.map((b, i) => _benefitCard(b, i)).join("");
  }
  const fullChunks = Math.ceil(benefits.length / 3) * 3;
  const cycled = [];
  for (let i = 0; i < fullChunks; i++) cycled.push(benefits[i % benefits.length]);
  return cycled.map((b, i) => _benefitCard(b, i)).join("");
}

function _benefitCard(text, idx) {
  if (!text) return `<div class="pd-benefit-card pd-benefit-card--empty"></div>`;
  const icon = BENEFIT_ICONS[idx % BENEFIT_ICONS.length];
  return `
    <div class="pd-benefit-card">
      <div class="pd-benefit-icon"><i data-lucide="${icon}"></i></div>
      <span>${text}</span>
    </div>`;
}

/* Render completo */
function renderProductDetail(prod, details) {
  const imgSrc = imgUrl(prod.image_url);
  const outOfStock = isOutOfStock(prod.id);
  const stockQty = getStock(prod.id);

  const benefits = details?.benefits      ?? [];
  const ingredients = details?.ingredients   ?? [];
  const conditions = details?.conditions    ?? [];
  const refs = details?.research_refs ?? [];

  const buyBtnHtml = outOfStock
    ? `<button class="pd-buy-btn pd-buy-btn--disabled" disabled>Sin stock</button>`
    : `<button class="pd-buy-btn" id="pd-buy-btn">
        <i data-lucide="shopping-bag"></i>
        Pedir ahora
      </button>`;

  const stockIndicatorHtml = stockQty !== null ? `
    <div class="pd-stock-row">
      ${outOfStock
        ? `<span class="pd-stock-chip pd-stock-chip--empty"><i data-lucide="triangle-alert"></i> Sin stock disponible</span>`
        : stockQty <= 3
          ? `<span class="pd-stock-chip pd-stock-chip--low"><i data-lucide="flame"></i> Últimas ${stockQty} unidades</span>`
          : `<span class="pd-stock-chip pd-stock-chip--ok"><i data-lucide="check"></i> En stock</span>`
      }
    </div>` : "";

  const hasFirstTab  = ingredients.length > 0;
  const hasSecondTab = conditions.length > 0;
  const hasThirdTab  = refs.length > 0;
  const hasUsage     = !!details?.usage;

  return `
    <div class="pd-topbar">
      <button class="pd-back-btn" id="pd-back-btn">
        <i data-lucide="chevron-left"></i>
        Volver al catálogo
      </button>
      ${state.seller ? `
        <div class="pd-seller-mini">
          <span class="pd-seller-dot"></span>
          Asesor: <strong>${state.seller.name}</strong>
        </div>` : ""}
    </div>

    <div class="pd-hero">
      <div class="pd-hero-image-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${prod.name}" class="pd-hero-image" loading="eager">`
          : `<div class="pd-hero-image-placeholder"><i data-lucide="pill"></i></div>`}
        <div class="pd-hero-image-overlay"></div>
      </div>
      <div class="pd-hero-content">
        ${details?.tagline ? `<div class="pd-tagline">${details.tagline}</div>` : ""}
        <h1 class="pd-name">${prod.name}</h1>
        ${details?.format ? `
          <div class="pd-meta-row">
            <span class="pd-meta-chip"><i data-lucide="package"></i> ${details.format}</span>
            ${details.net_content ? `<span class="pd-meta-chip"><i data-lucide="scale"></i> ${details.net_content}</span>` : ""}
          </div>` : ""}
        ${stockIndicatorHtml}
        <div class="pd-price-row">
          <div>
            <div class="pd-price-label">Precio público</div>
            <div class="pd-price">${formatBs(prod.precio_publico)}</div>
          </div>
          ${buyBtnHtml}
        </div>
        ${details?.description ? `<p class="pd-description">${details.description}</p>` : ""}
        ${benefits.length > 0 ? `
          <div class="pd-benefits-carousel">
            <div class="pd-benefits-track${benefits.length > 3 ? " scroll" : ""}">
              ${_buildBenefitsCards(benefits)}
            </div>
          </div>` : ""}
      </div>
    </div>

    <div class="pd-section pd-tabs-section">
      <div class="pd-tabs">
        ${hasFirstTab  ? `<button class="pd-tab-btn active" data-tab="ingredients">Fórmula</button>` : ""}
        ${hasSecondTab ? `<button class="pd-tab-btn${!hasFirstTab ? " active" : ""}" data-tab="conditions">Indicaciones</button>` : ""}
        ${hasThirdTab  ? `<button class="pd-tab-btn${!hasFirstTab && !hasSecondTab ? " active" : ""}" data-tab="refs">Investigación</button>` : ""}
        ${hasUsage     ? `<button class="pd-tab-btn" data-tab="usage">Uso</button>` : ""}
      </div>

      ${hasFirstTab ? `
        <div class="pd-tab-panel active" data-tab="ingredients">
          <div class="pd-ingredients-list">
            ${ingredients.map(ing => `
              <div class="pd-ingredient">
                <div class="pd-ingredient-header">
                  <span class="pd-ingredient-name">${ing.name}</span>
                  ${ing.amount ? `<span class="pd-ingredient-amount">${ing.amount}</span>` : ""}
                </div>
                ${ing.note ? `<div class="pd-ingredient-note">${ing.note}</div>` : ""}
              </div>`).join("")}
          </div>
        </div>` : ""}

      ${hasSecondTab ? `
        <div class="pd-tab-panel${!hasFirstTab ? " active" : ""}" data-tab="conditions">
          <p class="pd-tab-intro">Este producto puede apoyar en el manejo de las siguientes condiciones:</p>
          <div class="pd-conditions-grid">
            ${conditions.map(c => `
              <div class="pd-condition-tag">
                <i data-lucide="check"></i>
                ${c}
              </div>`).join("")}
          </div>
          <p class="pd-disclaimer"><i data-lucide="triangle-alert"></i> Este producto no reemplaza tratamientos médicos. Consulte a su médico.</p>
        </div>` : ""}

      ${hasThirdTab ? `
        <div class="pd-tab-panel${!hasFirstTab && !hasSecondTab ? " active" : ""}" data-tab="refs">
          <p class="pd-tab-intro">Respaldado por investigación científica publicada:</p>
          <div class="pd-refs-list">
            ${refs.map(r => `
              <div class="pd-ref">
                <div class="pd-ref-title">${r.title}</div>
                <div class="pd-ref-source">${r.source}</div>
                ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="pd-ref-link">Ver estudio <i data-lucide="arrow-right"></i></a>` : ""}
              </div>`).join("")}
          </div>
        </div>` : ""}

      ${hasUsage ? `
        <div class="pd-tab-panel" data-tab="usage">
          <div class="pd-usage-box">
            <div class="pd-usage-icon"><i data-lucide="clipboard"></i></div>
            <div class="pd-usage-text">${details.usage}</div>
          </div>
        </div>` : ""}
    </div>

    ${details?.warning ? `
      <div class="pd-section">
        <div class="pd-warning-box">
          <i data-lucide="triangle-alert"></i>
          <p>${details.warning}</p>
        </div>
      </div>` : ""}

    <div class="pd-section pd-cta-section">
      ${outOfStock
        ? `<div class="pd-oos-notice">
             <i data-lucide="circle-alert"></i>
             Este asesor no tiene stock disponible en este momento.
           </div>`
        : `<button class="pd-buy-btn-full" onclick="document.getElementById('pd-buy-btn').click()">
             <i data-lucide="shopping-bag"></i>
             Pedir ${prod.name}
           </button>`
      }
      ${(() => {
        const contact = getActiveContact();
        if (!contact?.phone) return "";
        if (state.inviteCode) {
          return `
            <a class="pd-wa-cta"
               href="${buildWALink(contact.phone, `Hola ${contact.name}! Quiero más info sobre ${prod.name}`)}"
               target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Consultar por WhatsApp
            </a>`;
        }
        return `
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
            <a class="pd-wa-cta" href="${buildWALink('+59157358199', `Hola LIT Nutrition! Quiero más info sobre ${prod.name}`)}" target="_blank" rel="noopener">WhatsApp +59157358199</a>
            <a class="pd-wa-cta" href="${buildWALink('+59178299604', `Hola LIT Nutrition! Quiero más info sobre ${prod.name}`)}" target="_blank" rel="noopener">WhatsApp +59178299604</a>
          </div>`;
      })()}
    </div>

  `;
}