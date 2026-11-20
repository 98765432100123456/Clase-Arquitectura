import { useEffect, useRef } from 'react';

/**
 * Foco accesible para diálogos: mientras está abierto, Tab no sale del diálogo;
 * al cerrarlo, el foco vuelve al botón que lo abrió.
 */
export function useFocoDialogo<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const nodo = ref.current;
    if (nodo && !nodo.contains(document.activeElement)) {
      const primero = enfocables(nodo)[0];
      (primero ?? nodo).focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const lista = enfocables(ref.current);
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previo && document.contains(previo)) previo.focus();
    };
  }, []);
  return ref;
}

function enfocables(nodo: HTMLElement) {
  return Array.from(
    nodo.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
    )
  );
}
