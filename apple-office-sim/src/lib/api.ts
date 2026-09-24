// Cliente HTTP único para el panel de administración.
//
// Regla de oro: un guardado NUNCA puede parecer exitoso si el servidor lo rechazó.
// `fetch` no rechaza en 4xx/5xx, así que `apiFetch` lo hace por nosotros: cualquier
// respuesta no exitosa termina en un `ApiError`. Y si el problema es la sesión
// (token vencido o rechazado), además avisa al panel para que cierre la sesión.

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_URL = `${BASE_URL}/api`;

export const TOKEN_KEY = 'apple_admin_token';
export const USERNAME_KEY = 'apple_admin_username';

/** Se dispara en `window` cuando la sesión del admin dejó de ser válida. */
export const SESSION_EXPIRED_EVENT = 'apple-admin-session-expired';

// expired-on-open: venció antes de abrir el panel · expired-idle: venció con el panel abierto, sin guardar nada
// expired: venció justo al intentar guardar · rejected: el servidor rechazó el token al guardar
export type SessionEndReason = 'expired-on-open' | 'expired-idle' | 'expired' | 'rejected';

export const SESSION_MESSAGES: Record<SessionEndReason, string> = {
    'expired-on-open': 'Tu sesión expiró. Ingresá de nuevo para seguir editando.',
    'expired-idle': 'Tu sesión expiró. Ingresá de nuevo para seguir editando.',
    'expired': 'Tu sesión expiró y no se guardaron los últimos cambios. Ingresá de nuevo.',
    'rejected': 'Tu sesión ya no es válida y no se guardaron los últimos cambios. Ingresá de nuevo.'
};

export class ApiError extends Error {
    status: number;
    sessionEnded: boolean;

    constructor(status: number, message: string, sessionEnded = false) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.sessionEnded = sessionEnded;
    }
}

export function getToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

/** Fecha de vencimiento (ms) leída del JWT. No valida la firma: eso lo hace el servidor. */
export function getTokenExpiry(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;
        const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        );
        const exp = JSON.parse(json).exp;
        return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
        return null;
    }
}

/** true si el token no existe, está mal formado o ya venció. */
export function isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    const exp = getTokenExpiry(token);
    if (exp === null) return true;
    return Date.now() >= exp;
}

export function clearSession() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
    } catch { /* ignorar */ }
}

function endSession(reason: SessionEndReason): ApiError {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason } }));
    return new ApiError(reason === 'rejected' ? 403 : 401, SESSION_MESSAGES[reason], true);
}

type ApiOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /** Objeto (se envía como JSON) o FormData (se envía tal cual, para subir imágenes). */
    body?: unknown;
    timeoutMs?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body } = opts;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const timeoutMs = opts.timeoutMs ?? (isForm ? 60000 : 20000);

    const token = getToken();
    // Si el token ya venció no tiene sentido ni intentarlo: se corta acá, sin esperar al servidor.
    if (isTokenExpired(token)) throw endSession('expired');

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    let payload: BodyInit | undefined;
    if (isForm) {
        // Sin Content-Type: el navegador arma el boundary del multipart.
        payload = body as FormData;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
        res = await fetch(path.startsWith('http') ? path : `${API_URL}${path}`, {
            method,
            headers,
            body: payload,
            signal: ctrl.signal
        });
    } catch {
        throw new ApiError(0, 'No se pudo conectar con el servidor. Revisá tu conexión y reintentá.');
    } finally {
        clearTimeout(timer);
    }

    if (res.status === 401 || res.status === 403) throw endSession('rejected');

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new ApiError(res.status, errData.error || `El servidor respondió con un error (${res.status}).`);
    }

    return res.json().catch(() => ({} as T));
}

/**
 * Muestra el error al usuario. Si el error es de sesión no muestra nada: el panel ya está
 * pasando a la pantalla de login con el motivo escrito, y un alert encima solo confundiría.
 */
export function showError(e: unknown, fallback = 'Ocurrió un error inesperado.') {
    if (e instanceof ApiError) {
        if (e.sessionEnded) return;
        alert(e.message);
        return;
    }
    console.error(e);
    alert(fallback);
}
