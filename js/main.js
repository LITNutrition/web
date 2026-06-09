/**
 * js/main.js — LIT Nutrition Landing
 * Lee ?invite=LITXXX, carga perfil y catálogo, renderiza dinámicamente.
 * SPA: página de detalle con carrusel en vista principal.
 */

const API     = "https://worker.litsuplementos.workers.dev";
const APP_URL = "https://plan-5y4.pages.dev";
const IMG_BASE = "https://plan-5y4.pages.dev";

/* ── Utilidades ── */
function el(id) { return document.getElementById(id); }

function formatBs(n) {
  return `Bs. ${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function buildWALink(phone, message) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function imgUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return IMG_BASE + "/" + path.replace(/^\//, "");
}

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function preserveInvite(extraParams = "") {
  const base = window.location.pathname;
  const q = inviteCode ? `?invite=${inviteCode}${extraParams ? "&" + extraParams : ""}` : (extraParams ? "?" + extraParams : "");
  return base + q;
}

/* ── Estado global ── */
let seller     = null;
let catalog    = null;
let inviteCode = null;

/* ════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════ */
async function init() {
  const params = new URLSearchParams(window.location.search);
  inviteCode = (params.get("invite") || "").toUpperCase() || null;

  const [profileData, catalogData] = await Promise.allSettled([
    inviteCode ? fetchProfile(inviteCode) : Promise.resolve(null),
    fetchCatalog(),
  ]);

  seller  = profileData.status === "fulfilled" ? profileData.value : null;
  catalog = catalogData.status  === "fulfilled" ? catalogData.value : { products: [] };

  applySeller();
  applyBanners();
  renderProducts();
  updateStats();

  handleRoute();
  window.addEventListener("popstate", handleRoute);

  setTimeout(() => {
    el("app-loader").classList.add("hidden");
  }, 800);
}

/* ── SPA routing por hash ── */
function handleRoute() {
  const hash = window.location.hash;
  const match = hash.match(/^#producto\/(\d+)$/);
  if (match) {
    openProductPage(Number(match[1]));
  } else {
    closeProductPage();
  }
}

/* ════════════════════════════════════════════════
   FETCH
   ════════════════════════════════════════════════ */
async function fetchProfile(code) {
  try {
    const res  = await fetch(`${API}/api/public/profile?code=${code}`);
    const data = await res.json();
    return data.ok ? data.profile : null;
  } catch { return null; }
}

async function fetchCatalog() {
  const res  = await fetch(`${API}/api/public/catalog`);
  const data = await res.json();
  return data.ok ? data : { products: [] };
}

async function fetchProductDetails(productId) {
  try {
    const res  = await fetch(`${API}/api/public/product-details?product_id=${productId}`);
    const data = await res.json();
    return data.ok ? data.details : null;
  } catch { return null; }
}

/* ════════════════════════════════════════════════
   SELLER UI
   ════════════════════════════════════════════════ */
function applySeller() {
  if (!seller) return;

  el("seller-pill-name").textContent = seller.name;
  el("seller-pill").style.display = "flex";

  el("seller-avatar").textContent = getInitials(seller.name);
  el("seller-name").textContent   = seller.name;
  el("seller-code").textContent   = seller.code + " · " + (seller.role === "socio" ? "Socio" : "Distribuidor");
  el("seller-card").style.display = "flex";

  const waBtn = el("seller-wa-btn");
  if (seller.phone) {
    waBtn.href = buildWALink(seller.phone,
      `Hola ${seller.name}, me interesa conocer más sobre los productos LIT Nutrition`);
    waBtn.style.display = "flex";
  } else {
    waBtn.style.display = "none";
  }

  // ── QR del asesor en la seller card ──
  const qrThumb = el("seller-qr-thumb");
  if (qrThumb) {
    if (seller.qr_url) {
      qrThumb.src = seller.qr_url;
      qrThumb.style.display = "block";
      el("seller-qr-wrap")?.style.setProperty("display", "flex");
    } else {
      el("seller-qr-wrap")?.style.setProperty("display", "none");
    }
  }

  el("footer-seller").style.display = "block";
  el("footer-seller-name").textContent = seller.name;
  el("footer-seller-code").textContent = seller.code;

  document.title = `LIT Nutrition · Tienda de ${seller.name}`;
}

/* ── Banners ── */
function applyBanners() {
  el("btn-login").href    = `${APP_URL}/`;
  el("btn-register").href = inviteCode ? `${APP_URL}/?invite=${inviteCode}` : `${APP_URL}/`;
}

/* ════════════════════════════════════════════════
   RENDER PRODUCTOS (CARRUSEL)
   ════════════════════════════════════════════════ */
function renderProducts() {
  const wrap     = el("products-carousel-wrap");
  const products = catalog?.products ?? [];

  if (products.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No hay productos disponibles en este momento.</p>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="carousel-track" id="carousel-track">
      ${products.map((prod, i) => {
        const imgSrc = imgUrl(prod.image_url);
        const imageHtml = imgSrc
          ? `<img class="prod-card-image" src="${imgSrc}" alt="${prod.name}" loading="lazy"
                 onerror="this.parentNode.innerHTML='<div class=\\'prod-card-image-placeholder\\'>💊</div>'">`
          : `<div class="prod-card-image-placeholder">💊</div>`;

        return `
          <div class="prod-card" data-id="${prod.id}" style="animation-delay:${i * 0.06}s;">
            ${imageHtml}
            <div class="prod-card-body">
              <div class="prod-card-name">${prod.name}</div>
              <div class="prod-card-tagline" id="tagline-${prod.id}"></div>
              <div class="prod-card-price-row">
                <div>
                  <span class="prod-card-price-label">Precio público</span>
                  <div class="prod-card-price">${formatBs(prod.precio_publico)}</div>
                </div>
                <button class="prod-buy-btn" data-id="${prod.id}">Comprar</button>
              </div>
            </div>
            <div class="prod-card-footer">
              <button class="prod-detail-btn" data-id="${prod.id}">
                Ver detalles
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>`;
      }).join("")}
    </div>
    <div class="carousel-controls">
      <button class="carousel-btn" id="carousel-prev" aria-label="Anterior">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="carousel-dots" id="carousel-dots">
        ${products.map((_, i) => `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Ir al producto ${i+1}"></button>`).join("")}
      </div>
      <button class="carousel-btn" id="carousel-next" aria-label="Siguiente">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  initCarousel(products.length);

  wrap.addEventListener("click", (e) => {
    const buyBtn    = e.target.closest(".prod-buy-btn");
    const detailBtn = e.target.closest(".prod-detail-btn");
    const card      = e.target.closest(".prod-card");

    if (buyBtn) {
      e.stopPropagation();
      const prod = products.find(p => Number(p.id) === Number(buyBtn.dataset.id));
      if (prod) openBuyModal(prod);
      return;
    }
    if (detailBtn || card) {
      const id = Number((detailBtn || card).dataset.id);
      const prod = products.find(p => Number(p.id) === id);
      if (prod) navigateToProduct(prod);
    }
  });

  products.forEach(prod => {
    fetchProductDetails(prod.id).then(details => {
      if (details?.tagline) {
        const tEl = document.getElementById(`tagline-${prod.id}`);
        if (tEl) tEl.textContent = details.tagline;
      }
    });
  });
}

