/**
 * js/faq.js — LIT Nutrition
 * Carga las preguntas frecuentes desde el Worker 2 y renderiza el acordeón.
 */

import { API_FAQ, el, state } from "./core.js";

/* ── Cargar y renderizar FAQ ─────────────────────────────────────────────── */
export async function loadFAQ() {
  const wrap = el("faq-list");
  if (!wrap) return;

  wrap.innerHTML = _renderSkeleton();

  try {
    const res  = await fetch(`${API_FAQ}/api/faq`);
    const data = await res.json();

    if (!data.ok || !data.items?.length) {
      wrap.innerHTML = `
        <div class="faq-empty">
          <div class="faq-empty-icon">🤔</div>
          <p>Aún no hay preguntas frecuentes. Vuelve pronto.</p>
        </div>`;
      return;
    }

    // Agrupar por categoría si existe
    const grouped = _groupByCategory(data.items);
    wrap.innerHTML = _renderGroups(grouped);
    _bindAccordion(wrap);

  } catch (e) {
    wrap.innerHTML = `
      <div class="faq-empty">
        <p>No se pudieron cargar las preguntas. Intenta de nuevo.</p>
      </div>`;
  }
}

/* ── Agrupar items por categoría ────────────────────────────────────────── */
function _groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const cat = item.category || "General";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

/* ── Render HTML ─────────────────────────────────────────────────────────── */
function _renderGroups(grouped) {
  return Object.entries(grouped).map(([category, items], gi) => `
    <div class="faq-group fade-up" style="animation-delay:${gi * 0.08}s;">
      ${Object.keys(grouped).length > 1
        ? `<div class="faq-category-label">${category}</div>`
        : ""}
      <div class="faq-items">
        ${items.map((item, i) => `
          <div class="faq-item" data-idx="${gi}-${i}">
            <button class="faq-question" aria-expanded="false">
              <span>${item.question}</span>
              <div class="faq-chevron">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </button>
            <div class="faq-answer" aria-hidden="true">
              <div class="faq-answer-inner">${item.answer}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>
  `).join("");
}

/* ── Acordeón ────────────────────────────────────────────────────────────── */
function _bindAccordion(wrap) {
  wrap.querySelectorAll(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item     = btn.closest(".faq-item");
      const answer   = item.querySelector(".faq-answer");
      const isOpen   = btn.getAttribute("aria-expanded") === "true";

      // Cerrar todos
      wrap.querySelectorAll(".faq-item.open").forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove("open");
          openItem.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          openItem.querySelector(".faq-answer").style.maxHeight = "0";
        }
      });

      // Toggle el actual
      if (isOpen) {
        item.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
        answer.style.maxHeight = "0";
      } else {
        item.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        answer.style.maxHeight = answer.scrollHeight + "px";
      }
    });
  });
}

/* ── Búsqueda en FAQ ─────────────────────────────────────────────────────── */
export function initFAQSearch() {
  const input = el("faq-search");
  if (!input) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    const items = document.querySelectorAll(".faq-item");

    items.forEach(item => {
      const q = item.querySelector(".faq-question span")?.textContent.toLowerCase() ?? "";
      const a = item.querySelector(".faq-answer-inner")?.textContent.toLowerCase() ?? "";
      const match = !query || q.includes(query) || a.includes(query);
      item.style.display = match ? "" : "none";
    });

    // Mostrar/ocultar grupos vacíos
    document.querySelectorAll(".faq-group").forEach(group => {
      const visibles = group.querySelectorAll(".faq-item:not([style*='display: none'])");
      group.style.display = visibles.length > 0 ? "" : "none";
    });
  });
}

/* ── Skeleton mientras carga ─────────────────────────────────────────────── */
function _renderSkeleton() {
  return Array.from({ length: 4 }, () => `
    <div class="faq-item-skeleton">
      <div class="faq-skel-line" style="width:75%;height:14px;"></div>
    </div>
  `).join("");
}