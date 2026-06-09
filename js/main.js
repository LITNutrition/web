/**
 * js/main.js — LIT Nutrition Landing Page
 * Cambios vs versión anterior:
 *  - getCatalog incluye seller_code para obtener stock real
 *  - Cards muestran badge de stock; botón deshabilitado si stock = 0
 *  - Modal de compra: panel QR con upload de comprobante + botón WhatsApp enriquecido
 *  - Envío del comprobante al worker → tabla order_receipts
 */

const API = "https://worker.litsuplementos.workers.dev";
const CLOUDINARY_CLOUD = "dpfuhjysh";   // ← reemplazar

/* ── Estado global ─────────────────────────────────────────────────────────── */
let sellerProfile  = null;   // { code, name, phone, qr_url, role }
let catalogProducts = [];    // productos con seller_stock

/* ── Arranque ──────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite")?.toUpperCase() || null;

  await Promise.all([
    invite ? loadSellerProfile(invite) : Promise.resolve(),
    loadCatalog(invite),
  ]);

  initHeader(invite);
  hideLoader();
  initScrollHeader();
  initBannerLinks(invite);
});

/* ── App loader ─────────────────────────────────────────────────────────────── */
function hideLoader() {
  setTimeout(() => {
    const loader = document.getElementById("app-loader");
    if (loader) loader.classList.add("hidden");
  }, 1300);
}

/* ── Seller profile ─────────────────────────────────────────────────────────── */
async function loadSellerProfile(code) {
  try {
    const res = await fetch(`${API}/api/public/profile?code=${code}`);
    const data = await res.json();
    if (!data.ok) return;

    sellerProfile = data.profile;
    renderSellerUI(data.profile);
  } catch (e) {
    console.warn("No se pudo cargar el perfil del vendedor", e);
  }
}

function renderSellerUI(p) {
  // Header pill
  const pill = document.getElementById("seller-pill");
  const pillName = document.getElementById("seller-pill-name");
  if (pill && pillName) {
    pillName.textContent = p.name;
    pill.style.display = "flex";
  }

  // Hero seller card
  const card      = document.getElementById("seller-card");
  const avatar    = document.getElementById("seller-avatar");
  const nameEl    = document.getElementById("seller-name");
  const codeEl    = document.getElementById("seller-code");
  const waBtn     = document.getElementById("seller-wa-btn");

  if (card) {
    avatar.textContent    = p.name.charAt(0).toUpperCase();
    nameEl.textContent    = p.name;
    codeEl.textContent    = `Código: ${p.code}`;
    card.style.display    = "flex";

    if (p.phone) {
      waBtn.href = `https://wa.me/${p.phone.replace(/\D/g, "")}`;
    } else {
      waBtn.style.display = "none";
    }
  }

  // Footer
  const footerSeller = document.getElementById("footer-seller");
  const footerName   = document.getElementById("footer-seller-name");
  const footerCode   = document.getElementById("footer-seller-code");
  if (footerSeller) {
    footerName.textContent = p.name;
    footerCode.textContent = p.code;
    footerSeller.style.display = "block";
  }
}

/* ── Catálogo ───────────────────────────────────────────────────────────────── */
async function loadCatalog(sellerCode) {
  const wrap = document.getElementById("products-carousel-wrap");
  const url  = sellerCode
    ? `${API}/api/public/catalog?seller_code=${sellerCode}`
    : `${API}/api/public/catalog`;

  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.ok || !data.products?.length) {
      wrap.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>No hay productos disponibles en este momento.</p>
      </div>`;
      return;
    }

    catalogProducts = data.products;

    // Actualizar stat
    const statEl = document.getElementById("stat-products");
    if (statEl) statEl.textContent = catalogProducts.length;

    renderCarousel(catalogProducts, sellerCode);
  } catch (e) {
    console.error("Error cargando catálogo:", e);
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p>No se pudo cargar el catálogo. Intenta de nuevo.</p>
    </div>`;
  }
}

