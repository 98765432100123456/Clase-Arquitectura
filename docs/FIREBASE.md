# Vinculación con Firebase

Mismo esquema del proyecto ICA (`bienestar-animal-ica`): Firestore como base de datos,
reglas de seguridad versionadas, Cloud Function con nodemailer para los correos y los
secretos del correo en Secret Manager.

## Qué se guarda

| Colección | Contenido | Quién escribe |
|---|---|---|
| `peliculas` | Cartelera con funciones y el estado de cada butaca | App (admin y bloqueo de butacas) |
| `confiteria` | Combos y productos con precio y stock | App (admin y descuento de stock) |
| `boletos` | Boletos firmados con su QR | App (compra) y portería (marcar usado). No se borran |
| `vouchers` | Vouchers de confitería | App (compra) y KDS (despachar). No se borran |
| `ordenes` | Órdenes pagadas | App (compra). Inmutables |
| `correos` | Cola de correos de confirmación | La app crea; la Cloud Function cambia el estado |

Cada documento guarda `{ datos, orden, actualizado }`. Los usuarios y contraseñas **no** se suben.

## Puesta en marcha

1. Crear el proyecto en la consola de Firebase (se sugiere el id `cinemax-arquitectura`; si es otro, cambiarlo en `.firebaserc`).
2. Activar **Firestore** y en **Authentication** habilitar el proveedor **Anónimo**.
3. Registrar una app web y copiar su configuración en `.env.local` usando `.env.firebase.example` como guía.
4. Publicar reglas e índices: `npx firebase-tools deploy --only firestore`.
5. Correos (requiere plan Blaze):
   ```bash
   npx firebase-tools functions:secrets:set CORREO_USUARIO   # cuenta de Gmail que envía
   npx firebase-tools functions:secrets:set CORREO_CLAVE     # contraseña de aplicación de Google
   cd firebase/funciones && npm install && cd ../..
   npx firebase-tools deploy --only functions
   ```
6. `npm run dev`. En Administración, el indicador debe decir **Firebase en línea**.

La primera vez, si las colecciones están vacías, la app sube los datos iniciales que tenga.

## Probar sin tocar el proyecto real

```bash
npx firebase-tools emulators:start --only firestore,auth --project demo-cinemax
VITE_FIREBASE_EMULADORES=true VITE_FIREBASE_PROJECT_ID=demo-cinemax npm run dev
```

## Sin configuración

Si `.env.local` no tiene los datos, la app queda en **modo demostración**: todo funciona como
antes (localStorage + `/api/sync` del servidor de Vite) y los correos se pueden ver y abrir en la
app de correo del equipo, marcados como "Demostración".
