import { firebaseHabilitado } from './config';

/**
 * App.tsx sincroniza dispositivos consultando /api/sync cada 1,5 s (memoria del servidor de Vite).
 * Cuando Firestore está activo, ese canal y Firestore competirían y se pisarían los cambios
 * (un estado viejo del servidor local podría revertir una butaca bloqueada en otra taquilla).
 *
 * Por eso, solo con Firebase configurado, /api/sync responde vacío y no guarda nada:
 * el código original sigue intacto y simplemente no recibe datos por ese canal,
 * porque ahora la fuente de verdad es Firestore (onSnapshot en tiempo real).
 */
if (firebaseHabilitado && typeof window !== 'undefined' && !(window as any).__cmxSyncReemplazado) {
  (window as any).__cmxSyncReemplazado = true;
  const original = window.fetch.bind(window);
  window.fetch = (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
    if (/\/api\/sync(\?|$)/.test(url)) {
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return original(entrada as RequestInfo, init);
  };
}

export {};
