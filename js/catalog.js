/**
 * js/catalog.js — LIT Nutrition
 * Carrusel de productos y modal de compra con comprobante de pago.
 */

import {
  state, el, api, API,
  imgUrl, formatBs, buildWALink,
  getStock, isOutOfStock, stockBadgeHtml,
} from "./core.js";
import { navigateToProduct } from "./product-page.js";

/* ── Render del carrusel ─────────────────────────────────────────────────── */
export function renderProducts() {
  const wrap     = el("products-carousel-wrap");
  const products = state.catalog?.products ?? [];

  if (!wrap) return;

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
        const imgSrc     = imgUrl(prod.image_url);
        const outOfStock = isOutOfStock(prod.id);
        const imageHtml  = imgSrc
          ? `<img class="prod-card-image" src="${imgSrc}" alt="${prod.name}" loading="lazy"
                 onerror="this.parentNode.innerHTML='<div class=\\'prod-card-image-placeholder\\'>💊</div>'">`
          : `<div class="prod-card-image-placeholder">💊</div>`;

        return `
          <div class="prod-card${outOfStock ? " prod-card--oos" : ""}"
               data-id="${prod.id}"
               style="animation-delay:${i * 0.06}s;">
            <div class="prod-card-image-wrap">
              ${imageHtml}
              ${stockBadgeHtml(prod.id)}
            </div>
            <div class="prod-card-body">
              <div class="prod-card-name">${prod.name}</div>
              <div class="prod-card-tagline" id="tagline-${prod.id}"></div>
              <div class="prod-card-price-row">
                <div>
                  <span class="prod-card-price-label">Precio público</span>
                  <div class="prod-card-price">${formatBs(prod.precio_publico)}</div>
                </div>
                <button class="prod-buy-btn${outOfStock ? " prod-buy-btn--disabled" : ""}"
                  data-id="${prod.id}" ${outOfStock ? "disabled" : ""}>
                  ${outOfStock ? "Sin stock" : "Comprar"}
                </button>
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
        ${products.map((_, i) =>
          `<button class="carousel-dot${i === 0 ? " active" : ""}" data-idx="${i}" aria-label="Producto ${i+1}"></button>`
        ).join("")}
      </div>
      <button class="carousel-btn" id="carousel-next" aria-label="Siguiente">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  _initCarousel(products.length);

  // Delegación de eventos
  wrap.addEventListener("click", (e) => {
    const buyBtn    = e.target.closest(".prod-buy-btn");
    const detailBtn = e.target.closest(".prod-detail-btn");
    const card      = e.target.closest(".prod-card");

    if (buyBtn && !buyBtn.disabled) {
      e.stopPropagation();
      const prod = products.find(p => Number(p.id) === Number(buyBtn.dataset.id));
      if (prod) openBuyModal(prod);
      return;
    }
    if (detailBtn || card) {
      const id   = Number((detailBtn || card).dataset.id);
      const prod = products.find(p => Number(p.id) === id);
      if (prod) navigateToProduct(prod);
    }
  });

  // Carga lazy de taglines
  products.forEach(prod => {
    api.get(`/api/public/product-details?product_id=${prod.id}`).then(data => {
      if (data.details?.tagline) {
        const tEl = document.getElementById(`tagline-${prod.id}`);
        if (tEl) tEl.textContent = data.details.tagline;
      }
    });
  });

  // Stat de productos
  const statEl = el("stat-products");
  if (statEl) statEl.textContent = products.length;
}

/* ── Carrusel ────────────────────────────────────────────────────────────── */
let _carouselIdx      = 0;
let _carouselTotal    = 0;
let _carouselInterval = null;

function _initCarousel(total) {
  _carouselTotal = total;
  _carouselIdx   = 0;

  el("carousel-prev")?.addEventListener("click", () => { _carouselStep(-1); _resetAuto(); });
  el("carousel-next")?.addEventListener("click", () => { _carouselStep(1);  _resetAuto(); });

  el("carousel-dots")?.addEventListener("click", (e) => {
    const dot = e.target.closest(".carousel-dot");
    if (dot) { _carouselGoto(Number(dot.dataset.idx)); _resetAuto(); }
  });

  const track = el("carousel-track");
  let touchStartX = 0;
  track?.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track?.addEventListener("touchend",   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { _carouselStep(dx < 0 ? 1 : -1); _resetAuto(); }
  }, { passive: true });

  _resetAuto();
}

function _carouselStep(dir) {
  _carouselGoto((_carouselIdx + dir + _carouselTotal) % _carouselTotal);
}

function _carouselGoto(idx) {
  _carouselIdx = idx;
  const track = el("carousel-track");
  if (!track) return;
  const cards = track.querySelectorAll(".prod-card");
  cards[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  document.querySelectorAll(".carousel-dot").forEach((d, i) =>
    d.classList.toggle("active", i === idx)
  );
}

function _resetAuto() {
  clearInterval(_carouselInterval);
  _carouselInterval = setInterval(() => _carouselStep(1), 5000);
}

/* ── Modal de compra ─────────────────────────────────────────────────────── */
export function openBuyModal(prod) {
  const modal   = el("buy-modal");
  const content = el("buy-modal-content");
  if (!modal || !content) return;

  const hasSeller = state.seller && state.seller.phone;
  const hasQR     = state.seller && state.seller.qr_url;
  const stockQty  = getStock(prod.id);

  const waMsg  = hasSeller
    ? `Hola ${state.seller.name}! Vi tu tienda LIT Nutrition y quiero comprar *"${prod.name}"* (${formatBs(prod.precio_publico)}). Está disponible?`
    : "";
  const waLink = hasSeller ? buildWALink(state.seller.phone, waMsg) : null;

  content.innerHTML = _renderModalContent(prod, { hasSeller, hasQR, stockQty, waLink });

  // Toggle QR
  content.querySelector("#bm-toggle-qr")?.addEventListener("click", function () {
    const panel = content.querySelector("#bm-qr-panel");
    if (!panel) return;
    const open = panel.style.display !== "none";
    panel.style.display = open ? "none" : "block";
    this.textContent = open ? "Ver QR" : "Ocultar";
  });

  // Lógica de cantidad + comprobante
  if (hasSeller || hasQR) {
    _bindReceiptLogic(content, prod, { hasSeller, hasQR, stockQty });
  }

  modal.classList.add("open");
}

export function closeBuyModal() {
  el("buy-modal")?.classList.remove("open");
}

export function initModalEvents() {
  const overlay = el("buy-modal");
  el("buy-modal-close")?.addEventListener("click", closeBuyModal);
  overlay?.addEventListener("click", e => { if (e.target === overlay) closeBuyModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeBuyModal();
  });
}

/* ── HTML del modal ──────────────────────────────────────────────────────── */
function _renderModalContent(prod, { hasSeller, hasQR, stockQty, waLink }) {
  const WA_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  return `
    <div class="bm-product">
      ${prod.image_url
        ? `<img src="${imgUrl(prod.image_url)}" alt="${prod.name}" class="bm-product-img" onerror="this.style.display='none'">`
        : `<div class="bm-product-icon">💊</div>`}
      <div class="bm-product-info">
        <div class="bm-product-name">${prod.name}</div>
        <div class="bm-product-price">${formatBs(prod.precio_publico)}</div>
        ${stockQty !== null && stockQty <= 3 && stockQty > 0
          ? `<div style="font-size:0.72rem;color:#e8a23a;margin-top:3px;">🔥 Últimas ${stockQty} unidades</div>`
          : ""}
      </div>
    </div>

    <div class="bm-divider"></div>
    <p class="bm-label">¿Cómo quieres ordenar?</p>

    <div class="bm-options">
      <div class="bm-option ${!hasSeller ? "bm-option--disabled" : ""}">
        <div class="bm-option-icon bm-option-icon--wa">${WA_ICON}</div>
        <div class="bm-option-body">
          <div class="bm-option-title">Pedir por WhatsApp</div>
          <div class="bm-option-desc">${hasSeller ? `Escríbele a <strong>${state.seller.name}</strong>` : "Tu asesor no configuró WhatsApp"}</div>
        </div>
        ${hasSeller
          ? `<a class="bm-option-btn bm-option-btn--wa" href="${waLink}" target="_blank" rel="noopener">Abrir →</a>`
          : `<span class="bm-option-btn bm-option-btn--disabled">No disp.</span>`}
      </div>

      <div class="bm-option ${!hasQR ? "bm-option--disabled" : ""}">
        <div class="bm-option-icon bm-option-icon--qr">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M17 20h3"/></svg>
        </div>
        <div class="bm-option-body">
          <div class="bm-option-title">QR de pago</div>
          <div class="bm-option-desc">
            ${hasQR ? `Escanea el QR de <strong>${state.seller.name}</strong>` : "Tu asesor no configuró QR de pago"}
          </div>
        </div>
        ${hasQR
          ? `<button class="bm-option-btn bm-option-btn--qr" id="bm-toggle-qr">Ver QR</button>`
          : `<span class="bm-option-btn bm-option-btn--disabled">No disp.</span>`}
      </div>
    </div>

    ${hasQR ? `
      <div class="bm-qr-panel" id="bm-qr-panel" style="display:none;">
        <img src="${state.seller.qr_url}" alt="QR de pago de ${state.seller.name}"
             class="bm-qr-img" loading="lazy"
             onerror="this.parentElement.innerHTML='<p style=\'color:var(--text-3);font-size:0.8rem;\'>No se pudo cargar el QR</p>'">
        <p class="bm-qr-hint">Escanea para pagar a ${state.seller.name}</p>
      </div>` : ""}

    ${(hasSeller || hasQR) ? `
      <div class="bm-divider" style="margin-top:20px;"></div>
      <div class="bm-receipt-section">
        <div class="bm-receipt-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Si ya cancelaste, sube tu comprobante de pago
        </div>
        <p class="bm-receipt-sub">El asesor verificará el pago y confirmará tu pedido.</p>

        <div class="bm-receipt-field">
          <label class="bm-receipt-label">Cantidad</label>
          <div class="bm-qty-row">
            <button class="bm-qty-btn" id="bm-qty-minus">−</button>
            <span class="bm-qty-val" id="bm-qty-val">1</span>
            <button class="bm-qty-btn" id="bm-qty-plus">+</button>
            <span class="bm-qty-stock" id="bm-qty-stock">${stockQty !== null ? `(máx. ${stockQty})` : ""}</span>
          </div>
        </div>

        <div class="bm-receipt-field">
          <div class="bm-subtotal-row">
            <span class="bm-receipt-label" style="margin-bottom:0;">Total a pagar</span>
            <span class="bm-subtotal-val" id="bm-subtotal">${formatBs(prod.precio_publico)}</span>
          </div>
        </div>

        <div class="bm-receipt-field">
          <label class="bm-receipt-label">Tu nombre (opcional)</label>
          <input type="text" id="bm-buyer-name" class="bm-buyer-name-input"
            placeholder="Ej: María García" maxlength="80" autocomplete="name">
        </div>

        <div class="bm-receipt-field">
          <label class="bm-receipt-label">Comprobante de pago</label>
          <div class="bm-upload-area" id="bm-upload-area">
            <input type="file" id="bm-file-input" accept="image/*" style="display:none;">
            <div class="bm-upload-placeholder" id="bm-upload-placeholder">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Toca para subir imagen</span>
              <span style="font-size:0.72rem;color:var(--text-3);">JPG, PNG o WEBP — máx. 5MB</span>
            </div>
            <img id="bm-preview-img" style="display:none;width:100%;border-radius:8px;max-height:180px;object-fit:contain;" alt="Preview">
          </div>
        </div>

        ${hasSeller ? `
          <div class="bm-receipt-wa-note" id="bm-receipt-wa-note" style="display:none;">
            ${WA_ICON.replace('width="22" height="22"', 'width="14" height="14"').replace('style="flex-shrink:0;"','')}
            <span id="bm-wa-note-text">Después de enviar, avisa al asesor por WhatsApp con tu número de transacción.</span>
          </div>` : ""}

        <button class="bm-send-btn" id="bm-send-btn" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Enviar comprobante
        </button>

        <div class="bm-send-result" id="bm-send-result" style="display:none;"></div>
      </div>` : ""}
  `;
}

/* ── Lógica de comprobante ───────────────────────────────────────────────── */
function _bindReceiptLogic(content, prod, { hasSeller, hasQR, stockQty }) {
  let qty            = 1;
  const maxQty       = stockQty !== null ? stockQty : 99;
  let selectedBase64 = null;
  let selectedMime   = null;

  const updateSubtotal = () => {
    const sub = content.querySelector("#bm-subtotal");
    if (sub) sub.textContent = formatBs(prod.precio_publico * qty);
  };

  const checkReady = () => {
    const btn = content.querySelector("#bm-send-btn");
    if (btn) btn.disabled = !selectedBase64;
  };

  content.querySelector("#bm-qty-minus")?.addEventListener("click", () => {
    if (qty > 1) { qty--; content.querySelector("#bm-qty-val").textContent = qty; updateSubtotal(); }
  });
  content.querySelector("#bm-qty-plus")?.addEventListener("click", () => {
    if (qty < maxQty) { qty++; content.querySelector("#bm-qty-val").textContent = qty; updateSubtotal(); }
  });

  const uploadArea = content.querySelector("#bm-upload-area");
  const fileInput  = content.querySelector("#bm-file-input");

  uploadArea?.addEventListener("click", () => fileInput?.click());
  uploadArea?.addEventListener("dragover",  e => { e.preventDefault(); uploadArea.classList.add("bm-upload-area--drag"); });
  uploadArea?.addEventListener("dragleave", () => uploadArea.classList.remove("bm-upload-area--drag"));
  uploadArea?.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("bm-upload-area--drag");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  fileInput?.addEventListener("change", e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  function handleFile(file) {
    if (!file.type.startsWith("image/")) { showResult("Solo se aceptan imágenes.", "error"); return; }
    if (file.size > 5 * 1024 * 1024)    { showResult("Máximo 5MB.", "error"); return; }
    selectedMime = file.type;
    const reader = new FileReader();
    reader.onload = (ev) => {
      selectedBase64 = ev.target.result;
      const preview     = content.querySelector("#bm-preview-img");
      const placeholder = content.querySelector("#bm-upload-placeholder");
      if (preview && placeholder) {
        preview.src = selectedBase64;
        preview.style.display     = "block";
        placeholder.style.display = "none";
      }
      const waNote = content.querySelector("#bm-receipt-wa-note");
      if (waNote) waNote.style.display = "flex";
      checkReady();
    };
    reader.readAsDataURL(file);
  }

  content.querySelector("#bm-send-btn")?.addEventListener("click", async () => {
    if (!selectedBase64) return;
    const sendBtn = content.querySelector("#bm-send-btn");
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Enviando…`;

    try {
      const data = await api.post("/api/public/order", {
        seller_code:    state.seller.code,
        product_id:     prod.id,
        product_name:   prod.name,
        quantity:       qty,
        unit_price:     prod.precio_publico,
        receipt_base64: selectedBase64,
        receipt_mime:   selectedMime,
        buyer_name:     (content.querySelector("#bm-buyer-name")?.value || "").trim() || null,
      });

      if (data.ok) {
        const { tx_id, subtotal, created_at_bolivia } = data;
        const waMsg = hasSeller
          ? `${state.seller.name}, acabo de enviar mi comprobante en tu tienda LIT Nutrition.\n\n` +
            `📦 *Producto:* ${prod.name}\n` +
            `🔢 *Cantidad:* ${qty}\n` +
            `💰 *Total:* ${formatBs(subtotal)}\n` +
            `🧾 *Nº transacción:* ${tx_id}\n` +
            `⏰ *Fecha:* ${created_at_bolivia}\n\n` +
            `Por favor confirma la recepción del pago.`
          : "";

        showResult(`
          <div class="bm-success">
            <div class="bm-success-icon">✓</div>
            <div>
              <div class="bm-success-title">¡Comprobante enviado!</div>
              <div class="bm-success-tx">Nº transacción: <strong>${tx_id}</strong></div>
              <div class="bm-success-hint">El asesor verificará tu pago y se pondrá en contacto.</div>
            </div>
          </div>
          ${hasSeller && state.seller.phone ? `
            <a class="bm-wa-notify-btn"
               href="${buildWALink(state.seller.phone, waMsg)}"
               target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Avisar a ${state.seller.name} por WhatsApp
            </a>` : ""}
        `, "success");
        sendBtn.style.display = "none";
      } else {
        throw new Error(data.error || "Error al enviar");
      }
    } catch (e) {
      showResult(`No se pudo enviar: ${e.message}`, "error");
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar comprobante`;
    }
  });

  function showResult(html, type) {
    const r = content.querySelector("#bm-send-result");
    if (!r) return;
    r.innerHTML = type === "success" ? html : `<div class="bm-send-error">${html}</div>`;
    r.style.display = "block";
  }
}