function renderCarousel(products, sellerCode) {
  const wrap = document.getElementById("products-carousel-wrap");

  const trackHTML = `
    <div class="carousel-track" id="carousel-track">
      ${products.map((p, i) => renderProductCard(p, i, sellerCode)).join("")}
    </div>
    <div class="carousel-controls">
      <button class="carousel-btn" id="carousel-prev" aria-label="Anterior">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="carousel-dots" id="carousel-dots"></div>
      <button class="carousel-btn" id="carousel-next" aria-label="Siguiente">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>`;

  wrap.innerHTML = trackHTML;
  initCarouselControls();
}

/* ─── Card de producto ────────────────────────────────────────────────────── */
function renderProductCard(p, index, sellerCode) {
  const stock     = p.seller_stock;          // number | null
  const hasStock  = stock === null || stock > 0;  // null = catálogo sin seller (habilitar)
  const stockZero = stock !== null && stock === 0;

  const priceFormatted = `Bs. ${Number(p.precio_publico).toFixed(2)}`;
  const delay          = `${index * 60}ms`;

  const imageHTML = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name}" class="prod-card-image" loading="lazy">`
    : `<div class="prod-card-image-placeholder">💊</div>`;

  // Badge de stock
  let stockBadge = "";
  if (stock !== null) {
    if (stockZero) {
      stockBadge = `<div class="stock-badge stock-badge--out">Sin stock</div>`;
    } else if (stock <= 5) {
      stockBadge = `<div class="stock-badge stock-badge--low">Últimas ${stock}</div>`;
    } else {
      stockBadge = `<div class="stock-badge stock-badge--ok">${stock} disp.</div>`;
    }
  }

  const buyBtnHTML = stockZero
    ? `<button class="prod-buy-btn prod-buy-btn--disabled" disabled>Sin stock</button>`
    : `<button class="prod-buy-btn" onclick="openBuyModal(${p.id})">Comprar</button>`;

  const detailBtnDisabled = stockZero ? "" : "";

  return `
    <div class="prod-card fade-up" style="animation-delay:${delay}" data-product-id="${p.id}">
      <div class="prod-card-image-wrap" style="position:relative;">
        ${imageHTML}
        ${stockBadge}
      </div>
      <div class="prod-card-body">
        <div class="prod-card-name">${p.name}</div>
        <div class="prod-card-tagline" id="tagline-${p.id}">–</div>
        <div class="prod-card-price-row">
          <div>
            <span class="prod-card-price-label">Precio público</span>
            <span class="prod-card-price">${priceFormatted}</span>
          </div>
          ${buyBtnHTML}
        </div>
      </div>
      <div class="prod-card-footer">
        <button class="prod-detail-btn" onclick="openProductPage(${p.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          Ver detalles
        </button>
      </div>
    </div>`;
}

/* ── Cargar taglines en background ──────────────────────────────────────────── */
// (no bloqueante — mejora progresiva)
function loadTaglines(products) {
  products.forEach(async (p) => {
    try {
      const res  = await fetch(`${API}/api/public/product-details?product_id=${p.id}`);
      const data = await res.json();
      if (data.ok && data.details?.tagline) {
        const el = document.getElementById(`tagline-${p.id}`);
        if (el) el.textContent = data.details.tagline;
      }
    } catch (_) {}
  });
}

