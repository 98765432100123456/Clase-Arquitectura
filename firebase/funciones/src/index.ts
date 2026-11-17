/**
 * Cloud Functions de CineMax: envío de correos de confirmación de compra.
 *
 * Mismo esquema del proyecto ICA: la cuenta y la contraseña de aplicación del correo
 * viven en Secret Manager (CORREO_USUARIO, CORREO_CLAVE), nunca en el código.
 *
 *   firebase functions:secrets:set CORREO_USUARIO   (ej. cinemax.notificaciones@gmail.com)
 *   firebase functions:secrets:set CORREO_CLAVE     (contraseña de aplicación de 16 letras)
 *
 * La interfaz crea correos/{id} con estado "pendiente"; esta función lo envía y deja
 * el estado en "enviado" o "error" (la app lo muestra en vivo al cliente y al administrador).
 */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';

initializeApp();

const CORREO_USUARIO = defineSecret('CORREO_USUARIO');
const CORREO_CLAVE = defineSecret('CORREO_CLAVE');
const SERVIDOR = process.env.CORREO_SERVIDOR || 'smtp.gmail.com';

const correoValido = (c: unknown): c is string => typeof c === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) && c.length <= 254;

export const enviarCorreoCompra = onDocumentCreated(
  { document: 'correos/{id}', secrets: [CORREO_USUARIO, CORREO_CLAVE], region: 'us-central1', maxInstances: 5 },
  async (evento) => {
    const snap = evento.data;
    if (!snap) return;
    const d = snap.data() as { para?: string; nombre?: string; asunto?: string; texto?: string; html?: string; estado?: string; ordenId?: string };
    if (d.estado !== 'pendiente') return;

    // La orden debe existir: así nadie usa la colección para enviar correos arbitrarios.
    // La app escribe la orden y el correo casi al mismo tiempo: se espera hasta ~10 s a que exista.
    let orden = d.ordenId ? await getFirestore().doc(`ordenes/${d.ordenId}`).get() : null;
    for (let i = 0; d.ordenId && !orden?.exists && i < 5; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      orden = await getFirestore().doc(`ordenes/${d.ordenId}`).get();
    }
    const datosOrden = orden?.exists ? (orden.get('datos') as { customerEmail?: string } | undefined) : undefined;
    if (!datosOrden || !correoValido(d.para) || datosOrden.customerEmail?.toLowerCase() !== d.para!.toLowerCase()) {
      await snap.ref.update({ estado: 'error', error: 'La orden no existe o el destinatario no coincide.', intentos: FieldValue.increment(1) });
      return;
    }

    try {
      const { createTransport } = await import('nodemailer');
      const transporte = createTransport({
        host: SERVIDOR,
        port: 465,
        secure: true,
        auth: { user: CORREO_USUARIO.value(), pass: CORREO_CLAVE.value() },
      });
      await transporte.sendMail({
        from: { name: 'CineMax', address: CORREO_USUARIO.value() },
        to: { name: String(d.nombre || ''), address: d.para! },
        subject: String(d.asunto || 'Tus entradas CineMax').slice(0, 200),
        text: String(d.texto || ''),
        html: String(d.html || ''),
      });
      await snap.ref.update({ estado: 'enviado', enviado: FieldValue.serverTimestamp(), intentos: FieldValue.increment(1), error: FieldValue.delete() });
    } catch (e) {
      logger.error('No se pudo enviar el correo', { id: snap.id, error: String(e) });
      await snap.ref.update({
        estado: 'error',
        error: 'El servidor de correo rechazó el envío. Intenta de nuevo en unos minutos.',
        intentos: FieldValue.increment(1),
      });
    }
  }
);
