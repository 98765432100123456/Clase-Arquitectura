import type { Order, TicketRecord, ConfectioneryVoucher } from '../../App';
import { construirCorreoCompra, CorreoCompra } from './plantillaCorreo';
import { firebase } from '../firebase/conexion';
import { COLECCIONES, firebaseHabilitado } from '../firebase/config';

/**
 * Envío de correos transaccionales.
 *
 * Con Firebase: se crea el documento correos/{ordenId}. La Cloud Function `enviarCorreoCompra`
 * (firebase/funciones) lo detecta, envía el correo con nodemailer y actualiza `estado`
 * a "enviado" o "error". Es el mismo esquema del proyecto ICA (cuenta y clave en Secret Manager).
 *
 * Sin Firebase (modo demostración): el correo queda en la bandeja local como "simulado"
 * para poder verlo y abrirlo en la app de correo del equipo.
 */
export type EstadoCorreo = 'pendiente' | 'enviado' | 'error' | 'simulado';

export interface RegistroCorreo extends CorreoCompra {
  id: string;
  ordenId: string;
  estado: EstadoCorreo;
  creado: number;
  error?: string;
  intentos: number;
}

const CLAVE_LOCAL = 'cmx_correos_v1';
const oyentes = new Set<() => void>();
const enviados = new Set<string>();

function leerLocal(): RegistroCorreo[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '[]');
  } catch {
    return [];
  }
}

function guardarLocal(lista: RegistroCorreo[]) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista.slice(0, 100)));
  } catch {
    /* almacenamiento lleno o bloqueado: el correo sigue visible en la sesión */
  }
  oyentes.forEach((f) => f());
}

export async function enviarCorreoCompra(
  orden: Order,
  boletos: TicketRecord[],
  voucher?: ConfectioneryVoucher | null,
  { reenviar = false } = {}
): Promise<RegistroCorreo> {
  const correo = construirCorreoCompra(orden, boletos, voucher);
  const id = reenviar ? `${orden.id}-${Date.now().toString(36)}` : orden.id;
  const previo = leerLocal().find((c) => c.id === id);
  if (!reenviar && (enviados.has(id) || previo)) return previo ?? (await esperarRegistro(id));
  enviados.add(id);

  const registro: RegistroCorreo = {
    ...correo,
    id,
    ordenId: orden.id,
    estado: firebaseHabilitado ? 'pendiente' : 'simulado',
    creado: Date.now(),
    intentos: 0,
  };
  guardarLocal([registro, ...leerLocal().filter((c) => c.id !== id)]);

  if (firebaseHabilitado) {
    try {
      const { db, fs } = await firebase();
      await fs.setDoc(fs.doc(db, COLECCIONES.correos, id), {
        para: registro.para,
        nombre: registro.nombre,
        asunto: registro.asunto,
        texto: registro.texto,
        html: registro.html,
        ordenId: registro.ordenId,
        estado: 'pendiente',
        intentos: 0,
        creado: fs.serverTimestamp(),
      });
    } catch (e) {
      actualizarLocal(id, { estado: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }
  return leerLocal().find((c) => c.id === id) ?? registro;
}

async function esperarRegistro(id: string): Promise<RegistroCorreo> {
  await new Promise((r) => setTimeout(r, 50));
  return leerLocal().find((c) => c.id === id)!;
}

function actualizarLocal(id: string, cambios: Partial<RegistroCorreo>) {
  guardarLocal(leerLocal().map((c) => (c.id === id ? { ...c, ...cambios } : c)));
}

/**
 * Suscripción a la bandeja de correos. Con Firebase escucha la colección `correos`
 * (el estado lo actualiza la Cloud Function); en modo demostración, la bandeja local.
 */
export function escucharCorreos(cb: (lista: RegistroCorreo[]) => void): () => void {
  const local = () => cb(leerLocal());
  oyentes.add(local);
  local();
  let cancelarRemoto: (() => void) | undefined;
  let activo = true;
  if (firebaseHabilitado) {
    firebase()
      .then(({ db, fs }) => {
        if (!activo) return;
        const q = fs.query(fs.collection(db, COLECCIONES.correos), fs.orderBy('creado', 'desc'), fs.limit(100));
        cancelarRemoto = fs.onSnapshot(
          q,
          (snap) => {
            const remotos = snap.docs.map((d) => {
              const x = d.data() as any;
              return {
                id: d.id,
                ordenId: x.ordenId,
                para: x.para,
                nombre: x.nombre,
                asunto: x.asunto,
                texto: x.texto,
                html: x.html,
                estado: x.estado,
                error: x.error,
                intentos: x.intentos ?? 0,
                creado: x.creado?.toMillis?.() ?? Date.now(),
              } as RegistroCorreo;
            });
            // Lo remoto es la verdad; se conservan en local solo para la vista previa sin conexión.
            guardarLocal(remotos);
          },
          (err) => console.error('[Firestore] correos', err)
        );
      })
      .catch(() => {});
  }
  return () => {
    activo = false;
    oyentes.delete(local);
    cancelarRemoto?.();
  };
}

/** Enlace mailto con el resumen en texto (respaldo cuando no hay servidor de correo configurado). */
export function enlaceMailto(c: Pick<CorreoCompra, 'para' | 'asunto' | 'texto'>) {
  return `mailto:${encodeURIComponent(c.para)}?subject=${encodeURIComponent(c.asunto)}&body=${encodeURIComponent(c.texto)}`;
}
