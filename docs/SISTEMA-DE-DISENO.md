# Sistema de diseño de CineMax

## Idea

**La sala a oscuras.** La interfaz se comporta como un cine: fondo negro que no compite,
una sola luz roja que indica qué hacer, y la información aparece cuando se necesita (como el
acomodador que alumbra la fila). El elemento memorable sale del negocio: el mapa de la sala.

Principios:

1. **Una sola luz por pantalla.** El rojo CineMax solo marca la acción principal, la selección y el foco.
2. **El dato manda.** Precios, horas y códigos en monoespaciada tabular; nada se mueve al cambiar un número.
3. **Respuesta inmediata.** Todo lo que se presiona responde en menos de 160 ms.
4. **Honestidad.** Estados reales: "Modo demostración", "En cola", "Error, reintentar". Nada simulado se presenta como real.

## Paleta (la original, sin cambios)

| Token | Valor | Uso | Contraste sobre `--cmx-telon` |
|---|---|---|---|
| `--cmx-noche` | `#09090b` (zinc-950) | Fondo | — |
| `--cmx-telon` | `#18181b` (zinc-900) | Superficies | — |
| `--cmx-butaca` | `#27272a` (zinc-800) | Bordes, controles | — |
| `--cmx-texto-2` | `#a1a1aa` (zinc-400) | Texto secundario | 6.6:1 (AA) |
| blanco | `#ffffff` | Texto principal | 17.7:1 |
| `--cmx-rojo` | `#dc2626` (red-600) | Acción principal, selección | Texto blanco sobre rojo 4.8:1 (AA) |
| `--cmx-esmeralda` | `#34d399` | Éxito, en línea | 9.2:1 |
| `--cmx-ambar` | `#fbbf24` | Advertencia, voucher | 10.6:1 |

## Tipografía

| Rol | Fuente | Por qué |
|---|---|---|
| Títulos | Bricolage Grotesque (variable, tamaño óptico) | Carácter de cartel de cine sin caer en la condensada típica |
| Texto | Plus Jakarta Sans (variable) | Ya era la elegida en `index.html`, pero Tailwind no la aplicaba |
| Cifras y códigos | JetBrains Mono, `tabular-nums` | Precios y horas alineados |

Todas autoalojadas con `@fontsource` (sin depender de Google Fonts en tiempo de ejecución).
Escala modular 1.25: 12 · 15 · 19 · 24 · 30 px (títulos de sección con `clamp`).

## Espaciado, radios y elevación

- Base 4 px. Paneles: 20 px en celular, 24 px desde 640 px.
- Radios por jerarquía: paneles 16 px, tarjetas internas 12 px, controles 8 px, butaca 11/6 px (forma de silla).
- Elevación: sin sombras decorativas; los niveles se marcan con el tono (`noche` → `telon` → `butaca`). Solo modales y avisos flotantes llevan sombra.

## Estados interactivos

| Estado | Tratamiento |
|---|---|
| Hover (solo con puntero fino) | Borde o fondo un tono más claro |
| Foco | Anillo de 2 px `--cmx-rojo-claro`, separación 2 px |
| Presionado | `scale(0.97)`; butaca `scale(0.92)` |
| Deshabilitado | Opacidad y cursor `not-allowed` |
| Error de formulario | Borde rojo + mensaje que dice cómo arreglarlo |
| Vacío | Recuadro punteado con qué hacer a continuación |

## Movimiento

- Curva `--cmx-ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- Una secuencia al cargar: tarjetas de cartelera escalonadas (60 ms) y filas de la sala (35 ms).
- Modales 240 ms; aviso flotante entra desde abajo con `@starting-style`.
- `prefers-reduced-motion`: se quitan desplazamientos y escalas, quedan los cambios de color.

## Matriz de la sala (wireframe)

```
            ╭──────────── Pantalla ────────────╮
 Zona frontal ─────────────────────── 16 libres
 A  [♿][♿][3][4]   [5][6][♿][♿]  A
 B  [1] [2] [3][4]   [5][6][7] [8]  B
 Zona central ─────────────────────── 14 libres
 C  [1] [2] [■][■]   [5][6][7] [8]  C     ■ = tu selección
 D  ...
 Zona posterior ───────────────────── 16 libres
 E  ...
 F  ...
        D4   Zona central   Disponible   $16.000
 Leyenda                     Frontal ▬  Central ▬  Posterior ▬
```

## Decisiones

| Primera idea | Por qué se descartó | Decisión final |
|---|---|---|
| Precios distintos por zona (VIP) | Cambiaba la lógica de tarifas original | Zonas informativas con el mismo precio; la estructura permite agregar tarifa por zona después |
| Sala en perspectiva 3D | Bonita, pero reduce la precisión al tocar en celular | Pantalla curva en SVG y cuadrícula plana |
| Tooltip flotante por butaca | Tapa butacas vecinas y no existe en táctil | Línea de detalle fija bajo la sala, también anunciada por lector de pantalla |
| `window.confirm` para borrar combos | Saca al usuario del contexto | Confirmación en la misma tarjeta |
| Reescribir `App.tsx` en componentes | Prohibido por la regla de no tocar el original | Inserciones mínimas + módulos en `src/cinemax/` |
