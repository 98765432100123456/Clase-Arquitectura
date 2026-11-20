import type { Order, TicketRecord, ConfectioneryVoucher } from '../../App';

/**
 * Correo de confirmación de compra, en texto plano y en HTML con tablas
 * (compatible con Gmail, Outlook y Apple Mail). Mismos colores de la app: zinc + rojo CineMax.
 * La Cloud Function (firebase/funciones) envía exactamente este HTML.
 */
export interface CorreoCompra {
  para: string;
  nombre: string;
  asunto: string;
  texto: string;
  html: string;
}

const cop = (n: number) => `$${Number(n || 0).toLocaleString('es-CO')} COP`;
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function urlQr(t: TicketRecord) {
  if (t.qrDataUrl && t.qrDataUrl.startsWith('http')) return t.qrDataUrl;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(JSON.stringify(t.payload))}`;
}

export function construirCorreoCompra(
  orden: Order,
  boletos: TicketRecord[],
  voucher?: ConfectioneryVoucher | null
): CorreoCompra {
  const asunto = `Tus entradas para ${orden.movieTitle}, orden ${orden.id}`;

  const texto = [
    'CineMax Entertainment Group',
    '',
    `Hola ${orden.customerName}, tu compra fue aprobada.`,
    '',
    `Orden: ${orden.id}`,
    `Película: ${orden.movieTitle}`,
    `Sala: ${orden.roomName}`,
    `Función: ${orden.showtimeTime}`,
    `Butacas: ${orden.seatIds.join(', ')}`,
    '',
    ...orden.confectioneryItems.map((i) => `${i.quantity} x ${i.name}: ${cop(i.unitPrice * i.quantity)}`),
    voucher ? `Voucher de confitería: ${voucher.code} (preséntalo en la barra)` : '',
    '',
    `Total pagado: ${cop(orden.totalAmount)}`,
    '',
    'Presenta el código QR de cada butaca en la portería. Cada código sirve para un solo ingreso.',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');

  const filasBoletos = boletos
    .map(
      (t) => `
      <td style="padding:8px;text-align:center;vertical-align:top" width="50%">
        <div style="background:#ffffff;border-radius:12px;padding:10px;display:inline-block">
          <img src="${esc(urlQr(t))}" width="160" height="160" alt="Código QR de la butaca ${esc(t.seatId)}" style="display:block;border:0" />
        </div>
        <div style="font:700 15px Arial,Helvetica,sans-serif;color:#fafafa;margin-top:8px">Butaca ${esc(t.seatId)}</div>
        <div style="font:12px 'Courier New',monospace;color:#71717a;margin-top:2px">${esc(t.id)}</div>
      </td>`
    )
    .reduce<string[]>((filas, celda, i) => {
      if (i % 2 === 0) filas.push(celda);
      else filas[filas.length - 1] += celda;
      return filas;
    }, [])
    .map((f) => `<tr>${f}</tr>`)
    .join('');

  const filasConfiteria = orden.confectioneryItems
    .map(
      (i) => `<tr>
        <td style="padding:4px 0;font:14px Arial,Helvetica,sans-serif;color:#d4d4d8">${i.quantity} x ${esc(i.name)}</td>
        <td style="padding:4px 0;font:14px 'Courier New',monospace;color:#d4d4d8;text-align:right">${cop(i.unitPrice * i.quantity)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>${esc(asunto)}</title></head>
  <body style="margin:0;padding:24px 12px;background:#09090b;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:16px">
      <tr><td style="padding:24px 28px 0">
        <span style="display:inline-block;background:#dc2626;color:#fff;font:700 13px Arial,Helvetica,sans-serif;padding:6px 10px;border-radius:8px">CineMax</span>
      </td></tr>
      <tr><td style="padding:18px 28px 4px;font:800 24px Arial,Helvetica,sans-serif;color:#ffffff;line-height:1.25">
        ¡Listo, ${esc(orden.customerName.split(' ')[0])}! Tus entradas están confirmadas.
      </td></tr>
      <tr><td style="padding:4px 28px 18px;font:14px Arial,Helvetica,sans-serif;color:#a1a1aa;line-height:1.5">
        Orden <strong style="color:#fff;font-family:'Courier New',monospace">${esc(orden.id)}</strong>. Presenta cada código QR en la portería; sirve para un solo ingreso.
      </td></tr>
      <tr><td style="padding:0 28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;border:1px solid #27272a;border-radius:12px">
          <tr><td style="padding:16px 18px">
            <div style="font:700 18px Arial,Helvetica,sans-serif;color:#fff">${esc(orden.movieTitle)}</div>
            <div style="font:14px Arial,Helvetica,sans-serif;color:#a1a1aa;margin-top:4px">${esc(orden.roomName)}, función de las <strong style="color:#fff">${esc(orden.showtimeTime)}</strong></div>
            <div style="font:14px Arial,Helvetica,sans-serif;color:#a1a1aa;margin-top:4px">Butacas: <strong style="color:#fff;font-family:'Courier New',monospace">${esc(orden.seatIds.join(', '))}</strong></div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:12px 20px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filasBoletos}</table>
      </td></tr>
      ${
        voucher
          ? `<tr><td style="padding:12px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #b45309;border-radius:12px">
          <tr><td style="padding:14px 18px">
            <div style="font:13px Arial,Helvetica,sans-serif;color:#a1a1aa">Voucher de confitería, preséntalo en la barra express</div>
            <div style="font:800 26px 'Courier New',monospace;color:#fbbf24;letter-spacing:2px;margin-top:4px">${esc(voucher.code)}</div>
          </td></tr>
        </table>
      </td></tr>`
          : ''
      }
      <tr><td style="padding:18px 28px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font:14px Arial,Helvetica,sans-serif;color:#d4d4d8">Entradas (${orden.seatIds.length})</td>
            <td style="padding:4px 0;font:14px 'Courier New',monospace;color:#d4d4d8;text-align:right">${cop(orden.subtotalTickets)}</td>
          </tr>
          ${filasConfiteria}
          <tr>
            <td style="padding:12px 0 0;border-top:1px solid #27272a;font:700 16px Arial,Helvetica,sans-serif;color:#fff">Total pagado</td>
            <td style="padding:12px 0 0;border-top:1px solid #27272a;font:700 16px 'Courier New',monospace;color:#34d399;text-align:right">${cop(orden.totalAmount)}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 28px 28px;font:12px Arial,Helvetica,sans-serif;color:#71717a;line-height:1.5">
        CineMax Entertainment Group S.A.S., NIT 900.824.110-1. Recibes este correo porque compraste entradas con esta dirección.
        Nunca te pediremos claves ni datos de tarjeta por correo.
      </td></tr>
    </table>
  </body>
</html>`;

  return { para: orden.customerEmail, nombre: orden.customerName, asunto, texto, html };
}
