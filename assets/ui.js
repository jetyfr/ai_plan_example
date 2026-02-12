/**
 * ui.js — Renderizado, modales, tarjetas y delegación de eventos
 */
import { formatDate } from "./utils.js";
import {
  getState,
  createTask,
  updateTask,
  deleteTask,
  toggleDone,
  setTaskColor,
  getTask,
  setFilter,
  getFilteredTasks,
} from "./model.js";

import { initBoard, applyTaskTransform } from "./board.js";

/* ---- Referencias DOM ---- */
let boardEl, modalOverlay, confirmOverlay, toastContainer, emptyState;

/* ---- Iconos SVG inline (Lucide-like) ---- */
const ICONS = {
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  layout: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  undo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
};

/* ---- Inicialización ---- */
export function initUI() {
  boardEl = document.getElementById("board");
  modalOverlay = document.getElementById("task-modal-overlay");
  confirmOverlay = document.getElementById("confirm-modal-overlay");
  toastContainer = document.getElementById("toast-container");
  emptyState = document.getElementById("empty-state");

  setupHeaderEvents();
  setupModalEvents();
  setupConfirmEvents();
  setupBoardDelegation();

  restoreFilterButtons();
  renderAllCards();
  initBoard();
  updateEmptyState();
}

/* ---- Render completo (carga inicial) ---- */
function renderAllCards() {
  boardEl.innerHTML = "";
  const tasks = getFilteredTasks();
  tasks.forEach((task) => {
    const card = buildCardElement(task);
    boardEl.appendChild(card);
  });
}

/* ---- Actualizar estado vacío ---- */
function updateEmptyState() {
  const tasks = getFilteredTasks();
  emptyState.style.display = tasks.length === 0 ? "block" : "none";
}

/* ---- Construir una tarjeta DOM desde datos de tarea ---- */
function buildCardElement(task) {
  const card = document.createElement("article");
  card.className = `task-card c${task.color}${task.done ? " done" : ""}`;
  card.setAttribute("data-task-id", task.id);
  card.style.zIndex = task.z;

  applyTaskTransform(card, task.pos.x, task.pos.y);

  card.innerHTML = `
    <div class="task-card__header">
      <span class="task-card__title"></span>
      <span class="task-card__done-badge">${ICONS.check} Hecha</span>
    </div>
    <div class="task-card__body">
      <p class="task-card__desc"></p>
    </div>
    <div class="task-card__meta">
      <span class="task-card__date"></span>
    </div>
    <div class="task-card__actions">
      <div class="color-dots">
        ${[0, 1, 2, 3, 4, 5, 6, 7]
          .map(
            (c) =>
              `<button class="color-dot${c === task.color ? " active" : ""}" data-action="color" data-color="${c}" title="Color ${c + 1}" aria-label="Color ${c + 1}"></button>`
          )
          .join("")}
      </div>
      <button class="card-action-btn btn-done-toggle" data-action="toggleDone" title="${task.done ? "Desmarcar" : "Completar"}" aria-label="${task.done ? "Desmarcar" : "Completar"}">
        ${task.done ? ICONS.undo : ICONS.checkCircle}
      </button>
      <button class="card-action-btn" data-action="edit" title="Editar" aria-label="Editar">
        ${ICONS.edit}
      </button>
      <button class="card-action-btn btn-delete" data-action="delete" title="Eliminar" aria-label="Eliminar">
        ${ICONS.trash}
      </button>
    </div>
  `;

  /* Insertar textos con textContent (sanitización) */
  card.querySelector(".task-card__title").textContent = task.title;
  card.querySelector(".task-card__desc").textContent = task.description || "";
  card.querySelector(".task-card__date").textContent = `Creada: ${formatDate(task.createdAt)}`;

  return card;
}

