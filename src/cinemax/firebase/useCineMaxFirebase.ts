import type { Showtime, ConfectioneryItem, TicketRecord, ConfectioneryVoucher, Order } from '../../App';
import './reemplazarSyncLocal';
import { COLECCIONES } from './config';
import { useFirestoreMirror, EstadoSincronizacion } from './useFirestoreMirror';

interface Estado {
  showtimes: Showtime[];
  setShowtimes: (v: Showtime[]) => void;
  confectionery: ConfectioneryItem[];
  setConfectionery: (v: ConfectioneryItem[]) => void;
  tickets: TicketRecord[];
  setTickets: (v: TicketRecord[]) => void;
  vouchers: ConfectioneryVoucher[];
  setVouchers: (v: ConfectioneryVoucher[]) => void;
  orders: Order[];
  setOrders: (v: Order[]) => void;
}

/**
 * Vincula el estado de CineMax con Firestore: cartelera (con sus butacas), confitería,
 * boletos, vouchers y órdenes. Devuelve el estado general de la conexión.
 * Los usuarios y contraseñas NO se suben: siguen en el navegador como en la versión original.
 */
export function useCineMaxFirebase(e: Estado): EstadoSincronizacion {
  const estados = [
    useFirestoreMirror(COLECCIONES.peliculas, e.showtimes, e.setShowtimes, (m) => m.id),
    useFirestoreMirror(COLECCIONES.confiteria, e.confectionery, e.setConfectionery, (c) => c.id),
    useFirestoreMirror(COLECCIONES.boletos, e.tickets, e.setTickets, (t) => t.id, { soloAgregar: true }),
    useFirestoreMirror(COLECCIONES.vouchers, e.vouchers, e.setVouchers, (v) => v.code, { soloAgregar: true }),
    useFirestoreMirror(COLECCIONES.ordenes, e.orders, e.setOrders, (o) => o.id, { soloAgregar: true }),
  ];
  if (estados.includes('error')) return 'error';
  if (estados.includes('conectando')) return 'conectando';
  if (estados.every((s) => s === 'demo')) return 'demo';
  return 'en-linea';
}
