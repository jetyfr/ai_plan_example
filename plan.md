# Plan de implementación (jerárquico) — App de tareas en “canvas” (100% cliente)

> Objetivo: una aplicación web **sin backend** (solo **HTML + CSS + Vanilla JS**) para crear, editar, borrar y completar tareas, representadas como **tarjetas** movibles libremente en un “canvas” (tablero). Persistencia en **localStorage**. Compatible **PC + móvil**.

---

## 0. Decisiones de arquitectura (alto nivel)

### 0.1. Modelo mental de UI
- La “zona canvas” será un **tablero DOM** (un `<div id="board">`) dentro de un contenedor con **overflow oculto**.
- Las tarjetas serán **elementos DOM** (`<article class="task-card">`) posicionados con `transform: translate(x,y)` (mejor rendimiento que `top/left`).
- Drag & drop (PC + móvil) con una librería ligera:
  - Recomendación: **Interact.js** (drag multi-dispositivo, inercia opcional, restricciones, z-index).

### 0.2. Persistencia
- **localStorage** almacena un único “documento de estado”:
  - lista de tareas + su posición + color + estado done + orden z
  - (opcional) configuración global (filtro, zoom, preferencias UI, etc.)

### 0.3. Requisitos no funcionales
- Rendimiento fluido (transform + requestAnimationFrame cuando aplique).
- Accesibilidad mínima (teclado, foco, ARIA en modales).
- Offline-friendly (sin necesidad de red tras cargar la app).

---

## 1. Estructura de proyecto

```
/app
  index.html
  /assets
    styles.css
    app.js
    storage.js
    model.js
    ui.js
    board.js
    utils.js
```
> Nota: aunque sea “vanilla”, separar en módulos facilita mantenimiento. Se puede usar `<script type="module">`.

---

## 2. Datos y modelo

### 2.1. Esquema de una tarea
Cada tarea incluye:

- `id: string` (UUID o nanoid)
- `title: string`
- `description: string`
- `createdAt: number` (epoch ms)
- `updatedAt: number` (epoch ms, opcional)
- `done: boolean`
- `color: number` (0..7)
- `pos: { x: number, y: number }`
- `z: number` (para apilar visualmente)
- (opcional) `doneAt: number`

### 2.2. Esquema del estado global
```json
{
  "version": 1,
  "tasks": [],
  "ui": {
    "filter": "all|open|done",
    "sort": "z|createdAt",
    "boardTransform": { "panX": 0, "panY": 0, "zoom": 1 }
  }
}
```

### 2.3. Identificadores
- Generación recomendada: `crypto.randomUUID()` (si está disponible).
- Fallback: función simple de UUID v4 o `nanoid` (CDN).

---

## 3. Diseño de interfaz (UI)

### 3.1. Layout general
- **Header** fijo:
  - Logo/nombre app
  - Botón “Nueva tarea”
  - Filtros (All / Open / Done)
  - (Opcional) “Reset board” / “Export/Import”
- **Board container** (canvas):
  - ocupa el resto de la pantalla
  - soporta drag de tarjetas
  - soporte táctil
- **Modal / Drawer** para crear/editar tarea (responsive):
  - PC: modal centrado
  - móvil: bottom-sheet (misma implementación CSS con breakpoints)

### 3.2. Tarjeta de tarea
Contenido mínimo:
- Título (editable)
- Descripción (multilínea, colapsable opcional)
- “Creada: …” (fecha relativa o absoluta)
Acciones:
- **Editar**
- **Borrar**
- **Marcar como realizada**

### 3.3. Señal visual de “realizada” (muy evidente)
- Cambios simultáneos:
  - Opacidad reducida (p.ej. 0.7)
  - Texto con estilo (p.ej. `text-decoration: line-through` en título)
  - Badge “DONE” / check grande
  - Fondo con patrón sutil o borde distinto
- Animación breve al completar (p.ej. escala 1.02→1.0)

### 3.4. Paleta de 8 colores
- Un selector de color en la tarjeta o en el modal.
- Implementación: variables CSS
  - `--c0..--c7` y clases `.c0..c7` en la tarjeta.
- Debe verse bien en modo claro y (opcional) oscuro.

---

## 4. Interacciones clave

### 4.1. Crear tarea
1. Usuario pulsa “Nueva tarea”
2. Se abre modal/drawer con:
   - title (required)
   - description (optional)
   - color (8 opciones)
3. Al guardar:
   - se crea tarea con `createdAt = Date.now()`
   - se asigna posición inicial:
     - cerca del centro visible del board o un offset incremental (no apilar todas encima)
   - se renderiza la tarjeta y se persiste estado

### 4.2. Editar tarea
- Editar desde:
  - botón “Editar” en tarjeta (abre modal)
  - (opcional) doble click sobre título para edición inline
- Guardar actualiza `updatedAt` y persiste.

### 4.3. Borrar tarea
- Confirmación (modal pequeño o `confirm()` custom):
  - “¿Eliminar esta tarea?”
- Eliminar del DOM y del estado.

### 4.4. Completar / descompletar
- Toggle `done`.
- Actualización UI inmediata y persistencia.
- (Opcional) mover tareas done al fondo (z) o agrupar visualmente con filtro.

### 4.5. Mover tarjetas en el canvas
- Drag & drop:
  - durante drag: actualizar transform en tiempo real
  - al finalizar: persistir `pos`
