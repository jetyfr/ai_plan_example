# Guidelines de implementación — App de tareas en canvas (vanilla)

Estas directrices están pensadas para que un LLM pueda implementar la app con calidad y sin ambigüedad.

---

## 1. Tecnologías y dependencias recomendadas

### 1.1. Núcleo
- **HTML5** semántico
- **CSS3** (variables, flex/grid, `@media`)
- **JavaScript ES Modules** (`<script type="module">`)

### 1.2. Librerías permitidas (sin frameworks)
- Drag & drop: **Interact.js** (CDN)
- Iconos: **Lucide** (CDN) o alternativa equivalente
- (Opcional) pan/zoom: **panzoom** (CDN)

**Regla:** no usar React/Vue/Angular ni librerías que impongan arquitectura tipo framework.

---

## 2. Buenas prácticas por tecnología

### 2.1. HTML
- Estructura clara:
  - `header`, `main`, `section#board-container`
- Botones reales (`<button>`) en lugar de `<div>` clicables.
- Formularios con `label for=...` y validación básica.
- Uso de atributos `data-*` para enlazar DOM con `task.id`:
  - `data-task-id="..."`

### 2.2. CSS
- Usar **variables CSS** para tokens de diseño:
  - colores, radios, sombras, espaciados
- Preferir `transform` para mover tarjetas (rendimiento).
- Evitar CSS demasiado específico; clases BEM-like o utilitarias moderadas.
- Responsive-first:
  - targets táctiles >= 44px
  - tipografía escalable (`clamp()` si aplica)
- Estados visuales:
  - `:focus-visible` para accesibilidad
  - estilos distintos para `done` muy claros

### 2.3. JavaScript (vanilla)
- Arquitectura modular:
  - `storage.js`, `model.js`, `ui.js`, `board.js`
- Delegación de eventos:
  - 1 listener en `#board` para clicks en botones internos
- Inmutabilidad “selectiva”:
  - puedes mutar `state` si lo haces de forma controlada, pero **centraliza** cambios en `model.js`.
- Evitar re-render completo:
  - actualizar solo la tarjeta afectada.
- Guardado en localStorage con **debounce**:
  - no guardar en cada movimiento del drag (solo al final).

---

## 3. Diseño de datos y persistencia

### 3.1. Principios
- El estado en memoria es la “fuente de verdad”.
- `localStorage` guarda un JSON versionado:
  - `{version, tasks, ui}`

### 3.2. Versionado / migraciones
- Incluir `version` numérica.
- Si en el futuro cambian campos, aplicar migración al cargar.

### 3.3. Integridad
- Validar al cargar:
  - `tasks` es array
  - cada task tiene `id`, `title`, `createdAt`, `pos`, `color`, `done`

---

## 4. Interacciones y UX

### 4.1. Modal/Drawer (crear/editar)
- PC: modal centrado con overlay
- Móvil: bottom-sheet
- Debe soportar:
  - cerrar con ESC
  - cerrar clic en overlay
  - focus trap (mínimo: poner foco en input título al abrir)

### 4.2. Confirmación de borrado
- No borrar “al instante” sin confirmación.
- Confirmación accesible (propio modal pequeño, no `alert()` si se busca estética).

### 4.3. “Done” debe destacarse
Recomendación:
- `task-card.done`:
  - badge “✔ Hecha”
  - título con `line-through`
  - borde o fondo distinto
  - ligera reducción de contraste/opacidad

### 4.4. Paleta de 8 colores
- Selector visual con 8 botones (swatches).
- Para legibilidad:
  - si el color es oscuro, usar texto claro (opcional: calcular luminancia).

---

## 5. Drag & Drop (Interact.js) — reglas de implementación

### 5.1. Rendimiento
- Durante `move`:
  - solo actualizar `transform` y dataset con las coords actuales
- En `end`:
  - persistir posición en `state` y guardar

### 5.2. Z-index
- Al iniciar drag:
  - `bringToFront(taskId)` → asigna z mayor.
- El `z` debe persistirse en localStorage para mantener la pila.

### 5.3. Restricciones
- Evitar que la tarjeta quede 100% fuera del viewport:
  - clamp parcial (por ejemplo permitir 70% fuera, pero no 100%).
- Opcional: “snap-to-grid” (desactivado por defecto).

---

## 6. Estrategia de render

### 6.1. Render inicial
- Cargar estado
- Por cada task:
  - crear DOM card
  - aplicar clases de color y done
  - aplicar transform (x,y) y z-index

### 6.2. Actualizaciones incrementales
- Editar: actualizar textos y timestamps si aplica
- Color: actualizar clase `.cN`
- Done: toggle de clase `.done`
- Move: actualizar transform

### 6.3. Delegación de eventos (patrón)
- `boardEl.addEventListener("click", (e) => { ... })`
- Identificar acción por `data-action="edit|delete|toggleDone|color"`

---

## 7. Diseño visual (estética moderna)

### 7.1. Paleta y superficies
- Fondo: neutral suave
- Tarjetas: superficie elevada con sombra suave
- Bordes: 1px con alpha bajo
- Animaciones: 120–200ms

### 7.2. Tipografía
- `font-family: system-ui, -apple-system, Segoe UI, Roboto, ...`
- Jerarquía:
  - título tarjeta: 16–18px
  - descripción: 14–16px
  - meta (createdAt): 12–13px

### 7.3. Microinteracciones
- Hover en PC, pero siempre con foco visible.
- Animación al completar y al crear tarjeta.

---

## 8. Responsividad y móvil

- Evitar scroll horizontal.
- Board ocupa altura disponible (`100dvh`).
- Botón “Nueva tarea” siempre accesible:
  - en móvil: botón flotante (FAB) o fijo en header.
- Asegurar que el drag no haga “scroll” accidental:
  - Interact.js + `touch-action: none` en tarjetas durante drag.

---

## 9. Seguridad / robustez (cliente)

- Sanitizar al insertar texto en DOM:
  - usar `textContent` (no `innerHTML`) para título y descripción.
- Manejo de errores de parseo de localStorage.
- No depender de APIs no soportadas sin fallback.

---

## 10. Calidad de entrega (lo que el LLM debe producir)

- Código limpio y comentado donde aporte valor.
- Sin dead code y sin dependencias innecesarias.
- Un `index.html` ejecutable con doble click (o servido por un static server).
- Estado persistente verificable:
  - recargar página mantiene tareas y posiciones.
