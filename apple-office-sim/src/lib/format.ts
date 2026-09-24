// Formato de números y fechas del cotizador.
//
// `toLocaleString()` sin locale usa el idioma del celular: en un teléfono en inglés un precio sale
// "1,522,500" y en uno en alemán "1.522.500". Acá se fija es-AR para que la pantalla y el mensaje
// de WhatsApp muestren siempre lo mismo, sin importar el dispositivo del cliente.

const NUMBER_AR = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** 1522500 → "1.522.500" (redondeado, sin decimales). */
export const fmtNum = (n: number): string => NUMBER_AR.format(Math.round(n));

const DATE_AR = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

/**
 * Fecha y hora actuales en Argentina ("24/09/2026 14:17"). Solo se usa como respaldo si el servidor
 * no mandó su propia hora: convierte desde el reloj del dispositivo, así que no corrige un celular
 * con la hora mal puesta.
 */
export function nowArgentina(): string {
    const p: Record<string, string> = {};
    for (const part of DATE_AR.formatToParts(new Date())) p[part.type] = part.value;
    return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
