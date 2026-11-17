/**
 * Proyecto de Firebase de CineMax.
 *
 * Igual que en el proyecto ICA, estos datos identifican el proyecto y son públicos por diseño:
 * la protección está en las reglas de Firestore (firebase/firestore.rules), no en ocultarlos.
 * Se leen de variables VITE_FIREBASE_* (archivo .env.local, ver .env.firebase.example).
 *
 * Si no hay configuración, la aplicación sigue funcionando en "modo demostración"
 * con localStorage, exactamente como antes.
 */
const env = (import.meta as any).env ?? {};

export const PROYECTO_CINEMAX = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const AJUSTES_FIREBASE = {
  config: PROYECTO_CINEMAX,
  /** Usa los emuladores locales (npm run emuladores en firebase/). */
  emuladores: env.VITE_FIREBASE_EMULADORES === 'true',
};

/** true cuando hay un proyecto configurado (o emuladores): se activa la sincronización con Firestore. */
export const firebaseHabilitado = Boolean(
  (PROYECTO_CINEMAX.apiKey && PROYECTO_CINEMAX.projectId && PROYECTO_CINEMAX.appId) || AJUSTES_FIREBASE.emuladores
);

/** Nombres de las colecciones de Firestore. */
export const COLECCIONES = {
  peliculas: 'peliculas',
  confiteria: 'confiteria',
  boletos: 'boletos',
  vouchers: 'vouchers',
  ordenes: 'ordenes',
  correos: 'correos',
} as const;
