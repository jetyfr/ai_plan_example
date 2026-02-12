/**
 * storage.js — Persistencia en localStorage con versionado y validación
 */
import { safeParseJSON, debounce } from "./utils.js";

const STORAGE_KEY = "taskboard_state";
const CURRENT_VERSION = 1;

/** Estado por defecto cuando no hay datos guardados */
function defaultState() {
  return {
    version: CURRENT_VERSION,
    tasks: [],
    ui: {
      filter: "all",
      nextZ: 1,
    },
  };
}

/** Valida que una tarea tenga los campos mínimos requeridos */
function isValidTask(t) {
  return (
    t &&
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.createdAt === "number" &&
    t.pos &&
    typeof t.pos.x === "number" &&
    typeof t.pos.y === "number" &&
    typeof t.color === "number" &&
    typeof t.done === "boolean" &&
    typeof t.z === "number"
  );
}

/** Migra el estado si la versión es anterior a la actual */
function migrateIfNeeded(state) {
  if (!state || typeof state.version !== "number") return defaultState();
  // Futuras migraciones: if (state.version < 2) { ... state.version = 2; }
  return state;
}

/** Carga el estado desde localStorage, validando integridad */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = safeParseJSON(raw, null);
    if (!parsed) {
      console.warn("Estado corrupto en localStorage, reiniciando.");
      return defaultState();
    }

    const state = migrateIfNeeded(parsed);

    if (!Array.isArray(state.tasks)) {
      state.tasks = [];
    }
    state.tasks = state.tasks.filter(isValidTask);

    if (!state.ui) {
      state.ui = defaultState().ui;
    }
    if (typeof state.ui.nextZ !== "number") {
      const maxZ = state.tasks.reduce((m, t) => Math.max(m, t.z || 0), 0);
      state.ui.nextZ = maxZ + 1;
    }

    return state;
  } catch (e) {
    console.error("Error al cargar estado:", e);
    return defaultState();
  }
}

/** Guarda el estado en localStorage */
function _saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Error al guardar estado:", e);
    showStorageWarning();
  }
}

let warningShown = false;
function showStorageWarning() {
  if (warningShown) return;
  warningShown = true;
  console.warn("No se pudo guardar en localStorage. Los cambios podrían perderse.");
}

/** Guardado con debounce para no saturar en operaciones rápidas (drag) */
export const saveState = debounce(_saveState, 300);

/** Guardado inmediato (para acciones puntuales como crear/borrar) */
export function saveStateNow(state) {
  _saveState(state);
}
