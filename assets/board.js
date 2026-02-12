/**
 * board.js — Interacción con el canvas: drag & drop con Interact.js, z-index
 */
import { setTaskPos, bringToFront } from "./model.js";
import { clamp } from "./utils.js";

/** Aplica transform translate a un elemento de tarjeta */
export function applyTaskTransform(cardEl, x, y) {
  cardEl.style.transform = `translate(${x}px, ${y}px)`;
  cardEl.setAttribute("data-x", x);
  cardEl.setAttribute("data-y", y);
}

/** Inicializa Interact.js en todas las tarjetas .task-card del board */
export function initBoard() {
  if (typeof interact === "undefined") {
    console.error("Interact.js no está cargado");
    return;
  }

  /* Limpiar interacciones previas para evitar duplicados */
  interact(".task-card").unset();

  interact(".task-card").draggable({
    inertia: false,
    autoScroll: false,

    listeners: {
      start(event) {
        const card = event.target;
        card.classList.add("dragging");
        const taskId = card.dataset.taskId;
        const task = bringToFront(taskId);
        if (task) {
          card.style.zIndex = task.z;
        }
      },

      move(event) {
        const card = event.target;
        const x = (parseFloat(card.getAttribute("data-x")) || 0) + event.dx;
        const y = (parseFloat(card.getAttribute("data-y")) || 0) + event.dy;

        /* Restricción: no permitir que la tarjeta salga completamente del viewport */
        const board = document.getElementById("board");
        const boardRect = board.getBoundingClientRect();
        const cardWidth = card.offsetWidth;
        const cardHeight = card.offsetHeight;
        const margin = 40; /* mínimo visible */

        const clampedX = clamp(x, -cardWidth + margin, boardRect.width - margin);
        const clampedY = clamp(y, -cardHeight + margin, boardRect.height - margin);

        applyTaskTransform(card, clampedX, clampedY);
      },

      end(event) {
        const card = event.target;
        card.classList.remove("dragging");
        const taskId = card.dataset.taskId;
        const x = parseFloat(card.getAttribute("data-x")) || 0;
        const y = parseFloat(card.getAttribute("data-y")) || 0;
        setTaskPos(taskId, x, y);
      },
    },
  });
}
