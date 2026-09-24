import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

export type FeatureCard = {
    icon: string;
    title: string;
    desc: string;
};

export type AppData = {
    config: { dollar_value: number };
    feature_cards: FeatureCard[];
    models: string[];
    capacities: number[];
    batteries: string[];

    iphoneStock: Array<{ id: string, model: string, capacity_gb: number, battery_status: string, price_usd: number }>;
    tradeInPrices: Array<{ id: string, model: string, capacity_gb: number, battery_range: string, price_usd: number }>;
    cards: Array<{ card_name: string, base_factor: number }>;
    plans: Array<{ id: string, card_name: string, installments: number, surcharge_coefficient: number }>;
    gallery: Array<{ id: string, image_url: string, description: string, created_at: string }>;
    storeGallery: Array<{ id: string, image_url: string, description: string, created_at: string }>;
    landingIphones: Array<{ id: string, name: string, price_string: string, image_url: string, order_index: number }>;
    landingAccessories: Array<{ id: string, name: string, price_string: string, image_url: string, order_index: number }>;
    faqs: Array<{ id: string, question: string, answer: string, order: number }>;
};

/** Datos de la cotización que calcula el servidor (hora argentina y código de versión de precios). */
export type PricesMeta = {
    server_time_iso: string;
    /** "24/09/2026 14:17", hora de Argentina calculada por el servidor. */
    quoted_at_ar: string;
    dollar_value: number;
    /** Código corto que cambia si y solo si cambia algún precio. */
    prices_version: string;
    valid_hours: number;
};


const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
    { icon: 'Package', title: 'Equipos Nuevos', desc: 'Sellados en caja, directo de fábrica. Con la seguridad de un unpacked genuino.' },
    { icon: 'ShieldCheck', title: 'Garantía Oficial', desc: 'Dormí tranquilo. Tenés 12 meses de garantía directa de Apple internacional.' },
    { icon: 'RefreshCw', title: 'Plan Canje', desc: 'Dejá tu equipo actual como parte de pago. Lo cotizamos al mejor valor del mercado.' },
    { icon: 'MessageCircleHeart', title: 'Atención Premium', desc: 'Te guiamos y migramos tus datos mientras disfrutás del ambiente.' }
];

const defaultData: AppData = {
    config: { dollar_value: 1000 },
    feature_cards: DEFAULT_FEATURE_CARDS,
    models: [], capacities: [], batteries: [],
    iphoneStock: [], tradeInPrices: [], cards: [], plans: [], gallery: [], storeGallery: [], landingIphones: [], landingAccessories: [], faqs: []
};

// Si pasó menos que esto desde la última carga, volver a la pestaña no dispara un nuevo pedido.
const STALE_MS = 2 * 60 * 1000;
// Chequeo periódico mientras la pestaña está visible.
const POLL_MS = 5 * 60 * 1000;

/**
 * Firma de todo lo que afecta un precio. Se calcula en el cliente (ordenada, para no depender del
 * orden en que llegan las filas) y sirve para saber si los precios cambiaron entre dos cargas.
 */
function priceSignature(d: AppData): string {
    const rows = (list: Array<Array<string | number>>) => list.map(r => r.join('|')).sort();
    return JSON.stringify([
        d.config.dollar_value,
        rows(d.iphoneStock.map(s => [s.model, s.capacity_gb, s.battery_status, s.price_usd])),
        rows(d.tradeInPrices.map(t => [t.model, t.capacity_gb, t.battery_range, t.price_usd])),
        rows(d.cards.map(c => [c.card_name, c.base_factor])),
        rows(d.plans.map(p => [p.card_name, p.installments, p.surcharge_coefficient]))
    ]);
}

type LoadResult = { data: AppData; meta: PricesMeta | null };

type FreshResult = {
    /** true si los precios cambiaron desde la carga anterior. */
    changed: boolean;
    /** true si no se pudo consultar al servidor (se devuelven los datos que ya había). */
    offline: boolean;
    data: AppData;
    meta: PricesMeta | null;
};