/* ── Controles del carrusel ─────────────────────────────────────────────────── */
function initCarouselControls() {
  const track = document.getElementById("carousel-track");
  const dots  = document.getElementById("carousel-dots");
  if (!track) return;

  const cards    = track.querySelectorAll(".prod-card");
  const total    = cards.length;
  const cardW    = 300 + 20; // flex: 0 0 300px + gap 20
  let   current  = 0;

  // Crear dots
  if (dots) {
    dots.innerHTML = "";
    for (let i = 0; i < Math.min(total, 8); i++) {
      const dot = document.createElement("button");
      dot.className = `carousel-dot${i === 0 ? " active" : ""}`;
      dot.setAttribute("aria-label", `Producto ${i + 1}`);
      dot.addEventListener("click", () => scrollTo(i));
      dots.appendChild(dot);
    }
  }

  function scrollTo(idx) {
    current = Math.max(0, Math.min(idx, total - 1));
    track.scrollTo({ left: current * cardW, behavior: "smooth" });
    updateDots();
  }

  function updateDots() {
    if (!dots) return;
    dots.querySelectorAll(".carousel-dot").forEach((d, i) => {
      d.classList.toggle("active", i === current);
    });
  }

  document.getElementById("carousel-prev")?.addEventListener("click", () => scrollTo(current - 1));
  document.getElementById("carousel-next")?.addEventListener("click", () => scrollTo(current + 1));

  track.addEventListener("scroll", () => {
    current = Math.round(track.scrollLeft / cardW);
    updateDots();
  }, { passive: true });

  // Cargar taglines en background ahora que el DOM está listo
  setTimeout(() => loadTaglines(catalogProducts), 200);
}

/* ── Modal de compra ────────────────────────────────────────────────────────── */
// Estado del modal
let activeProductId = null;
let qrPanelOpen     = false;
let uploadedImage   = null; // base64

