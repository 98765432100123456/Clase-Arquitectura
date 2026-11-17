import React, { useEffect, useState } from 'react';
import { Mail, MailCheck, MailWarning, RefreshCw, X, ExternalLink, Inbox } from 'lucide-react';
import type { Order, TicketRecord, ConfectioneryVoucher } from '../../App';
import { useFocoDialogo } from './useFocoDialogo';
import { enviarCorreoCompra, escucharCorreos, enlaceMailto, RegistroCorreo } from '../correo/servicioCorreo';

/** Lista de correos en vivo (Firestore o bandeja local). */
export function useCorreos() {
  const [lista, setLista] = useState<RegistroCorreo[]>([]);
  useEffect(() => escucharCorreos(setLista), []);
  return lista;
}

/**
 * Se muestra en la pantalla "¡Compra Exitosa!": envía el correo de la orden una sola vez
 * y muestra su estado real (pendiente, enviado, error o simulado).
 */
export function AvisoCorreoCompra({
  orden,
  tickets,
  vouchers,
}: {
  orden: Order;
  tickets: TicketRecord[];
  vouchers: ConfectioneryVoucher[];
}) {
  const correos = useCorreos();
  const [abierto, setAbierto] = useState(false);
  const boletos = tickets.filter((t) => orden.ticketIds.includes(t.id));
  const voucher = orden.voucherCode ? vouchers.find((v) => v.code === orden.voucherCode) : null;

  useEffect(() => {
    if (boletos.length > 0) enviarCorreoCompra(orden, boletos, voucher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orden.id, boletos.length]);

  const registro = correos.find((c) => c.ordenId === orden.id);
  const estado = registro?.estado ?? 'pendiente';

  const reintentar = () => enviarCorreoCompra(orden, boletos, voucher, { reenviar: true });

  return (
    <div className="cmx-aviso-correo" data-estado={estado}>
      <div className="cmx-aviso-correo__icono" aria-hidden="true">
        {estado === 'enviado' ? (
          <MailCheck className="w-5 h-5" />
        ) : estado === 'error' ? (
          <MailWarning className="w-5 h-5" />
        ) : estado === 'pendiente' ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Mail className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left" role="status">
        <p className="text-sm font-semibold text-white">
          {estado === 'enviado' && 'Te enviamos las entradas por correo'}
          {estado === 'pendiente' && 'Enviando tus entradas por correo…'}
          {estado === 'error' && 'No pudimos enviar el correo'}
          {estado === 'simulado' && 'Correo de confirmación listo'}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5 [overflow-wrap:anywhere]">
          {estado === 'error'
            ? `${registro?.error || 'El servidor de correo no respondió.'} Tus entradas siguen disponibles en Mis Entradas.`
            : estado === 'simulado'
              ? `Para ${orden.customerEmail}. Modo demostración: conecta Firebase para enviarlo de verdad.`
              : `Para ${orden.customerEmail}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        {registro && (
          <button type="button" onClick={() => setAbierto(true)} className="cmx-boton-sec">
            Ver correo
          </button>
        )}
        {estado === 'error' && (
          <button type="button" onClick={reintentar} className="cmx-boton-sec">
            Reintentar
          </button>
        )}
        {estado === 'simulado' && registro && (
          <a href={enlaceMailto(registro)} className="cmx-boton-sec">
            Abrir en mi correo
          </a>
        )}
      </div>
      {abierto && registro && <VistaPreviaCorreo correo={registro} onCerrar={() => setAbierto(false)} />}
    </div>
  );
}

const ETIQUETA: Record<RegistroCorreo['estado'], string> = {
  enviado: 'Enviado',
  pendiente: 'En cola',
  error: 'Error',
  simulado: 'Demostración',
};

/** Bandeja de correos transaccionales para el administrador. */
export function BandejaCorreos() {
  const correos = useCorreos();
  const [abierto, setAbierto] = useState<RegistroCorreo | null>(null);

  return (
    <section className="cmx-panel" aria-labelledby="cmx-correos-titulo">
      <header className="cmx-panel__cabecera">
        <div>
          <h3 id="cmx-correos-titulo" className="cmx-panel__titulo">
            <Inbox className="w-4 h-4 text-red-500" aria-hidden="true" />
            Correos enviados
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Confirmaciones de compra con los QR de cada butaca.</p>
        </div>
      </header>
      {correos.length === 0 ? (
        <div className="cmx-vacio">
          <Mail className="w-8 h-8 text-zinc-600" aria-hidden="true" />
          <p className="text-sm text-zinc-300 font-semibold">Aún no hay correos</p>
          <p className="text-xs text-zinc-400">Cada compra aprobada envía un correo al cliente y aparece aquí.</p>
        </div>
      ) : (
        <ul className="cmx-lista-correos">
          {correos.slice(0, 12).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setAbierto(c)} className="cmx-correo-fila">
                <span className="cmx-chip" data-estado={c.estado}>
                  {ETIQUETA[c.estado] ?? c.estado}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-white font-semibold truncate">{c.asunto}</span>
                  <span className="block text-[11px] text-zinc-400 truncate">{c.para}</span>
                </span>
                <time className="text-[11px] text-zinc-400 font-mono shrink-0" dateTime={new Date(c.creado).toISOString()}>
                  {new Date(c.creado).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && <VistaPreviaCorreo correo={abierto} onCerrar={() => setAbierto(null)} />}
    </section>
  );
}

export function VistaPreviaCorreo({ correo, onCerrar }: { correo: RegistroCorreo; onCerrar: () => void }) {
  const dialogo = useFocoDialogo<HTMLDivElement>();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={onCerrar}>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-label={`Correo: ${correo.asunto}`}
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-800">
          <div className="min-w-0 text-xs space-y-0.5">
            <p className="text-white font-semibold text-sm truncate">{correo.asunto}</p>
            <p className="text-zinc-400 truncate">
              Para: <span className="font-mono text-zinc-300">{correo.para}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={enlaceMailto(correo)} className="cmx-icono" aria-label="Abrir en mi app de correo" title="Abrir en mi app de correo">
              <ExternalLink className="w-4 h-4" />
            </a>
            <button type="button" onClick={onCerrar} className="cmx-icono" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          title="Vista previa del correo"
          srcDoc={correo.html}
          sandbox=""
          className="w-full flex-1 min-h-[60vh] rounded-b-2xl bg-zinc-950"
        />
      </div>
    </div>
  );
}