type DataContextType = {
    data: AppData;
    meta: PricesMeta | null;
    /** true una vez que /api/data respondió al menos una vez (antes, `data` son valores por defecto). */
    loaded: boolean;
    /** Mensaje si la última carga falló (los datos anteriores, si los hay, se conservan). */
    error: string | null;
    refreshData: () => Promise<AppData | null>;
    /** Vuelve a pedir los precios ya mismo y avisa si cambiaron. Para usar justo antes de cotizar. */
    ensureFresh: () => Promise<FreshResult>;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>(defaultData);
    const [meta, setMeta] = useState<PricesMeta | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dataRef = useRef<AppData>(defaultData);
    const inFlight = useRef<Promise<LoadResult | null> | null>(null);
    const lastFetchedAt = useRef(0);
    // Numeran los pedidos para descartar una respuesta vieja que llegue después de una más nueva.
    const startedSeq = useRef(0);
    const appliedSeq = useRef(0);

    const load = useCallback((opts: { force?: boolean; timeoutMs?: number } = {}): Promise<LoadResult | null> => {
        const { force = false, timeoutMs = 15000 } = opts;
        if (inFlight.current && !force) return inFlight.current;

        const seq = ++startedSeq.current;
        let promise: Promise<LoadResult | null> | null = null;
        promise = (async () => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await fetch(`${API_URL}/api/data`, { cache: 'no-store', signal: ctrl.signal });
                if (!res.ok) throw new Error(`API error ${res.status}`);
                const json = await res.json();
                const next: AppData = {
                    ...json,
                    feature_cards: json.feature_cards?.length ? json.feature_cards : DEFAULT_FEATURE_CARDS
                };
                const nextMeta: PricesMeta | null = json.meta ?? null;

                if (seq > appliedSeq.current) {
                    appliedSeq.current = seq;
                    dataRef.current = next;
                    lastFetchedAt.current = Date.now();
                    setData(next);
                    setMeta(nextMeta);
                    setLoaded(true);
                    setError(null);
                }
                return { data: dataRef.current, meta: nextMeta };
            } catch (e) {
                console.error("Failed to load DB data", e);
                setError('No pudimos actualizar los precios. Revisá tu conexión.');
                return null;
            } finally {
                clearTimeout(timer);
                if (inFlight.current === promise) inFlight.current = null;
            }
        })();

        inFlight.current = promise;
        return promise;
    }, []);

    // Carga inicial + revalidación. Antes los precios se pedían UNA sola vez al abrir la web, así que
    // una pestaña dejada abierta (o restaurada del historial del celular) cotizaba con precios viejos.
    useEffect(() => {
        load();

        const revalidateIfStale = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastFetchedAt.current < STALE_MS) return;
            load();
        };
        // Al volver a una página guardada en el historial (bfcache) NO hay visibilitychange en todos
        // los navegadores (Safari iOS): `pageshow` con `persisted` es la señal confiable.
        const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) load({ force: true }); };

        document.addEventListener('visibilitychange', revalidateIfStale);
        window.addEventListener('focus', revalidateIfStale);
        window.addEventListener('online', revalidateIfStale);
        window.addEventListener('pageshow', onPageShow);
        const interval = setInterval(revalidateIfStale, POLL_MS);

        return () => {
            document.removeEventListener('visibilitychange', revalidateIfStale);
            window.removeEventListener('focus', revalidateIfStale);
            window.removeEventListener('online', revalidateIfStale);
            window.removeEventListener('pageshow', onPageShow);
            clearInterval(interval);
        };
    }, [load]);

    // Explícito (lo usa el admin justo después de guardar): siempre va a la red.
    const refreshData = useCallback(async (): Promise<AppData | null> => {
        const res = await load({ force: true });
        return res ? res.data : null;
    }, [load]);

    const ensureFresh = useCallback(async (): Promise<FreshResult> => {
        const before = dataRef.current;
        const hadPrices = lastFetchedAt.current > 0;
        // Tiempo de espera corto: si la conexión es mala no se traba el botón de WhatsApp.
        const res = await load({ force: true, timeoutMs: 2500 });
        if (!res) return { changed: false, offline: true, data: before, meta: null };
        return {
            changed: hadPrices && priceSignature(before) !== priceSignature(res.data),
            offline: false,
            data: res.data,
            meta: res.meta
        };
    }, [load]);

    return (
        <DataContext.Provider value={{ data, meta, loaded, error, refreshData, ensureFresh }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used inside DataProvider");
    return ctx;
};
