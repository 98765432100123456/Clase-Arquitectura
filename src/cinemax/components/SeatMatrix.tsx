import React, { useMemo, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';
import type { Seat } from '../../App';

/**
 * Matriz de la sala organizada por zonas.
 *
 * Reemplaza visualmente la cuadrícula original (que se conserva intacta en App.tsx como respaldo)
 * pero usa la MISMA lógica de selección: cada clic llama a handleSeatClick(seatId) de App.tsx,
 * así el bloqueo de butacas, el límite de 6, la validación RUD y la sincronización no cambian.
 * Los colores de cada estado son los mismos de la versión original.
 */

const FILAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLUMNAS = [1, 2, 3, 4, 5, 6, 7, 8];
const PASILLO_DESPUES_DE = 4;

interface Zona {
  id: string;
  nombre: string;
  detalle: string;
  filas: string[];
}

const ZONAS: Zona[] = [
  { id: 'frontal', nombre: 'Zona frontal', detalle: 'Cerca de la pantalla, incluye butacas accesibles', filas: ['A', 'B'] },
  { id: 'central', nombre: 'Zona central', detalle: 'Mejor ángulo de visión y sonido', filas: ['C', 'D'] },
  { id: 'posterior', nombre: 'Zona posterior', detalle: 'Vista completa de la pantalla', filas: ['E', 'F'] },
];

type EstadoButaca = 'seleccionada' | 'ocupada' | 'reservada' | 'accesible' | 'disponible';

const CLASES: Record<EstadoButaca, string> = {
  // Mismos colores que la matriz original de App.tsx
  seleccionada: 'bg-red-600 text-white border-red-500 shadow-md',
  ocupada: 'bg-zinc-950 text-zinc-700 border-zinc-900 opacity-40',
  reservada: 'bg-zinc-800/50 text-zinc-600 border-zinc-800',
  accesible: 'bg-blue-950/40 text-blue-300 border-blue-900',
  disponible: 'bg-zinc-800 text-zinc-300 border-zinc-700',
};

const TEXTO_ESTADO: Record<EstadoButaca, string> = {
  seleccionada: 'Seleccionada',
  ocupada: 'Vendida',
  reservada: 'En proceso de compra por otra persona',
  accesible: 'Disponible, accesible para movilidad reducida',
  disponible: 'Disponible',
};

interface Props {
  seats: Record<string, Seat>;
  selectedSeats: string[];
  onSeatClick: (seatId: string) => void;
  precioPorButaca: number;
  maxButacas?: number;
}

export function SeatMatrix({ seats, selectedSeats, onSeatClick, precioPorButaca, maxButacas = 6 }: Props) {
  const [enfocada, setEnfocada] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>(() => primeraLibre(seats) ?? 'A1');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const estadoDe = (id: string): EstadoButaca => {
    const s = seats[id];
    if (!s) return 'ocupada';
    if (selectedSeats.includes(id)) return 'seleccionada';
    if (s.status === 'sold') return 'ocupada';
    if (s.status === 'reserved') return 'reservada';
    return s.isAccessible ? 'accesible' : 'disponible';
  };

  const resumenZonas = useMemo(
    () =>
      ZONAS.map((z) => {
        const ids = z.filas.flatMap((f) => COLUMNAS.map((c) => `${f}${c}`)).filter((id) => seats[id]);
        const libres = ids.filter((id) => seats[id].status === 'available').length;
        const mias = ids.filter((id) => selectedSeats.includes(id)).length;
        return { ...z, total: ids.length, libres, mias };
      }),
    [seats, selectedSeats]
  );

  const totalLibres = resumenZonas.reduce((a, z) => a + z.libres, 0);

  const mover = (id: string, df: number, dc: number) => {
    const f = FILAS.indexOf(id[0]);
    const c = Number(id.slice(1));
    const nf = Math.min(FILAS.length - 1, Math.max(0, f + df));
    const nc = Math.min(COLUMNAS.length, Math.max(1, c + dc));
    const destino = `${FILAS[nf]}${nc}`;
    if (!seats[destino]) return;
    setCursor(destino);
    refs.current[destino]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, id: string) => {
    const mapa: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (mapa[e.key]) {
      e.preventDefault();
      mover(id, ...mapa[e.key]);
    }
  };

  const info = enfocada ? describir(enfocada, estadoDe(enfocada), precioPorButaca) : null;
  const llenas = selectedSeats.length >= maxButacas;

  return (
    <div className="cmx-sala space-y-6">
      {/* Pantalla */}
      <div className="cmx-pantalla" aria-hidden="true">
        <svg viewBox="0 0 400 46" preserveAspectRatio="none" className="w-full h-10 sm:h-12">
          <defs>
            <linearGradient id="cmx-luz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a1a1aa" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#a1a1aa" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M8 10 Q200 -4 392 10 L360 46 L40 46 Z" fill="url(#cmx-luz)" />
          <path d="M8 10 Q200 -4 392 10" fill="none" stroke="#d4d4d8" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="cmx-pantalla__texto">Pantalla</span>
      </div>

      {/* Cuadrícula por zonas */}
      <div className="cmx-sala__scroll">
        <div role="grid" aria-label={`Mapa de butacas, ${totalLibres} disponibles`} className="cmx-sala__grid">
          {ZONAS.map((zona, zi) => (
            <div
              key={zona.id}
              role="rowgroup"
              aria-label={`${zona.nombre}, ${resumenZonas[zi].libres} libres`}
              className="cmx-zona"
              data-zona={zona.id}
            >
              <div className="cmx-zona__titulo" aria-hidden="true">
                <span className="cmx-zona__nombre">{zona.nombre}</span>
                <span className="cmx-zona__libres">
                  {resumenZonas[zi].libres} libres
                </span>
              </div>
              {zona.filas.map((fila, fi) => (
                <div
                  key={fila}
                  role="row"
                  className="cmx-fila"
                  style={{ ['--cmx-i' as any]: zi * 2 + fi }}
                >
                  <span className="cmx-fila__letra" role="rowheader" aria-label={`Fila ${fila}`}>
                    {fila}
                  </span>
                  {COLUMNAS.map((col) => {
                    const id = `${fila}${col}`;
                    const seat = seats[id];
                    if (!seat) return <span key={id} className="cmx-butaca cmx-butaca--vacia" aria-hidden="true" />;
                    const estado = estadoDe(id);
                    const bloqueada = estado === 'ocupada' || estado === 'reservada';
                    const sinCupo = llenas && estado !== 'seleccionada' && !bloqueada;
                    return (
                      <React.Fragment key={id}>
                        <span role="gridcell" className="contents">
                        <button
                          ref={(el) => {
                            refs.current[id] = el;
                          }}
                          type="button"
                          tabIndex={cursor === id ? 0 : -1}
                          aria-label={`Butaca ${id}, ${TEXTO_ESTADO[estado]}`}
                          aria-pressed={estado === 'seleccionada'}
                          aria-disabled={bloqueada || undefined}
                          data-estado={estado}
                          data-sin-cupo={sinCupo || undefined}
                          onClick={() => {
                            setCursor(id);
                            if (!bloqueada) onSeatClick(id);
                          }}
                          onKeyDown={(e) => onKeyDown(e, id)}
                          onFocus={() => setEnfocada(id)}
                          onBlur={() => setEnfocada((x) => (x === id ? null : x))}
                          onMouseEnter={() => setEnfocada(id)}
                          onMouseLeave={() => setEnfocada((x) => (x === id ? null : x))}
                          className={`cmx-butaca border ${CLASES[estado]} ${bloqueada ? 'cursor-not-allowed' : ''}`}
                        >
                          {seat.isAccessible && estado !== 'seleccionada' ? (
                            <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <span className="cmx-butaca__num">{col}</span>
                          )}
                        </button>
                        </span>
                        {col === PASILLO_DESPUES_DE && <span className="cmx-pasillo" aria-hidden="true" />}
                      </React.Fragment>
                    );
                  })}
                  <span className="cmx-fila__letra" aria-hidden="true">
                    {fila}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Detalle de la butaca bajo el cursor / foco */}
      <p className="cmx-sala__info">
        {info ? (
          <>
            <strong className="text-white font-mono">{info.id}</strong>
            <span>{info.zona}</span>
            <span>{info.estado}</span>
            {info.precio && <span className="font-mono text-zinc-200">{info.precio}</span>}
          </>
        ) : (
          <span>
            {llenas
              ? `Llegaste al máximo de ${maxButacas} butacas. Toca una seleccionada para liberarla.`
              : 'Toca una butaca para reservarla durante 10 minutos. Con el teclado, usa las flechas.'}
          </span>
        )}
      </p>

      {/* Leyenda + disponibilidad por zona */}
      <div className="cmx-sala__pie">
        <ul className="cmx-leyenda" aria-label="Leyenda">
          {(
            [
              ['disponible', 'Disponible'],
              ['seleccionada', 'Tu selección'],
              ['accesible', 'Accesible (RUD)'],
              ['reservada', 'En compra'],
              ['ocupada', 'Vendida'],
            ] as [EstadoButaca, string][]
          ).map(([estado, texto]) => (
            <li key={estado}>
              <span className={`cmx-butaca cmx-butaca--mini border ${CLASES[estado]}`} aria-hidden="true" />
              {texto}
            </li>
          ))}
        </ul>
        <ul className="cmx-ocupacion" aria-label="Disponibilidad por zona">
          {resumenZonas.map((z) => (
            <li key={z.id} title={z.detalle}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-zinc-300">{capital(z.nombre.replace('Zona ', ''))}</span>
                <span className="font-mono text-zinc-400">
                  {z.libres}/{z.total}
                </span>
              </div>
              <div className="cmx-ocupacion__barra">
                <span style={{ transform: `scaleX(${z.total ? z.libres / z.total : 0})` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function primeraLibre(seats: Record<string, Seat>) {
  for (const f of ['C', 'D', 'B', 'E', 'A', 'F'])
    for (const c of [4, 5, 3, 6, 2, 7, 1, 8]) if (seats[`${f}${c}`]?.status === 'available') return `${f}${c}`;
  return null;
}

function describir(id: string, estado: EstadoButaca, precio: number) {
  const zona = ZONAS.find((z) => z.filas.includes(id[0]))?.nombre ?? '';
  const libre = estado === 'disponible' || estado === 'accesible' || estado === 'seleccionada';
  return {
    id,
    zona,
    estado: TEXTO_ESTADO[estado],
    precio: libre ? `$${precio.toLocaleString('es-CO')}` : null,
  };
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
