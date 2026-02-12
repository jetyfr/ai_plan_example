/**
 * model.js — Operaciones sobre el estado de la aplicación (source of truth)
 */
import { generateId } from "./utils.js";
import { saveState, saveStateNow } from "./storage.js";

/** Estado global en memoria */
let state = null;

/** Inicializa el modelo con un estado cargado */
export function initModel(loadedState) {
  state = loadedState;
}

/** Devuelve el estado actual (solo lectura conceptual) */
export function getState() {
  return state;
}

/** Crea una nueva tarea y la añade al estado */
export function createTask({ title, description = "", color = 0, x, y }) {
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    createdAt: Date.now(),
    updatedAt: null,
    done: false,
    doneAt: null,
    color,
    pos: { x, y },
    z: state.ui.nextZ++,
  };
  state.tasks.push(task);
  saveStateNow(state);
  return task;
}

/** Actualiza campos de una tarea existente */
export function updateTask(id, patch) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, patch, { updatedAt: Date.now() });
  saveStateNow(state);
  return task;
}

/** Elimina una tarea por su id */
export function deleteTask(id) {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  state.tasks.splice(idx, 1);
  saveStateNow(state);
  return true;
}

/** Alterna el estado done de una tarea */
export function toggleDone(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.done = !task.done;
  task.doneAt = task.done ? Date.now() : null;
  task.updatedAt = Date.now();
  saveStateNow(state);
  return task;
}

/** Cambia el color de una tarea */
export function setTaskColor(id, color) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.color = color;
  saveStateNow(state);
  return task;
}

/** Actualiza la posición de una tarea (con debounce para drag) */
export function setTaskPos(id, x, y) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.pos.x = x;
  task.pos.y = y;
  saveState(state);
  return task;
}

/** Trae una tarea al frente (z-index más alto) */
export function bringToFront(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.z = state.ui.nextZ++;
  saveState(state);
  return task;
}

/** Obtiene una tarea por id */
export function getTask(id) {
  return state.tasks.find((t) => t.id === id) || null;
}

/** Establece el filtro activo */
export function setFilter(filter) {
  state.ui.filter = filter;
  saveStateNow(state);
}

/** Devuelve las tareas filtradas según el filtro actual */
export function getFilteredTasks() {
  const f = state.ui.filter;
  if (f === "open") return state.tasks.filter((t) => !t.done);
  if (f === "done") return state.tasks.filter((t) => t.done);
  return state.tasks;
}