/* ---- Actualizar una tarjeta existente sin recrear ---- */
export function updateCardElement(task) {
  const card = boardEl.querySelector(`[data-task-id="${task.id}"]`);
  if (!card) return;

  /* Textos */
  card.querySelector(".task-card__title").textContent = task.title;
  card.querySelector(".task-card__desc").textContent = task.description || "";
  card.querySelector(".task-card__date").textContent = `Creada: ${formatDate(task.createdAt)}`;

  /* Clases de color */
  for (let i = 0; i < 8; i++) card.classList.remove(`c${i}`);
  card.classList.add(`c${task.color}`);

  /* Color dots activos */
  card.querySelectorAll(".color-dot").forEach((dot) => {
    dot.classList.toggle("active", parseInt(dot.dataset.color) === task.color);
  });

  /* Done */
  const wasDone = card.classList.contains("done");
  card.classList.toggle("done", task.done);
  if (task.done && !wasDone) {
    card.classList.add("completing");
    card.addEventListener("animationend", () => card.classList.remove("completing"), { once: true });
  }

  /* Toggle button */
  const toggleBtn = card.querySelector("[data-action='toggleDone']");
  toggleBtn.innerHTML = task.done ? ICONS.undo : ICONS.checkCircle;
  toggleBtn.title = task.done ? "Desmarcar" : "Completar";
  toggleBtn.setAttribute("aria-label", task.done ? "Desmarcar" : "Completar");

  /* z-index */
  card.style.zIndex = task.z;
}

/* ---- Delegación de eventos en el board ---- */
function setupBoardDelegation() {
  boardEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const card = btn.closest(".task-card");
    if (!card) return;
    const taskId = card.dataset.taskId;

    const action = btn.dataset.action;

    if (action === "edit") {
      const task = getTask(taskId);
      if (task) openTaskModal("edit", task);
    } else if (action === "delete") {
      openConfirmModal(taskId);
    } else if (action === "toggleDone") {
      const task = toggleDone(taskId);
      if (task) {
        updateCardElement(task);
        updateEmptyState();
      }
    } else if (action === "color") {
      const color = parseInt(btn.dataset.color);
      const task = setTaskColor(taskId, color);
      if (task) updateCardElement(task);
    }
  });
}

/* ---- Restaurar estado de filtros al cargar ---- */
function restoreFilterButtons() {
  const currentFilter = getState().ui.filter || "all";
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === currentFilter);
  });
}

/* ---- Header: filtros y botón nueva tarea ---- */
function setupHeaderEvents() {
  /* Botón nueva tarea (header) */
  document.getElementById("btn-new-task").addEventListener("click", () => {
    openTaskModal("create");
  });

  /* FAB móvil */
  document.getElementById("fab-new-task").addEventListener("click", () => {
    openTaskModal("create");
  });

  /* Filtros */
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      setFilter(btn.dataset.filter);
      renderAllCards();
      initBoard();
      updateEmptyState();
    });
  });
}

/* ==== MODAL CREAR/EDITAR ==== */
let currentEditId = null;

function openTaskModal(mode, task = null) {
  currentEditId = mode === "edit" && task ? task.id : null;

  const titleEl = modalOverlay.querySelector(".modal__title");
  const inputTitle = document.getElementById("input-title");
  const inputDesc = document.getElementById("input-desc");
  const saveBtn = document.getElementById("btn-save-task");

  titleEl.textContent = mode === "edit" ? "Editar tarea" : "Nueva tarea";
  saveBtn.textContent = mode === "edit" ? "Guardar" : "Crear";

  inputTitle.value = task ? task.title : "";
  inputDesc.value = task ? task.description : "";

  /* Color */
  const selectedColor = task ? task.color : 0;
  modalOverlay.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.classList.toggle("active", parseInt(sw.dataset.color) === selectedColor);
  });

  /* Limpiar errores */
  inputTitle.classList.remove("error");
  modalOverlay.querySelector(".form-error").classList.remove("visible");

  showOverlay(modalOverlay);
  setTimeout(() => inputTitle.focus(), 80);
}

