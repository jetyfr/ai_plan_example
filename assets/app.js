/**
 * app.js — Punto de entrada: carga estado, inicializa modelo y UI
 */
import { loadState } from "./storage.js";
import { initModel } from "./model.js";
import { initUI } from "./ui.js";

function bootstrap() {
  const state = loadState();
  initModel(state);
  initUI();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
