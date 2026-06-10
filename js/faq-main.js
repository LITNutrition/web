/**
 * js/faq-main.js — LIT Nutrition · faq.html
 * Entry point: carga minimal (solo seller para header/footer) + FAQ.
 */

import { loadLandingData, initHeaderScroll, hideLoader } from "./core.js";
import { applySeller }          from "./seller.js";
import { loadFAQ, initFAQSearch } from "./faq.js";

initHeaderScroll("site-header");

async function init() {
  await loadLandingData();

  applySeller();
  await loadFAQ();
  initFAQSearch();

  hideLoader("app-loader", 600);
}

init();