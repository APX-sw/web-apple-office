import { useSyncExternalStore } from 'react';

/**
 * Devuelve si la media query coincide, y se actualiza si cambia (ej. al rotar el celular).
 * Usa useSyncExternalStore: el valor inicial es el real desde el primer render, así que en desktop
 * no hay un flash del contenido "mobile" antes de pasar al correcto.
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const mql = window.matchMedia(query);
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        },
        () => window.matchMedia(query).matches,
        () => false
    );
}