function openBuyModal(productId) {
  const product = catalogProducts.find(p => p.id === productId);
  if (!product) return;

  // Bloquear si sin stock
  if (product.seller_stock !== null && product.seller_stock === 0) return;

  activeProductId = productId;
  qrPanelOpen     = false;
  uploadedImage   = null;

  renderBuyModalContent(product);

  document.getElementById("buy-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

window.openBuyModal = openBuyModal;

function closeBuyModal() {
  document.getElementById("buy-modal").classList.remove("open");
  document.body.style.overflow = "";
  activeProductId = null;
  uploadedImage   = null;
}

document.getElementById("buy-modal-close")?.addEventListener("click", closeBuyModal);
document.getElementById("buy-modal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeBuyModal();
});

function renderBuyModalContent(product) {
  const hasWA  = sellerProfile?.phone;
  const hasQR  = sellerProfile?.qr_url;
  const hasSeller = !!sellerProfile;

  const priceFormatted = `Bs. ${Number(product.precio_publico).toFixed(2)}`;

  const imageHTML = product.image_url
    ? `<img src="${product.image_url}" alt="${product.name}" class="bm-product-img">`
    : `<div class="bm-product-icon">💊</div>`;

  const waOptionHTML = hasSeller && hasWA ? `
    <div class="bm-option" id="bm-wa-option">
      <div class="bm-option-icon bm-option-icon--wa">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>
      <div class="bm-option-body">
        <div class="bm-option-title">WhatsApp directo</div>
        <div class="bm-option-desc">${sellerProfile.name} · ${sellerProfile.phone}</div>
      </div>
      <a id="bm-wa-link" href="#" target="_blank" rel="noopener" class="bm-option-btn bm-option-btn--wa">
        Escribir
      </a>
    </div>` : "";

  const qrOptionHTML = `
    <div class="bm-option" id="bm-qr-option" style="flex-direction:column;gap:0;">
      <div style="display:flex;align-items:center;gap:12px;width:100%;">
        <div class="bm-option-icon bm-option-icon--qr">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3M18 22h-4v-2"/>
          </svg>
        </div>
        <div class="bm-option-body">
          <div class="bm-option-title">Pagar con QR / transferencia</div>
          <div class="bm-option-desc">Sube tu comprobante para confirmar el pedido</div>
        </div>
        <button class="bm-option-btn bm-option-btn--qr" id="bm-toggle-qr">
          ${hasQR || hasSeller ? "Ver QR" : "Subir"}
        </button>
      </div>

      <!-- Panel QR + upload -->
      <div id="bm-qr-panel" style="display:none;width:100%;padding-top:16px;">
        ${hasQR ? `
          <div style="text-align:center;margin-bottom:14px;">
            <img src="${sellerProfile.qr_url}" alt="QR de pago" class="bm-qr-img">
            <p class="bm-qr-hint">Escanea el QR o realiza tu transferencia</p>
          </div>` : ""}

        <!-- Upload comprobante -->
        <div class="receipt-upload-box" id="receipt-upload-box">
          <div class="receipt-upload-header">
            <span class="receipt-upload-icon">📎</span>
            <div>
              <div class="receipt-upload-title">Si ya cancelaste, sube tu comprobante de pago</div>
              <div class="receipt-upload-sub">JPG, PNG o PDF · máx. 5 MB</div>
            </div>
          </div>

          <!-- Selector de cantidad -->
          <div class="receipt-qty-row">
            <label class="receipt-qty-label">Cantidad:</label>
            <div class="receipt-qty-controls">
              <button type="button" class="qty-btn" id="qty-minus">−</button>
              <span id="qty-display">1</span>
              <button type="button" class="qty-btn" id="qty-plus">+</button>
            </div>
            <div class="receipt-subtotal" id="receipt-subtotal">${priceFormatted}</div>
          </div>

          <label class="receipt-file-label" id="receipt-file-label" for="receipt-file-input">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Seleccionar imagen
            <input type="file" id="receipt-file-input" accept="image/*,application/pdf" style="display:none;">
          </label>

          <div id="receipt-preview-wrap" style="display:none;margin-top:10px;text-align:center;">
            <img id="receipt-preview-img" src="" alt="Comprobante" style="max-width:100%;max-height:160px;border-radius:8px;border:1px solid var(--border);">
            <button type="button" class="receipt-remove-btn" id="receipt-remove-btn">✕ Quitar</button>
          </div>

          <button class="btn-receipt-submit" id="btn-receipt-submit" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            Enviar comprobante
          </button>

          <div id="receipt-result" style="display:none;"></div>
        </div>
      </div>
    </div>`;

  document.getElementById("buy-modal-content").innerHTML = `
    <div class="bm-product">
      ${imageHTML}
      <div class="bm-product-info">
        <div class="bm-product-name">${product.name}</div>
        <div class="bm-product-price">${priceFormatted}</div>
      </div>
    </div>
    <hr class="bm-divider">
    <div class="bm-label">¿Cómo quieres adquirirlo?</div>
    <div class="bm-options">
      ${waOptionHTML}
      ${qrOptionHTML}
    </div>`;

  // Vincular eventos
  initModalEvents(product);
}

/* ── Eventos internos del modal ─────────────────────────────────────────────── */
function initModalEvents(product) {
  let quantity = 1;
  const maxQty = product.seller_stock ?? 99;

  const unitPrice    = Number(product.precio_publico);
  const subtotalEl   = document.getElementById("receipt-subtotal");
  const qtyDisplay   = document.getElementById("qty-display");
  const toggleQrBtn  = document.getElementById("bm-toggle-qr");
  const qrPanel      = document.getElementById("bm-qr-panel");
  const fileInput    = document.getElementById("receipt-file-input");
  const previewWrap  = document.getElementById("receipt-preview-wrap");
  const previewImg   = document.getElementById("receipt-preview-img");
  const removeBtn    = document.getElementById("receipt-remove-btn");
  const submitBtn    = document.getElementById("btn-receipt-submit");
  const resultDiv    = document.getElementById("receipt-result");
  const waLink       = document.getElementById("bm-wa-link");

  // Actualizar subtotal
  function updateSubtotal() {
    subtotalEl.textContent = `Bs. ${(unitPrice * quantity).toFixed(2)}`;
    qtyDisplay.textContent = quantity;
    updateWaLink(); // rearmar mensaje WA con nueva cantidad
  }

  // Controles de cantidad
  document.getElementById("qty-minus")?.addEventListener("click", () => {
    if (quantity > 1) { quantity--; updateSubtotal(); }
  });
  document.getElementById("qty-plus")?.addEventListener("click", () => {
    if (quantity < maxQty) { quantity++; updateSubtotal(); }
  });

  // Toggle panel QR
  toggleQrBtn?.addEventListener("click", () => {
    qrPanelOpen = !qrPanelOpen;
    qrPanel.style.display = qrPanelOpen ? "block" : "none";
    toggleQrBtn.textContent = qrPanelOpen ? "Cerrar" : (sellerProfile?.qr_url ? "Ver QR" : "Subir");
  });

  // Upload de imagen
  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máx. 5 MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      uploadedImage = ev.target.result; // base64 completo con prefijo data:...
      previewImg.src = uploadedImage;
      previewWrap.style.display = "block";
      submitBtn.disabled = false;
      resultDiv.style.display = "none";
    };
    reader.readAsDataURL(file);
  });

  removeBtn?.addEventListener("click", () => {
    uploadedImage = null;
    fileInput.value = "";
    previewWrap.style.display = "none";
    submitBtn.disabled = true;
  });

  // Enviar comprobante
  submitBtn?.addEventListener("click", async () => {
    if (!uploadedImage || !sellerProfile) return;

    submitBtn.disabled   = true;
    submitBtn.textContent = "Enviando…";

    try {
      const body = {
        seller_code:  sellerProfile.code,
        product_id:   product.id,
        product_name: product.name,
        quantity,
        unit_price:   unitPrice,
        receipt_image: uploadedImage,
      };

      const res  = await fetch(`${API}/api/order-receipts`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Error al enviar");

      // Éxito
      resultDiv.style.display = "block";
      resultDiv.innerHTML = `
        <div class="receipt-success">
          <span class="receipt-success-icon">✅</span>
          <div>
            <div class="receipt-success-title">¡Comprobante enviado!</div>
            <div class="receipt-success-tx">Nº de transacción: <strong>${data.tx_id}</strong></div>
            <div class="receipt-success-sub">Guarda este número. El vendedor lo revisará pronto.</div>
          </div>
        </div>`;

      submitBtn.textContent = "Enviado";

      // También enviar por WA al vendedor si tiene teléfono
      if (sellerProfile?.phone) {
        const waUrl = buildWaMessageForReceipt(product, quantity, unitPrice, data.tx_id, data.created_at);
        window.open(waUrl, "_blank");
      }

      // Actualizar stock en UI sin recargar
      const updated = catalogProducts.find(p => p.id === product.id);
      if (updated && updated.seller_stock !== null) {
        // El stock se descuenta al CONFIRMAR, no al subir comprobante,
        // pero podemos refrescar para mostrar estado real
        refreshProductStock(product.id, sellerProfile.code);
      }

    } catch (err) {
      resultDiv.style.display  = "block";
      resultDiv.innerHTML      = `<div class="receipt-error">⚠️ ${err.message}</div>`;
      submitBtn.disabled       = false;
      submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Reintentar`;
    }
  });

  // Armar link de WhatsApp
  function updateWaLink() {
    if (!waLink || !sellerProfile?.phone) return;
    waLink.href = buildWaMessageDirect(product, quantity, unitPrice);
  }

  updateWaLink();
}

/* ── Constructores de mensajes WhatsApp ─────────────────────────────────────── */
function buildWaMessageDirect(product, quantity, unitPrice) {
  if (!sellerProfile?.phone) return "#";
  const subtotal = (unitPrice * quantity).toFixed(2);
  const msg = encodeURIComponent(
    `Hola ${sellerProfile.name} (${sellerProfile.code}) 👋\n` +
    `Quiero consultar sobre:\n\n` +
    `📦 Producto: ${product.name}\n` +
    `🔢 Cantidad: ${quantity}\n` +
    `💰 Precio unit.: Bs. ${Number(unitPrice).toFixed(2)}\n` +
    `💵 Subtotal: Bs. ${subtotal}\n\n` +
    `¿Cómo procedo con el pago?`
  );
  return `https://wa.me/${sellerProfile.phone.replace(/\D/g, "")}?text=${msg}`;
}

function buildWaMessageForReceipt(product, quantity, unitPrice, txId, createdAt) {
  if (!sellerProfile?.phone) return "#";

  // Formatear fecha Bolivia (el servidor ya devuelve hora GMT-4)
  const subtotal = (unitPrice * quantity).toFixed(2);
  const msg = encodeURIComponent(
    `✅ *COMPROBANTE DE PAGO SUBIDO*\n\n` +
    `🔖 Nº Transacción: *${txId}*\n` +
    `🕐 Fecha/Hora (BO): ${createdAt}\n\n` +
    `📦 Producto: ${product.name}\n` +
    `🔢 Cantidad: ${quantity}\n` +
    `💰 Precio unit.: Bs. ${Number(unitPrice).toFixed(2)}\n` +
    `💵 *Total: Bs. ${subtotal}*\n\n` +
    `Vendedor: ${sellerProfile.name} · ${sellerProfile.code}\n\n` +
    `Ya subí el comprobante al sistema. Por favor verifica el pago.`
  );
  return `https://wa.me/${sellerProfile.phone.replace(/\D/g, "")}?text=${msg}`;
}

/* ── Refrescar stock de un producto en la UI ────────────────────────────────── */
async function refreshProductStock(productId, sellerCode) {
  try {
    const res  = await fetch(`${API}/api/public/catalog?seller_code=${sellerCode}`);
    const data = await res.json();
    if (!data.ok) return;

    const updated = data.products.find(p => p.id === productId);
    if (!updated) return;

    // Actualizar en memoria
    const idx = catalogProducts.findIndex(p => p.id === productId);
    if (idx !== -1) catalogProducts[idx].seller_stock = updated.seller_stock;

    // Actualizar DOM de esa card
    const card      = document.querySelector(`[data-product-id="${productId}"]`);
    if (!card) return;

    const wrap      = card.querySelector(".prod-card-image-wrap");
    const buyBtn    = card.querySelector(".prod-buy-btn");
    const stock     = updated.seller_stock;

    // Actualizar badge
    const oldBadge = wrap.querySelector(".stock-badge");
    if (oldBadge) oldBadge.remove();

    if (stock !== null) {
      const badge = document.createElement("div");
      if (stock === 0) {
        badge.className   = "stock-badge stock-badge--out";
        badge.textContent = "Sin stock";
        buyBtn.disabled   = true;
        buyBtn.className  = "prod-buy-btn prod-buy-btn--disabled";
        buyBtn.textContent = "Sin stock";
      } else if (stock <= 5) {
        badge.className   = "stock-badge stock-badge--low";
        badge.textContent = `Últimas ${stock}`;
      } else {
        badge.className   = "stock-badge stock-badge--ok";
        badge.textContent = `${stock} disp.`;
      }
      wrap.appendChild(badge);
    }
  } catch (_) {}
}

/* ── Página de detalle de producto ──────────────────────────────────────────── */
window.openProductPage = async function(productId) {
  const page    = document.getElementById("product-page");
  const content = document.getElementById("product-page-content");

  // Skeleton
  content.innerHTML = `
    <div class="pd-skeleton">
      <div class="pd-skel-img"></div>
      <div class="pd-skel-body">
        <div class="pd-skel-line" style="height:12px;width:60%;margin-bottom:12px;"></div>
        <div class="pd-skel-line" style="height:32px;width:80%;margin-bottom:20px;"></div>
        <div class="pd-skel-line" style="height:14px;width:100%;margin-bottom:8px;"></div>
        <div class="pd-skel-line" style="height:14px;width:90%;"></div>
      </div>
    </div>`;

  page.classList.add("open");
  document.body.style.overflow = "hidden";

  try {
    const res  = await fetch(`${API}/api/public/product-details?product_id=${productId}`);
    const data = await res.json();
    if (!data.ok) throw new Error("No se encontraron detalles");

    const d       = data.details;
    const product = catalogProducts.find(p => p.id === productId) || {};
    const stock   = product.seller_stock;
    const stockZero = stock !== null && stock === 0;

    content.innerHTML = buildProductPageHTML(d, product, stockZero);
    initProductPageEvents(productId, stockZero);
  } catch (e) {
    content.innerHTML = `
      <div class="pd-topbar">
        <button class="pd-back-btn" onclick="closeProductPage()">← Volver</button>
      </div>
      <div class="empty-state" style="padding-top:80px;">
        <div class="empty-state-icon">😕</div>
        <p>No hay información detallada para este producto.</p>
      </div>`;
  }
};

window.closeProductPage = function() {
  document.getElementById("product-page").classList.remove("open");
  document.body.style.overflow = "";
};

function buildProductPageHTML(d, product, stockZero) {
  const priceFormatted = `Bs. ${Number(product.precio_publico ?? d.precio_publico).toFixed(2)}`;

  const imageSection = d.image_url
    ? `<img src="${d.image_url}" alt="${d.name}" class="pd-hero-image">`
    : `<div class="pd-hero-image-placeholder">💊</div>`;

  const benefitsHTML = (d.benefits || []).map(b =>
    `<div class="pd-benefit-item"><div class="pd-benefit-dot"></div><span>${b}</span></div>`
  ).join("") || "<p style='color:var(--text-3);font-size:0.85rem;'>Próximamente.</p>";

  const ingredientsHTML = (d.ingredients || []).map(i => `
    <div class="pd-ingredient">
      <div class="pd-ingredient-header">
        <span class="pd-ingredient-name">${i.name}</span>
        ${i.amount ? `<span class="pd-ingredient-amount">${i.amount}</span>` : ""}
      </div>
      ${i.note ? `<div class="pd-ingredient-note">${i.note}</div>` : ""}
    </div>`).join("") || "<p style='color:var(--text-3);font-size:0.85rem;'>Sin información.</p>";

  const conditionsHTML = (d.conditions || []).map(c =>
    `<div class="pd-condition-tag">✓ ${c}</div>`).join("") || "";

  const refsHTML = (d.research_refs || []).map(r => `
    <div class="pd-ref">
      <div class="pd-ref-title">${r.title}</div>
      <div class="pd-ref-source">${r.source}</div>
      ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" class="pd-ref-link">Ver estudio →</a>` : ""}
    </div>`).join("") || "";

  const buyBtnHTML = stockZero
    ? `<button class="pd-buy-btn" disabled style="opacity:0.5;cursor:not-allowed;">Sin stock</button>`
    : `<button class="pd-buy-btn" onclick="closeProductPage(); setTimeout(()=>openBuyModal(${product.id}),300);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        Comprar
      </button>`;

  const buyBtnFullHTML = stockZero
    ? `<button class="pd-buy-btn-full" disabled style="opacity:0.5;cursor:not-allowed;">Sin stock disponible</button>`
    : `<button class="pd-buy-btn-full" onclick="closeProductPage(); setTimeout(()=>openBuyModal(${product.id}),300);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        Adquirir producto
      </button>`;

  return `
    <!-- Topbar -->
    <div class="pd-topbar">
      <button class="pd-back-btn" onclick="closeProductPage()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Volver
      </button>
      ${sellerProfile ? `<div class="pd-seller-mini"><div class="pd-seller-dot"></div>${sellerProfile.name}</div>` : ""}
    </div>

    <!-- Hero -->
    <div class="pd-hero">
      <div class="pd-hero-image-wrap">
        ${imageSection}
        <div class="pd-hero-image-overlay"></div>
      </div>
      <div class="pd-hero-content">
        ${d.tagline ? `<div class="pd-tagline">${d.tagline}</div>` : ""}
        <div class="pd-name">${d.name}</div>
        ${d.format || d.net_content ? `
          <div class="pd-meta-row">
            ${d.format ? `<span class="pd-meta-chip">${d.format}</span>` : ""}
            ${d.net_content ? `<span class="pd-meta-chip">${d.net_content}</span>` : ""}
          </div>` : ""}
        <div class="pd-price-row">
          <div>
            <div class="pd-price-label">Precio público</div>
            <div class="pd-price">${priceFormatted}</div>
          </div>
          ${buyBtnHTML}
        </div>
        ${d.description ? `<p class="pd-description">${d.description}</p>` : ""}
      </div>
    </div>

    <!-- Beneficios -->
    ${(d.benefits || []).length > 0 ? `
    <div class="pd-section pd-benefits-section">
      <div class="pd-section-label">Beneficios</div>
      <div class="pd-benefits-grid">${benefitsHTML}</div>
    </div>` : ""}

    <!-- Tabs -->
    <div class="pd-section pd-tabs-section">
      <div class="pd-section-label">Información del producto</div>
      <div class="pd-tabs">
        <button class="pd-tab-btn active" data-tab="ingredients">Ingredientes</button>
        ${conditionsHTML ? `<button class="pd-tab-btn" data-tab="conditions">Condiciones</button>` : ""}
        ${d.usage ? `<button class="pd-tab-btn" data-tab="usage">Modo de uso</button>` : ""}
        ${refsHTML ? `<button class="pd-tab-btn" data-tab="research">Referencias</button>` : ""}
      </div>

      <div class="pd-tab-panel active" data-panel="ingredients">
        <div class="pd-ingredients-list">${ingredientsHTML}</div>
      </div>
      ${conditionsHTML ? `
      <div class="pd-tab-panel" data-panel="conditions">
        <div class="pd-conditions-grid">${conditionsHTML}</div>
        <div class="pd-disclaimer">Solo informativo. Consulta a un profesional de salud.</div>
      </div>` : ""}
      ${d.usage ? `
      <div class="pd-tab-panel" data-panel="usage">
        <div class="pd-usage-box">
          <div class="pd-usage-icon">💡</div>
          <div class="pd-usage-text">${d.usage}</div>
        </div>
      </div>` : ""}
      ${refsHTML ? `
      <div class="pd-tab-panel" data-panel="research">
        <div class="pd-refs-list">${refsHTML}</div>
      </div>` : ""}
    </div>

    ${d.warning ? `
    <div class="pd-section">
      <div class="pd-warning-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>${d.warning}</span>
      </div>
    </div>` : ""}

    <!-- CTA final -->
    <div class="pd-cta-section">
      ${buyBtnFullHTML}
      ${sellerProfile?.phone ? `
        <a href="${buildWaMessageDirect({ name: d.name }, 1, Number(product.precio_publico))}" 
           target="_blank" rel="noopener" class="pd-wa-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Consultar por WhatsApp
        </a>` : ""}
    </div>`;
}

function initProductPageEvents(productId, stockZero) {
  // Tabs
  const tabBtns   = document.querySelectorAll(".pd-tab-btn");
  const tabPanels = document.querySelectorAll(".pd-tab-panel");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-panel="${tab}"]`)?.classList.add("active");
    });
  });
}

/* ── Header scroll ──────────────────────────────────────────────────────────── */
function initScrollHeader() {
  const header = document.getElementById("site-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });
}

/* ── Header CTA / init ──────────────────────────────────────────────────────── */
function initHeader(invite) {
  // nada extra si no hay invite
}

/* ── Banner links ───────────────────────────────────────────────────────────── */
function initBannerLinks(invite) {
  const base = "https://plan-5y4.pages.dev"; // URL del backoffice
  document.getElementById("btn-login")?.setAttribute("href", `${base}/login`);
  document.getElementById("btn-register")?.setAttribute(
    "href",
    invite ? `${base}/register?invite=${invite}` : `${base}/register`
  );
}