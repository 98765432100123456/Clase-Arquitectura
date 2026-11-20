import React from 'react';
import { Check, Database, CloudOff, Cloud, AlertTriangle } from 'lucide-react';
import type { EstadoSincronizacion } from '../firebase/useFirestoreMirror';

/** Pasos del flujo de compra: orienta al cliente sobre dónde está y cuánto falta. */
const PASOS = [
  { id: 'billboard', texto: 'Función' },
  { id: 'seats', texto: 'Butacas' },
  { id: 'confectionery', texto: 'Confitería' },
  { id: 'checkout', texto: 'Pago' },
  { id: 'confirmation', texto: 'Listo' },
] as const;

export function PasosCompra({ paso }: { paso: string }) {
  const actual = Math.max(0, PASOS.findIndex((p) => p.id === paso));
  return (
    <nav aria-label="Progreso de la compra" className="cmx-pasos">
      <ol>
        {PASOS.map((p, i) => {
          const estado = i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
          return (
            <li key={p.id} data-estado={estado} aria-current={estado === 'actual' ? 'step' : undefined}>
              <span className="cmx-pasos__punto" aria-hidden="true">
                {estado === 'hecho' ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className="cmx-pasos__texto">{p.texto}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Indicador de la base de datos: Firebase en línea, conectando, error o modo demostración. */
export function EstadoBaseDatos({ estado }: { estado: EstadoSincronizacion }) {
  const datos = {
    'en-linea': { icono: Cloud, texto: 'Firebase en línea', detalle: 'Cambios sincronizados en tiempo real' },
    conectando: { icono: Database, texto: 'Conectando con Firebase', detalle: 'Cargando datos' },
    error: { icono: AlertTriangle, texto: 'Sin conexión con Firebase', detalle: 'Los cambios se guardan en este equipo' },
    demo: { icono: CloudOff, texto: 'Modo demostración', detalle: 'Datos en este navegador (configura Firebase en .env.local)' },
  }[estado];
  const Icono = datos.icono;
  return (
    <div className="cmx-bd" data-estado={estado} title={datos.detalle} role="status">
      <Icono className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{datos.texto}</span>
    </div>
  );
}