/* ── Carrusel ── */
let carouselIdx = 0;
let carouselTotal = 0;
let carouselAutoInterval = null;

function initCarousel(total) {
  carouselTotal = total;
  carouselIdx   = 0;

  el("carousel-prev").addEventListener("click", () => { carouselStep(-1); resetAuto(); });
  el("carousel-next").addEventListener("click", () => { carouselStep(1);  resetAuto(); });

  el("carousel-dots").addEventListener("click", (e) => {
    const dot = e.target.closest(".carousel-dot");
    if (dot) { carouselGoto(Number(dot.dataset.idx)); resetAuto(); }
  });

  const track = el("carousel-track");
  let touchStartX = 0;
  track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend",   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { carouselStep(dx < 0 ? 1 : -1); resetAuto(); }
  }, { passive: true });

  resetAuto();
}

function carouselStep(dir) {
  carouselGoto((carouselIdx + dir + carouselTotal) % carouselTotal);
}

function carouselGoto(idx) {
  carouselIdx = idx;
  const track = el("carousel-track");
  if (!track) return;
  const cards = track.querySelectorAll(".prod-card");
  if (cards[idx]) {
    cards[idx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
  const dots = document.querySelectorAll(".carousel-dot");
  dots.forEach((d, i) => d.classList.toggle("active", i === idx));
}

function resetAuto() {
  clearInterval(carouselAutoInterval);
  carouselAutoInterval = setInterval(() => carouselStep(1), 5000);
}

/* ── Stats ── */
function updateStats() {
  el("stat-products").textContent = catalog?.products?.length ?? 0;
}

/* ════════════════════════════════════════════════
   PÁGINA DE DETALLE DE PRODUCTO (SPA)
   ════════════════════════════════════════════════ */
function navigateToProduct(prod) {
  window.history.pushState({}, "", `${window.location.pathname}${window.location.search}#producto/${prod.id}`);
  openProductPage(prod.id);
}

async function openProductPage(productId) {
  const products = catalog?.products ?? [];
  const prod = products.find(p => Number(p.id) === Number(productId));
  if (!prod) { closeProductPage(); return; }

  const page    = el("product-page");
  const content = el("product-page-content");

  page.classList.add("open");
  document.body.style.overflow = "hidden";
  content.innerHTML = renderProductSkeleton();

  const details = await fetchProductDetails(productId);
  content.innerHTML = renderProductDetail(prod, details);

  content.querySelector("#pd-back-btn")?.addEventListener("click", () => {
    window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
    closeProductPage();
  });

  content.querySelector("#pd-buy-btn")?.addEventListener("click", () => {
    openBuyModal(prod);
  });

  content.querySelectorAll(".pd-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      content.querySelectorAll(".pd-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
      content.querySelectorAll(".pd-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.tab === tab));
    });
  });
}

