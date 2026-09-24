import { useEffect } from 'react';

/** Bloquea el scroll de la página mientras `locked` sea true (menú mobile, modales). */
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [locked]);
}
