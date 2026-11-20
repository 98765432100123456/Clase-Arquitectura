import { useEffect, useRef, useState } from 'react';
import { firebase } from './conexion';
import { firebaseHabilitado } from './config';

export type EstadoSincronizacion = 'demo' | 'conectando' | 'en-linea' | 'error';

/**
 * Refleja un arreglo del estado de React en una colección de Firestore, en ambos sentidos:
 *
 *  - Lo que cambia en Firestore (otra taquilla, la portería, el KDS) llega al estado en tiempo real (onSnapshot).
 *  - Lo que cambia en el estado local se escribe en Firestore, solo los documentos que cambiaron.
 *
 * No reemplaza la lógica original de App.tsx: la app sigue usando sus useState y su localStorage;
 * este hook solo los mantiene enlazados con la base de datos cuando Firebase está configurado.
 *
 * Cada documento guarda { datos, orden }. `orden` conserva el orden de la lista
 * (lo nuevo primero, como hace la app con unshift / [nuevo, ...lista]).
 */
export function useFirestoreMirror<T>(
  coleccion: string,
  items: T[],
  setItems: (next: T[]) => void,
  idDe: (item: T) => string,
  { soloAgregar = false }: { soloAgregar?: boolean } = {}
): EstadoSincronizacion {
  const [estado, setEstado] = useState<EstadoSincronizacion>(firebaseHabilitado ? 'conectando' : 'demo');
  // id -> JSON del último valor conocido en la base, y su clave de orden.
  const cache = useRef(new Map<string, { json: string; orden: number }>());
  const listo = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const setRef = useRef(setItems);
  setRef.current = setItems;
  const idRef = useRef(idDe);
  idRef.current = idDe;

  // Base de datos -> estado
  useEffect(() => {
    if (!firebaseHabilitado) return;
    let cancelar: (() => void) | undefined;
    let activo = true;
    firebase()
      .then(({ db, fs }) => {
        if (!activo) return;
        const ref = fs.collection(db, coleccion);
        cancelar = fs.onSnapshot(
          ref,
          async (snap) => {
            // Primera vez con la colección vacía: se siembra con lo que la app ya tiene (datos iniciales).
            if (snap.empty && !listo.current) {
              listo.current = true;
              await escribirDiferencias(itemsRef.current, true);
              setEstado('en-linea');
              return;
            }
            const remotos = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as { datos: T; orden: number }) }))
              .filter((d) => d.datos !== undefined)
              .sort((a, b) => b.orden - a.orden);
            cache.current = new Map(remotos.map((r) => [r.id, { json: estable(r.datos), orden: r.orden }]));
            listo.current = true;
            setEstado('en-linea');
            const lista = remotos.map((r) => r.datos);
            // Evita renders inútiles si el estado ya es igual.
            if (estable(lista) !== estable(itemsRef.current)) setRef.current(lista);
          },
          (err) => {
            console.error(`[Firestore] ${coleccion}`, err);
            setEstado('error');
          }
        );
      })
      .catch((err) => {
        console.error('[Firebase] No se pudo conectar', err);
        setEstado('error');
      });
    return () => {
      activo = false;
      cancelar?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coleccion]);

  // Estado -> base de datos
  useEffect(() => {
    if (!firebaseHabilitado || !listo.current) return;
    escribirDiferencias(items, false).catch((err) => {
      console.error(`[Firestore] escritura ${coleccion}`, err);
      setEstado('error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function escribirDiferencias(lista: T[], siembra: boolean) {
    const { db, fs } = await firebase();
    const lote = fs.writeBatch(db);
    let cambios = 0;
    const vistos = new Set<string>();
    const ahora = Date.now();
    const maxOrden = Math.max(0, ...Array.from(cache.current.values()).map((v) => v.orden));

    lista.forEach((item, i) => {
      const id = idRef.current(item);
      if (!id) return;
      vistos.add(id);
      const json = estable(item);
      const previo = cache.current.get(id);
      if (previo && previo.json === json) return;
      // Orden: en la siembra se respeta la posición; un elemento nuevo queda arriba.
      const orden = previo ? previo.orden : siembra ? ahora - i : Math.max(ahora, maxOrden + 1) + (lista.length - i);
      // JSON.parse(JSON.stringify()) elimina los undefined, que Firestore no acepta.
      lote.set(fs.doc(db, coleccion, id), { datos: JSON.parse(json), orden, actualizado: fs.serverTimestamp() });
      cache.current.set(id, { json, orden });
      cambios++;
    });

    // Boletos, vouchers y órdenes nunca se borran: un estado local desactualizado no puede eliminarlos.
    if (!siembra && !soloAgregar) {
      for (const id of Array.from(cache.current.keys())) {
        if (!vistos.has(id)) {
          lote.delete(fs.doc(db, coleccion, id));
          cache.current.delete(id);
          cambios++;
        }
      }
    }
    if (cambios > 0) await lote.commit();
  }

  return estado;
}

/** JSON con las claves ordenadas: Firestore no conserva el orden de los campos, así la comparación es estable. */
function estable(valor: unknown): string {
  return JSON.stringify(valor, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.keys(v)
          .sort()
          .reduce((acc: Record<string, unknown>, k) => ((acc[k] = (v as Record<string, unknown>)[k]), acc), {})
      : v
  );
}