- (Opcional) bring-to-front al empezar drag:
  - incrementar `z` global y asignarlo a la tarjeta

### 4.6. Soporte móvil
- Tap para abrir acciones
- Long-press para drag (si se desea) o drag directo (Interact.js soporta touch)
- Botones grandes y espaciado adecuado (44px target)

---

## 5. Módulos de implementación (detalle)

### 5.1. `storage.js` (persistencia)
Responsabilidades:
- `loadState(): AppState`
- `saveState(state: AppState): void`
- `migrateStateIfNeeded(state): AppState` (versionado)
- Manejo de errores: JSON corrupto → reset parcial con aviso UI

Estrategia:
- Guardar con debounce (p.ej. 250–500ms) para no saturar localStorage en drag.

### 5.2. `model.js` (operaciones sobre datos)
Funciones:
- `createTask(payload)`
- `updateTask(id, patch)`
- `deleteTask(id)`
- `toggleDone(id)`
- `setTaskColor(id, color)`
- `setTaskPos(id, x, y)`
- `bringToFront(id)`

### 5.3. `ui.js` (render / componentes)
Funciones:
- `renderApp(state)`
- `renderTaskCard(task)` → retorna DOM node
- `updateTaskCard(task)` → actualiza clases/atributos/texto sin recrear todo
- `openTaskModal(mode, task?)`
- `closeTaskModal()`
- Utilidades de form validation + focus trap (modal)

### 5.4. `board.js` (interacción canvas)
Funciones:
- `initBoard()`:
  - inicializa Interact.js para `.task-card`
  - configura restricciones (no perder la tarjeta completamente fuera de viewport)
- `applyTaskTransform(cardEl, x, y)`
- (Opcional) pan/zoom del board:
  - biblioteca `panzoom` + guardar en state.ui.boardTransform

### 5.5. `utils.js`
- `formatDate(ts)` (p.ej. `Intl.DateTimeFormat`)
- `debounce(fn, ms)`
- `clamp(x, min, max)`
- `safeParseJSON()`

---

## 6. Integración de librerías (CDN)

### 6.1. Interact.js (drag, touch)
- Incluir por CDN en `index.html`
- Configurar:
  - `draggable({ listeners: { move, end }, inertia: false })`
  - En `move`: aplicar `translate(x,y)`
  - En `end`: persistir pos

### 6.2. Iconos (opcional)
- Librería recomendada: **Lucide** o **Font Awesome Free** via CDN.
- Mantener botones con texto + icono (accesibilidad).

### 6.3. Tipografías (opcional)
- Fuente moderna por `system-ui` o Google Fonts.
- Si se usa Google Fonts, ofrecer fallback local.

---

## 7. CSS (diseño elegante y moderno)

### 7.1. Tokens (variables CSS)
Definir en `:root`:
- `--bg`, `--surface`, `--text`, `--muted`
- `--shadow`, `--radius`, `--gap`
- `--accent`
- `--c0..--c7` (colores tarjetas)

### 7.2. Componentes
- `header` (sticky)
- `button` (variants: primary/ghost/danger)
- `modal` + overlay
- `task-card` (elevación, borde, efecto hover)
- `badge done`

### 7.3. Responsive
- Breakpoints (ej. 640px)
- En móvil:
  - header compacto
  - modal como bottom-sheet
  - botones más grandes
- No depender de hover.

---

## 8. Accesibilidad y UX

- Navegación por teclado:
  - Tab en botones
  - Modal con focus trap y ESC para cerrar
- ARIA:
  - `role="dialog"` + `aria-modal="true"`
- Contraste suficiente en colores de tarjeta (texto oscuro/claro según luminancia, opcional).
- Confirmaciones suaves:
  - “toast” simple para “Guardado” / “Eliminado” (opcional).

---

## 9. Persistencia y sincronización UI ↔ estado

### 9.1. Patrón recomendado
- **Single source of truth**: `state` en memoria.
- Render inicial desde `loadState()`.
- Cada acción:
  1. muta estado con funciones de `model.js`
  2. actualiza DOM (UI incremental)
  3. dispara `saveStateDebounced()`

### 9.2. Estrategia de actualización incremental
- Para drag: actualizar DOM en `move`, guardar solo en `end`.
- Para edición/estado done/color: actualizar DOM y guardar inmediato (debounced).

---

## 10. Casos límite

- localStorage lleno / inaccesible:
  - mostrar aviso y continuar sin persistir (modo degradado)
- JSON corrupto:
  - fallback a estado vacío
- Muchas tareas (100–500):
  - evitar re-render completo en cada acción
  - usar delegación de eventos en el board

---

## 11. Pruebas (mínimas pero útiles)

- Pruebas manuales:
  - móvil: drag, scroll, abrir/cerrar modal, completar
  - PC: teclado, foco, resize ventana
- Tests ligeros opcionales:
  - `vitest` no (framework), pero se puede hacer “self-check” simple en consola.
- Validaciones:
  - título no vacío
  - límites razonables de longitud

---

## 12. Roadmap opcional (mejoras)

- Export / Import JSON (backup)
- Buscador de tareas
- Snap-to-grid y/o alineación
- Agrupar por color/done
- Undo/Redo simple
- Modo oscuro
- Pan & zoom del board
