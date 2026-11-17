import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlusCircle, Edit2, Trash2, X, Popcorn, ImageOff, Minus, Plus } from 'lucide-react';
import type { ConfectioneryItem } from '../../App';
import { useFocoDialogo } from './useFocoDialogo';

/**
 * Administración de combos y productos de confitería: crear, editar y eliminar.
 * Trabaja sobre el mismo estado `confectionery` de App.tsx (y su sincronización),
 * así lo que cambia aquí aparece de inmediato en la compra del cliente y en el KDS.
 */
interface Props {
  items: ConfectioneryItem[];
  onChange: (next: ConfectioneryItem[]) => void;
}

const VACIO: Omit<ConfectioneryItem, 'id'> = {
  name: '',
  description: '',
  price: 18000,
  stock: 30,
  imageUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?auto=format&fit=crop&w=400&q=80',
};

const STOCK_BAJO = 10;

export function ConfectioneryAdmin({ items, onChange }: Props) {
  const [editando, setEditando] = useState<ConfectioneryItem | null>(null);
  const [creando, setCreando] = useState(false);
  const [porEliminar, setPorEliminar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  const stockBajo = useMemo(() => items.filter((i) => i.stock < STOCK_BAJO).length, [items]);

  const guardar = (datos: Omit<ConfectioneryItem, 'id'>, id?: string) => {
    if (id) {
      onChange(items.map((i) => (i.id === id ? { ...i, ...datos } : i)));
      setAviso(`"${datos.name}" se actualizó.`);
    } else {
      const nuevo: ConfectioneryItem = { id: 'CONF-' + Date.now().toString(36).toUpperCase(), ...datos };
      onChange([nuevo, ...items]);
      setAviso(`"${datos.name}" ya está en el menú de confitería.`);
    }
    setEditando(null);
    setCreando(false);
  };

  const eliminar = (id: string) => {
    const item = items.find((i) => i.id === id);
    onChange(items.filter((i) => i.id !== id));
    setPorEliminar(null);
    if (item) setAviso(`"${item.name}" se eliminó del menú.`);
  };

  const ajustarStock = (id: string, delta: number) =>
    onChange(items.map((i) => (i.id === id ? { ...i, stock: Math.max(0, i.stock + delta) } : i)));

  return (
    <section className="cmx-panel" aria-labelledby="cmx-conf-titulo">
      <header className="cmx-panel__cabecera">
        <div>
          <h3 id="cmx-conf-titulo" className="cmx-panel__titulo">
            <Popcorn className="w-4 h-4 text-red-500" aria-hidden="true" />
            Combos y confitería
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {items.length} productos en el menú
            {stockBajo > 0 && (
              <>
                , <span className="text-amber-400">{stockBajo} con stock bajo</span>
              </>
            )}
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditando(null);
            setCreando(true);
          }}
          className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>Nuevo combo</span>
        </button>
      </header>

      {items.length === 0 ? (
        <div className="cmx-vacio">
          <Popcorn className="w-8 h-8 text-zinc-600" aria-hidden="true" />
          <p className="text-sm text-zinc-300 font-semibold">El menú de confitería está vacío</p>
          <p className="text-xs text-zinc-400">Los clientes no verán productos al comprar. Crea el primer combo.</p>
        </div>
      ) : (
        <ul className="cmx-combos">
          {items.map((item) => (
            <li key={item.id} className="cmx-combo">
              <Imagen src={item.imageUrl} alt={item.name} className="cmx-combo__img" />
              <div className="cmx-combo__cuerpo">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="cmx-combo__nombre">{item.name}</h4>
                  <span className="font-mono font-bold text-sm text-white shrink-0">
                    ${Number(item.price).toLocaleString('es-CO')}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{item.description || 'Sin descripción'}</p>
                <div className="cmx-combo__pie">
                  <div className="flex items-center gap-1.5" role="group" aria-label={`Stock de ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => ajustarStock(item.id, -1)}
                      disabled={item.stock === 0}
                      className="cmx-icono"
                      aria-label="Restar una unidad"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      className={`font-mono text-xs min-w-[4.5rem] text-center ${
                        item.stock === 0 ? 'text-red-400' : item.stock < STOCK_BAJO ? 'text-amber-400' : 'text-zinc-300'
                      }`}
                    >
                      {item.stock === 0 ? 'Agotado' : `${item.stock} und.`}
                    </span>
                    <button type="button" onClick={() => ajustarStock(item.id, 1)} className="cmx-icono" aria-label="Sumar una unidad">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {porEliminar === item.id ? (
                    <div className="flex items-center gap-1.5 cmx-confirmar">
                      <span className="text-[11px] text-zinc-300">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => eliminar(item.id)}
                        className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorEliminar(null)}
                        className="text-[11px] text-zinc-400 hover:text-white px-2 py-1.5"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCreando(false);
                          setEditando(item);
                        }}
                        className="cmx-icono"
                        aria-label={`Editar ${item.name}`}
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorEliminar(item.id)}
                        className="cmx-icono cmx-icono--peligro"
                        aria-label={`Eliminar ${item.name}`}
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Región siempre montada: así el lector de pantalla anuncia cada aviso */}
      <div role="status" aria-live="polite" className={aviso ? 'cmx-toast' : 'sr-only'}>
        {aviso}
      </div>

      {(creando || editando) && (
        <FormularioCombo
          inicial={editando ?? VACIO}
          esNuevo={!editando}
          nombresUsados={items.filter((i) => i.id !== editando?.id).map((i) => i.name.trim().toLowerCase())}
          onCancelar={() => {
            setCreando(false);
            setEditando(null);
          }}
          onGuardar={(datos) => guardar(datos, editando?.id)}
        />
      )}
    </section>
  );
}

function FormularioCombo({
  inicial,
  esNuevo,
  nombresUsados,
  onCancelar,
  onGuardar,
}: {
  inicial: Omit<ConfectioneryItem, 'id'>;
  esNuevo: boolean;
  nombresUsados: string[];
  onCancelar: () => void;
  onGuardar: (d: Omit<ConfectioneryItem, 'id'>) => void;
}) {
  const [d, setD] = useState({
    name: inicial.name,
    description: inicial.description,
    price: String(inicial.price),
    stock: String(inicial.stock),
    imageUrl: inicial.imageUrl,
  });
  const [intento, setIntento] = useState(false);
  const primerCampo = useRef<HTMLInputElement>(null);
  const dialogo = useFocoDialogo<HTMLDivElement>();

  useEffect(() => {
    primerCampo.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancelar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCancelar]);

  const errores = {
    name: !d.name.trim()
      ? 'Escribe el nombre del combo.'
      : nombresUsados.includes(d.name.trim().toLowerCase())
        ? 'Ya existe un producto con ese nombre.'
        : null,
    price: !(Number(d.price) > 0) ? 'El precio debe ser mayor que cero.' : null,
    stock: !(Number(d.stock) >= 0) || !Number.isInteger(Number(d.stock)) ? 'El stock debe ser un número entero, 0 o más.' : null,
    imageUrl: d.imageUrl && !/^https?:\/\//i.test(d.imageUrl.trim()) ? 'La imagen debe ser un enlace que empiece por https://' : null,
  };
  const valido = !Object.values(errores).some(Boolean);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    onGuardar({
      name: d.name.trim(),
      description: d.description.trim(),
      price: Math.round(Number(d.price)),
      stock: Math.round(Number(d.stock)),
      imageUrl: d.imageUrl.trim() || VACIO.imageUrl,
    });
  };

  const campo = (k: keyof typeof d) => ({
    id: `cmx-combo-${k}`,
    value: d[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((x) => ({ ...x, [k]: e.target.value })),
    'aria-invalid': intento && !!(errores as any)[k] ? true : undefined,
    'aria-describedby': intento && (errores as any)[k] ? `cmx-combo-${k}-error` : undefined,
  });

  const Error = ({ k }: { k: keyof typeof errores }) =>
    intento && errores[k] ? (
      <p id={`cmx-combo-${k}-error`} className="text-[11px] text-red-400 mt-1">
        {errores[k]}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={onCancelar}>
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmx-combo-titulo"
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800">
          <h3 id="cmx-combo-titulo" className="font-bold text-white text-sm">
            {esNuevo ? 'Nuevo combo' : 'Editar combo'}
          </h3>
          <button type="button" onClick={onCancelar} className="cmx-icono" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={enviar} noValidate className="p-6 space-y-4 text-xs">
          <div className="flex gap-4 items-start">
            <Imagen src={d.imageUrl} alt="Vista previa" className="w-20 h-20 rounded-xl object-cover shrink-0 bg-zinc-950" />
            <div className="flex-1">
              <label htmlFor="cmx-combo-name" className="block text-zinc-400 mb-1">
                Nombre
              </label>
              <input ref={primerCampo} type="text" maxLength={60} {...campo('name')} className="cmx-input" placeholder="Combo Pareja" />
              <Error k="name" />
            </div>
          </div>
          <div>
            <label htmlFor="cmx-combo-description" className="block text-zinc-400 mb-1">
              Qué incluye
            </label>
            <textarea rows={2} maxLength={160} {...campo('description')} className="cmx-input" placeholder="2 crispetas medianas + 2 gaseosas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cmx-combo-price" className="block text-zinc-400 mb-1">
                Precio (COP)
              </label>
              <input type="number" inputMode="numeric" min={0} step={500} {...campo('price')} className="cmx-input font-mono" />
              <Error k="price" />
            </div>
            <div>
              <label htmlFor="cmx-combo-stock" className="block text-zinc-400 mb-1">
                Unidades disponibles
              </label>
              <input type="number" inputMode="numeric" min={0} step={1} {...campo('stock')} className="cmx-input font-mono" />
              <Error k="stock" />
            </div>
          </div>
          <div>
            <label htmlFor="cmx-combo-imageUrl" className="block text-zinc-400 mb-1">
              Enlace de la imagen
            </label>
            <input type="url" {...campo('imageUrl')} className="cmx-input font-mono text-[11px]" placeholder="https://" />
            <Error k="imageUrl" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
            <button type="button" onClick={onCancelar} className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white">
              Cancelar
            </button>
            <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl">
              {esNuevo ? 'Crear combo' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Imagen({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [src]);
  if (!src || fallo)
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-950 text-zinc-600`} role="img" aria-label={`${alt}, sin imagen`}>
        <ImageOff className="w-5 h-5" />
      </div>
    );
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFallo(true)} />;
}