function closeTaskModal() {
  hideOverlay(modalOverlay);
  currentEditId = null;
}

function setupModalEvents() {
  /* Cerrar */
  modalOverlay.querySelector(".modal__close").addEventListener("click", closeTaskModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeTaskModal();
  });

  /* Color swatches */
  modalOverlay.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      modalOverlay.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      sw.classList.add("active");
    });
  });

  /* Cancelar */
  modalOverlay.querySelector(".modal__cancel-btn").addEventListener("click", closeTaskModal);

  /* Guardar */
  document.getElementById("btn-save-task").addEventListener("click", handleSaveTask);

  /* Enter en título */
  document.getElementById("input-title").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTask();
    }
  });

  /* ESC global */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (confirmOverlay.classList.contains("visible")) {
        hideOverlay(confirmOverlay);
      } else if (modalOverlay.classList.contains("visible")) {
        closeTaskModal();
      }
    }
  });
}

function handleSaveTask() {
  const inputTitle = document.getElementById("input-title");
  const inputDesc = document.getElementById("input-desc");
  const errorEl = modalOverlay.querySelector(".form-error");
  const title = inputTitle.value.trim();

  if (!title) {
    inputTitle.classList.add("error");
    errorEl.classList.add("visible");
    inputTitle.focus();
    return;
  }

  inputTitle.classList.remove("error");
  errorEl.classList.remove("visible");

  const activeSwatch = modalOverlay.querySelector(".color-swatch.active");
  const color = activeSwatch ? parseInt(activeSwatch.dataset.color) : 0;
  const description = inputDesc.value.trim();

  if (currentEditId) {
    const task = updateTask(currentEditId, { title, description, color });
    if (task) {
      updateCardElement(task);
      showToast("Tarea actualizada");
    }
  } else {
    /* Posición inicial: centro del board con offset aleatorio */
    const rect = boardEl.getBoundingClientRect();
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;
    const x = Math.max(20, rect.width / 2 - 130 + offsetX);
    const y = Math.max(20, rect.height / 2 - 100 + offsetY);

    const task = createTask({ title, description, color, x, y });
    const card = buildCardElement(task);
    card.classList.add("entering");
    card.addEventListener("animationend", () => card.classList.remove("entering"), { once: true });
    boardEl.appendChild(card);
    initBoard();
    updateEmptyState();
    showToast("Tarea creada");
  }

  closeTaskModal();
}

/* ==== CONFIRM MODAL ==== */
let pendingDeleteId = null;

function openConfirmModal(taskId) {
  pendingDeleteId = taskId;
  showOverlay(confirmOverlay);
}

function setupConfirmEvents() {
  document.getElementById("btn-confirm-delete").addEventListener("click", () => {
    if (pendingDeleteId) {
      const card = boardEl.querySelector(`[data-task-id="${pendingDeleteId}"]`);
      if (card) {
        card.style.transition = "opacity 180ms ease, transform 180ms ease";
        card.style.opacity = "0";
        card.style.transform = card.style.transform + " scale(0.9)";
        setTimeout(() => {
          deleteTask(pendingDeleteId);
          card.remove();
          updateEmptyState();
          pendingDeleteId = null;
          showToast("Tarea eliminada");
        }, 180);
      }
    }
    hideOverlay(confirmOverlay);
  });

  document.getElementById("btn-cancel-delete").addEventListener("click", () => {
    hideOverlay(confirmOverlay);
    pendingDeleteId = null;
  });

  confirmOverlay.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) {
      hideOverlay(confirmOverlay);
      pendingDeleteId = null;
    }
  });
}

/* ==== OVERLAY helpers ==== */
function showOverlay(el) {
  el.classList.add("visible");
}

function hideOverlay(el) {
  el.classList.remove("visible");
}

/* ==== TOAST ==== */
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2300);
}
