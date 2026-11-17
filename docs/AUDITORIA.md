# Auditoría y mejoras de CineMax

Proyecto demostrativo de la clase de Arquitectura. La app ya funcionaba completa; esta ronda agrega
cuatro mejoras puntuales y una capa visual, **sin borrar ni reescribir código original**.

## Regla de trabajo

| Regla | Cómo se cumplió |
|---|---|
| No tocar ni eliminar código original | `git diff` de `src/App.tsx` y `src/main.tsx`: **0 líneas eliminadas**. Solo inserciones marcadas con `[CineMax mejoras]` |
| Lo nuevo va por aparte | Todo vive en `src/cinemax/`, `firebase/` y `docs/` |
| No cambiar los colores | Se reutiliza la misma paleta (zinc, rojo `red-600`, esmeralda, ámbar, azul). Ver `SISTEMA-DE-DISENO.md` |
| El resto queda igual | Cartelera, pago, portería con QR, KDS, login, términos y precios no cambian de lógica |

La cuadrícula de butacas original sigue en `App.tsx`; se puede volver a ella con
`const MATRIZ_POR_ZONAS = false;` al inicio del archivo.

## Qué se conserva y por qué

| Elemento | Por qué se conserva |
|---|---|
| Paleta oscura zinc + rojo CineMax | Es la identidad pedida; funciona en sala oscura |
| Lógica de reserva (10 min, máx. 6, RUD, bloqueo por sesión) | Es la regla de negocio; la matriz nueva llama al mismo `handleSeatClick` |
| Firma HMAC y QR de boletos | Base del control de portería |
| Sincronización `/api/sync` del servidor de Vite | Sigue activa en modo demostración; con Firebase la reemplaza Firestore |
| Usuarios y contraseñas en el navegador | No se suben a Firestore para no exponerlos (ver pendientes) |

## Auditoría UX

| Problema | Por qué afecta | Severidad | Solución |
|---|---|---|---|
| Matriz de butacas sin zonas, sin pasillo ni información de la butaca | El cliente no sabe qué zona elige ni el precio hasta pagar | Alta | `SeatMatrix`: zonas frontal/central/posterior, pasillo central, detalle en vivo (butaca, zona, estado, precio), disponibilidad por zona |
| Matriz sin navegación por teclado ni etiquetas accesibles | Inaccesible con lector de pantalla o teclado | Alta | `role="grid"`, `aria-label` por butaca, `aria-pressed`, flechas para moverse (roving tabindex) |
| El administrador no podía crear, editar ni eliminar combos | Cambiar el menú exigía editar código | Alta | Panel `ConfectioneryAdmin` con validación, confirmación de borrado en línea y stock rápido |
| La compra no enviaba correo | El cliente dependía de la pantalla para tener sus QR | Alta | Correo HTML con QR por butaca, voucher y total; estado visible (en cola, enviado, error, reintento) |
| Datos solo en el navegador y en memoria del servidor de desarrollo | Al reiniciar se perdían; no había base de datos real | Alta | Vinculación con Firebase Firestore en tiempo real, como el proyecto ICA |
| Sin indicador de en qué paso va la compra | Desorientación en un flujo de 5 pantallas | Media | `PasosCompra` (Función, Butacas, Confitería, Pago, Listo) |
| En celular el encabezado comprimía la navegación y el widget de credenciales tapaba el botón principal | Se perdían pestañas y el CTA | Media | Navegación en su propia fila con desplazamiento; widget solo icono en celular (CSS) |
| Tabla de películas desbordaba a 390 px | Desplazamiento horizontal de toda la página | Media | La tabla se desplaza dentro de su tarjeta (CSS) |

## Auditoría visual

| Problema | Por qué afecta | Severidad | Solución |
|---|---|---|---|
| La fuente declarada (Plus Jakarta Sans) no se aplicaba: `font-sans` de Tailwind usaba la del sistema | Aspecto genérico y distinto en cada equipo | Alta | Fuentes autoalojadas (`@fontsource`) y `--font-sans` apuntando a Plus Jakarta Sans |
| Títulos con la misma voz que el cuerpo | Poca jerarquía | Media | Bricolage Grotesque (con tamaño óptico) en títulos, escala 1.25 |
| Precios y horas con anchos variables | Columnas que "bailan" | Baja | `tabular-nums` en todo `font-mono` |
| Sin foco visible ni respuesta al presionar | Navegación con teclado a ciegas | Media | Anillo de foco rojo de la marca, `scale(0.97)` al presionar |
| Modales aparecían de golpe | Cambio brusco | Baja | Entrada de 240 ms con curva ease-out, respeta `prefers-reduced-motion` |
| Pósters sin transición hacia la tarjeta | Etiquetas y título compiten con la imagen | Baja | Degradado inferior al color de la tarjeta |

## Funcionalidades que no se pueden romper (verificadas)

- Selección de 1 a 6 butacas, bloqueo por sesión, temporizador de 10 minutos.
- Butacas accesibles solo con RUD verificado.
- Confitería opcional, pago, emisión de boletos firmados y voucher.
- Mis Entradas filtra por el usuario.
- Portería valida QR (válido, duplicado, inválido).
- KDS despacha vouchers.
- CRUD de películas del administrador.

## Pruebas realizadas

| Prueba | Resultado |
|---|---|
| `tsc --noEmit` (app y Cloud Functions) | Sin errores |
| `vite build` | Correcto. Firebase se descarga solo si está configurado |
| Flujo completo con Playwright a 390, 820 y 1440 px (cartelera → butacas → confitería → pago → confirmación → admin) | Sin errores de consola de la app |
| Desbordamiento horizontal en cartelera, butacas y admin | 0 px en los tres anchos |
| CRUD de combos: crear, validar vacío, editar precio, eliminar con confirmación | Correcto |
| Emuladores de Firebase (Auth + Firestore con `firestore.rules`) con dos taquillas en servidores distintos | Combo creado en A aparece en B; butaca reservada en B se ve reservada y luego vendida en A; orden, boleto y correo quedan en Firestore |
| Reglas: lectura y escritura sin sesión | Rechazadas (403) |
| axe-core (WCAG 2.1 AA) sobre la sala, los pasos, los paneles del admin y el formulario de combos | 0 violaciones |
| Revisión de un agente de diseño y accesibilidad | 10 hallazgos, todos corregidos: ARIA del grid (celdas, encabezados de fila, grupos por zona), parada de Tab garantizada, vendida y "en compra" distinguibles sin color (trama y borde punteado), contraste AA del texto secundario, foco sin deformar controles, spinner con movimiento reducido, avisos de lector de pantalla, corte de palabras, trampa y retorno de foco en modales, objetivos táctiles de 44 px en pantallas táctiles |
| Reglas: borrar boletos u órdenes, o cambiar el estado de un correo desde el cliente | Rechazadas |

## Pendientes que requieren datos reales

- **Proyecto de Firebase de CineMax**: crear la app web y copiar sus datos en `.env.local` (ver `docs/FIREBASE.md`). Sin eso, la app queda en modo demostración.
- **Cuenta de correo** (Gmail con contraseña de aplicación) para los secretos `CORREO_USUARIO` y `CORREO_CLAVE`. El envío real requiere el plan Blaze de Firebase (Cloud Functions).
- **Roles con Firebase Auth**: hoy los roles se validan en la interfaz; para producción conviene migrar el ingreso a Firebase Auth con roles en Firestore, como en ICA, y endurecer las reglas.
- **Bloqueo atómico de butacas**: la sincronización es "último en escribir gana" por película; para alta concurrencia conviene una transacción por butaca.
