import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { AJUSTES_FIREBASE, firebaseHabilitado } from './config';

/** Módulos del SDK de Firebase; se descargan la primera vez que se usan, nunca en modo demostración. */
export interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  fs: typeof import('firebase/firestore');
}

let conexion: Promise<Firebase> | null = null;

export function firebase(): Promise<Firebase> {
  if (!firebaseHabilitado) return Promise.reject(new Error('Firebase no está configurado (modo demostración).'));
  conexion ??= conectar();
  return conexion;
}

async function conectar(): Promise<Firebase> {
  const [{ initializeApp }, fa, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const config = AJUSTES_FIREBASE.emuladores
    ? { ...AJUSTES_FIREBASE.config, apiKey: 'clave-del-emulador', projectId: AJUSTES_FIREBASE.config.projectId || 'demo-cinemax' }
    : AJUSTES_FIREBASE.config;
  const app = initializeApp(config as Record<string, string>);
  const auth = fa.getAuth(app);
  auth.languageCode = 'es';
  const db = fs.getFirestore(app);
  if (AJUSTES_FIREBASE.emuladores) {
    fa.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  // Cada navegador obtiene una identidad anónima: las reglas exigen request.auth != null,
  // así nadie escribe en la base sin pasar por el SDK de la aplicación.
  if (!auth.currentUser) await fa.signInAnonymously(auth);
  return { app, auth, db, fs };
}