function closeProductPage() {
  const page = el("product-page");
  page.classList.remove("open");
  document.body.style.overflow = "";
}

function renderProductSkeleton() {
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

function renderProductDetail(prod, details) {
  const imgSrc = imgUrl(prod.image_url);

  const benefits    = details?.benefits    ?? [];
  const ingredients = details?.ingredients ?? [];
  const conditions  = details?.conditions  ?? [];
  const refs        = details?.research_refs ?? [];

  return `
    <div class="pd-topbar">
      <button class="pd-back-btn" id="pd-back-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        Volver al catálogo
      </button>
      ${seller ? `
        <div class="pd-seller-mini">
          <span class="pd-seller-dot"></span>
          Asesor: <strong>${seller.name}</strong>
        </div>` : ""}
    </div>

    <div class="pd-hero">
      <div class="pd-hero-image-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${prod.name}" class="pd-hero-image" loading="eager">`
          : `<div class="pd-hero-image-placeholder">💊</div>`}
        <div class="pd-hero-image-overlay"></div>
      </div>
      <div class="pd-hero-content">
        ${details?.tagline ? `<div class="pd-tagline">${details.tagline}</div>` : ""}
        <h1 class="pd-name">${prod.name}</h1>
        ${details?.format ? `<div class="pd-meta-row"><span class="pd-meta-chip">📦 ${details.format}</span>${details.net_content ? `<span class="pd-meta-chip">⚖️ ${details.net_content}</span>` : ""}</div>` : ""}
        <div class="pd-price-row">
          <div>
            <div class="pd-price-label">Precio público</div>
            <div class="pd-price">${formatBs(prod.precio_publico)}</div>
          </div>
          <button class="pd-buy-btn" id="pd-buy-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Pedir ahora
          </button>
        </div>
        ${details?.description ? `<p class="pd-description">${details.description}</p>` : ""}
      </div>
    </div>

    ${benefits.length > 0 ? `
      <div class="pd-section pd-benefits-section">
        <div class="pd-section-label">✦ Beneficios</div>
        <div class="pd-benefits-grid">
          ${benefits.map(b => `
            <div class="pd-benefit-item">
              <div class="pd-benefit-dot"></div>
              <span>${b}</span>
            </div>`).join("")}
        </div>
      </div>` : ""}

    <div class="pd-section pd-tabs-section">
      <div class="pd-tabs">
        ${ingredients.length > 0 ? `<button class="pd-tab-btn active" data-tab="ingredients">Fórmula</button>` : ""}
        ${conditions.length > 0  ? `<button class="pd-tab-btn${ingredients.length === 0 ? " active" : ""}" data-tab="conditions">Indicaciones</button>` : ""}
        ${refs.length > 0        ? `<button class="pd-tab-btn${ingredients.length === 0 && conditions.length === 0 ? " active" : ""}" data-tab="refs">Investigación</button>` : ""}
        ${details?.usage         ? `<button class="pd-tab-btn" data-tab="usage">Uso</button>` : ""}
      </div>

      ${ingredients.length > 0 ? `
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

      ${conditions.length > 0 ? `
        <div class="pd-tab-panel${ingredients.length === 0 ? " active" : ""}" data-tab="conditions">
          <p class="pd-tab-intro">Este producto puede apoyar en el manejo de las siguientes condiciones:</p>
          <div class="pd-conditions-grid">
            ${conditions.map(c => `
              <div class="pd-condition-tag">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ${c}
              </div>`).join("")}
          </div>
          <p class="pd-disclaimer">⚠️ Este producto no reemplaza tratamientos médicos. Consulte a su médico.</p>
        </div>` : ""}

      ${refs.length > 0 ? `
        <div class="pd-tab-panel${ingredients.length === 0 && conditions.length === 0 ? " active" : ""}" data-tab="refs">
          <p class="pd-tab-intro">Respaldado por investigación científica publicada:</p>
          <div class="pd-refs-list">
            ${refs.map(r => `
              <div class="pd-ref">
                <div class="pd-ref-title">${r.title}</div>
                <div class="pd-ref-source">${r.source}</div>
                ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="pd-ref-link">Ver estudio →</a>` : ""}
              </div>`).join("")}
          </div>
        </div>` : ""}

      ${details?.usage ? `
        <div class="pd-tab-panel" data-tab="usage">
          <div class="pd-usage-box">
            <div class="pd-usage-icon">📋</div>
            <div class="pd-usage-text">${details.usage}</div>
          </div>
        </div>` : ""}
    </div>

    ${details?.warning ? `
      <div class="pd-section">
        <div class="pd-warning-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p>${details.warning}</p>
        </div>
      </div>` : ""}

    <div class="pd-section pd-cta-section">
      <button class="pd-buy-btn-full" id="pd-buy-btn-bottom" onclick="document.getElementById('pd-buy-btn').click()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        Pedir ${prod.name}
      </button>
      ${seller?.phone ? `
        <a class="pd-wa-cta" href="${buildWALink(seller.phone, `Hola ${seller.name}! Quiero mas info sobre ${prod.name}`)}" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Consultar por WhatsApp
        </a>` : ""}
    </div>
  `;
}

/* ════════════════════════════════════════════════
   MODAL DE COMPRA
   ════════════════════════════════════════════════ */
function openBuyModal(prod) {
  const modal   = el("buy-modal");
  const content = el("buy-modal-content");
  const hasSeller = seller && seller.phone;
  const hasQR     = seller && seller.qr_url;

  const waMsg  = hasSeller
    ? `Hola ${seller.name}! Vi tu tienda LIT Nutrition y quiero comprar *"${prod.name}"* (${formatBs(prod.precio_publico)}). Esta disponible?`
    : "";
  const waLink = hasSeller ? buildWALink(seller.phone, waMsg) : null;

  content.innerHTML = `
    <div class="bm-product">
      ${prod.image_url
        ? `<img src="${imgUrl(prod.image_url)}" alt="${prod.name}" class="bm-product-img" onerror="this.style.display='none'">`
        : `<div class="bm-product-icon">💊</div>`}
      <div class="bm-product-info">
        <div class="bm-product-name">${prod.name}</div>
        <div class="bm-product-price">${formatBs(prod.precio_publico)}</div>
      </div>
    </div>

    <div class="bm-divider"></div>
    <p class="bm-label">¿Cómo quieres ordenar?</p>

    <div class="bm-options">
      <!-- WhatsApp -->
      <div class="bm-option ${!hasSeller ? "bm-option--disabled" : ""}">
        <div class="bm-option-icon bm-option-icon--wa">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </div>
        <div class="bm-option-body">
          <div class="bm-option-title">Pedir por WhatsApp</div>
          <div class="bm-option-desc">${hasSeller ? `Escríbele a <strong>${seller.name}</strong>` : "Tu asesor no configuró WhatsApp"}</div>
        </div>
        ${hasSeller
          ? `<a class="bm-option-btn bm-option-btn--wa" href="${waLink}" target="_blank" rel="noopener">Abrir →</a>`
          : `<span class="bm-option-btn bm-option-btn--disabled">No disp.</span>`}
      </div>

      <!-- QR de pago del asesor -->
      <div class="bm-option ${!hasQR ? "bm-option--disabled" : ""}">
        <div class="bm-option-icon bm-option-icon--qr">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M17 20h3"/></svg>
        </div>
        <div class="bm-option-body">
          <div class="bm-option-title">QR de pago</div>
          <div class="bm-option-desc">
            ${hasQR
              ? `Escanea el QR de <strong>${seller.name}</strong>`
              : "Tu asesor no configuró QR de pago"}
          </div>
        </div>
        ${hasQR
          ? `<button class="bm-option-btn bm-option-btn--qr" id="bm-toggle-qr">Ver QR</button>`
          : `<span class="bm-option-btn bm-option-btn--disabled">No disp.</span>`}
      </div>
    </div>

    <!-- Panel QR del asesor (real) -->
    ${hasQR ? `
      <div class="bm-qr-panel" id="bm-qr-panel" style="display:none;">
        <img src="${seller.qr_url}"
             alt="QR de pago de ${seller.name}"
             class="bm-qr-img"
             loading="lazy"
             onerror="this.parentElement.innerHTML='<p style=\'color:var(--text-3);font-size:0.8rem;\'>No se pudo cargar el QR</p>'">
        <p class="bm-qr-hint">Escanea para pagar a ${seller.name}</p>
      </div>` : ""}
  `;

  // Toggle QR panel
  content.querySelector("#bm-toggle-qr")?.addEventListener("click", function () {
    const panel = content.querySelector("#bm-qr-panel");
    if (!panel) return;
    const open = panel.style.display !== "none";
    panel.style.display = open ? "none" : "block";
    this.textContent    = open ? "Ver QR" : "Ocultar";
  });

  modal.classList.add("open");
}

function closeBuyModal() {
  el("buy-modal").classList.remove("open");
}

/* ── Header scroll ── */
function initScroll() {
  const header = el("site-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });
}

/* ── Modal cerrar ── */
function initModal() {
  const overlay = el("buy-modal");
  el("buy-modal-close").addEventListener("click", closeBuyModal);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeBuyModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (el("buy-modal").classList.contains("open")) { closeBuyModal(); return; }
      if (el("product-page").classList.contains("open")) {
        window.history.pushState({}, "", `${window.location.pathname}${window.location.search}`);
        closeProductPage();
      }
    }
  });
}

/* ── Main ── */
initScroll();
initModal();
init();