import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Trash2, Plus, Save, Lock, Users, LogIn, HelpCircle, Pencil } from 'lucide-react';

import Login from './Login';
import {
    BASE_URL, TOKEN_KEY, USERNAME_KEY, SESSION_EXPIRED_EVENT, SESSION_MESSAGES,
    ApiError, apiFetch, showError, clearSession, getTokenExpiry, isTokenExpired
} from '../lib/api';
import type { SessionEndReason } from '../lib/api';

const IPHONE_CHRONO_ORDER = [
    "iphone xr",
    "iphone xs",
    "iphone xs max",
    "iphone 11",
    "iphone 11 pro",
    "iphone 11 pro max",
    "iphone se (2020)",
    "iphone 12 mini",
    "iphone 12",
    "iphone 12 pro",
    "iphone 12 pro max",
    "iphone 13 mini",
    "iphone 13",
    "iphone 13 pro",
    "iphone 13 pro max",
    "iphone se (2022)",
    "iphone 14",
    "iphone 14 plus",
    "iphone 14 pro",
    "iphone 14 pro max",
    "iphone 15",
    "iphone 15 plus",
    "iphone 15 pro",
    "iphone 15 pro max",
    "iphone 16",
    "iphone 16 plus",
    "iphone 16 pro",
    "iphone 16 pro max",
    "iphone 17 pro",
    "iphone 17 pro max"
];

function getModelOrderWeight(modelName: string): number {
    if (!modelName) return -1;
    const norm = modelName.toLowerCase().trim();
    const idx = IPHONE_CHRONO_ORDER.indexOf(norm);
    if (idx !== -1) {
        return idx;
    }
    for (let i = IPHONE_CHRONO_ORDER.length - 1; i >= 0; i--) {
        if (norm.includes(IPHONE_CHRONO_ORDER[i])) {
            return i;
        }
    }
    return 999;
}

function QuickAddModelModal({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (name: string) => Promise<boolean> }) {
    const [modelName, setModelName] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = modelName.trim();
        if (!trimmed) return;
        setLoading(true);
        const success = await onAdd(trimmed);
        setLoading(false);
        if (success) {
            setModelName("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Agregar Nuevo Modelo</h3>
                    <button 
                        onClick={onClose}
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <Plus className="w-5 h-5 transform rotate-45" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre del Modelo</label>
                        <input
                            type="text"
                            placeholder="Ej: iPhone 16 Pro Max"
                            value={modelName}
                            onChange={e => setModelName(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !modelName.trim()}
                            className="px-5 py-2.5 text-sm font-semibold bg-black text-white hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Guardando..." : "Agregar Modelo"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SingleInputModal({
    isOpen,
    title,
    label,
    placeholder,
    inputType = 'text',
    onClose,
    onAdd
}: {
    isOpen: boolean,
    title: string,
    label: string,
    placeholder?: string,
    inputType?: 'text' | 'number',
    onClose: () => void,
    onAdd: (value: string) => Promise<boolean | void>
}) {
    const [val, setVal] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) setVal("");
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = val.trim();
        if (!trimmed) return;
        setLoading(true);
        const success = await onAdd(trimmed);
        setLoading(false);
        if (success !== false) {
            setVal("");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <button 
                        onClick={onClose}
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <Plus className="w-5 h-5 transform rotate-45" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
                        <input
                            type={inputType}
                            placeholder={placeholder}
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !val.trim()}
                            className="px-5 py-2.5 text-sm font-semibold bg-black text-white hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Guardando..." : "Agregar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddCardModal({
    isOpen,
    onClose,
    onAdd
}: {
    isOpen: boolean,
    onClose: () => void,
    onAdd: (name: string, baseFactor: number) => Promise<boolean | void>
}) {
    const [cardName, setCardName] = useState("");
    const [baseFactor, setBaseFactor] = useState("1.00");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCardName("");
            setBaseFactor("1.00");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = cardName.trim();
        const factor = Number(baseFactor);
        if (!name || isNaN(factor)) return;
        setLoading(true);
        const success = await onAdd(name, factor);
        setLoading(false);
        if (success !== false) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Agregar Nueva Tarjeta</h3>
                    <button 
                        onClick={onClose}
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <Plus className="w-5 h-5 transform rotate-45" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre de la Tarjeta</label>
                        <input
                            type="text"
                            placeholder="Ej: Visa, Mastercard, American Express"
                            value={cardName}
                            onChange={e => setCardName(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coeficiente Base de la Tarjeta</label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Ej: 1 para normal, 1.05 para American Express"
                            value={baseFactor}
                            onChange={e => setBaseFactor(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                        />
                        <span className="text-[11px] text-gray-400">Determina el recargo base de la tarjeta. 1 significa sin recargo base.</span>
                    </div>
                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !cardName.trim() || !baseFactor}
                            className="px-5 py-2.5 text-sm font-semibold bg-black text-white hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Guardando..." : "Agregar Tarjeta"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface AddPlanModalProps {
    isOpen: boolean;
    cardName: string;
    onClose: () => void;
    onAdd: (cardName: string, installments: number, surchargeCoefficient: number) => Promise<boolean | void>;
}

function AddPlanModal({
    isOpen,
    cardName,
    onClose,
    onAdd
}: AddPlanModalProps) {
    const [installments, setInstallments] = useState("");
    const [surchargeCoefficient, setSurchargeCoefficient] = useState("1.00");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setInstallments("");
            setSurchargeCoefficient("1.00");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const quotas = Number(installments);
        const coef = Number(surchargeCoefficient);
        if (isNaN(quotas) || isNaN(coef) || quotas <= 0) return;
        setLoading(true);
        const success = await onAdd(cardName, quotas, coef);
        setLoading(false);
        if (success !== false) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 transform transition-all duration-300 scale-100 flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Añadir Plan para {cardName}</h3>
                    <button 
                        onClick={onClose}
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <Plus className="w-5 h-5 transform rotate-45" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad de Cuotas</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="Ej: 3, 6, 9, 12"
                            value={installments}
                            onChange={e => setInstallments(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                            autoFocus
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coeficiente de Recargo</label>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="Ej: 1.15 para 15% de recargo"
                            value={surchargeCoefficient}
                            onChange={e => setSurchargeCoefficient(e.target.value)}
                            required
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                        />
                        <span className="text-[11px] text-gray-400">Coeficiente multiplicador por la cantidad de cuotas. Ej: 1.2 significa 20% de recargo.</span>
                    </div>
                    <div className="flex gap-3 justify-end mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-all border border-gray-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !installments || !surchargeCoefficient}
                            className="px-5 py-2.5 text-sm font-semibold bg-black text-white hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? "Guardando..." : "Agregar Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

// Cada cuánto se revisa el vencimiento del token mientras el panel está abierto.
const SESSION_CHECK_MS = 60 * 1000;

export default function AdminPanel() {
    // Si el token guardado ya venció, ni siquiera se muestra el panel: va derecho al login.
    const [token, setToken] = useState<string | null>(() => {
        const stored = localStorage.getItem(TOKEN_KEY);
        return stored && !isTokenExpired(stored) ? stored : null;
    });
    const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
    const [sessionNotice, setSessionNotice] = useState<string | null>(() => {
        const stored = localStorage.getItem(TOKEN_KEY);
        return stored && isTokenExpired(stored) ? SESSION_MESSAGES['expired-on-open'] : null;
    });
    const [activeTab, setActiveTab] = useState('base');

    // Al abrir con un token vencido, limpiamos lo que quedó guardado.
    useEffect(() => {
        const stored = localStorage.getItem(TOKEN_KEY);
        if (stored && isTokenExpired(stored)) clearSession();
    }, []);

    const handleLogin = (newToken: string, newUsername: string) => {
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USERNAME_KEY, newUsername);
        setSessionNotice(null);
        setToken(newToken);
        setUsername(newUsername);
    };

    const handleLogout = () => {
        clearSession();
        setToken(null);
        setUsername(null);
    };

    // La sesión terminó sin que el usuario lo pidiera: se cierra YA y se explica por qué.
    // Así nunca queda un panel que parece usable pero que no guarda.
    useEffect(() => {
        const endSession = (reason: SessionEndReason) => {
            clearSession();
            setSessionNotice(SESSION_MESSAGES[reason]);
            setToken(null);
            setUsername(null);
        };

        // 1) Un guardado fue rechazado por el servidor (401/403) o el token venció al intentarlo.
        const onSessionEnded = (e: Event) => {
            const reason = (e as CustomEvent<{ reason: SessionEndReason }>).detail?.reason ?? 'rejected';
            endSession(reason);
        };
        window.addEventListener(SESSION_EXPIRED_EVENT, onSessionEnded);

        // 2) El token vence mientras el panel está abierto: se detecta sin esperar a que guarden algo.
        const checkExpiry = () => {
            const stored = localStorage.getItem(TOKEN_KEY);
            if (stored && isTokenExpired(stored)) endSession('expired-idle');
        };
        const interval = setInterval(checkExpiry, SESSION_CHECK_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') checkExpiry(); };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', checkExpiry);

        // Además, un timer exacto para el momento del vencimiento (si está a menos de ~24 días).
        let exactTimer: ReturnType<typeof setTimeout> | undefined;
        const stored = localStorage.getItem(TOKEN_KEY);
        const exp = stored ? getTokenExpiry(stored) : null;
        if (exp !== null) {
            const ms = exp - Date.now();
            if (ms > 0 && ms < 2_000_000_000) exactTimer = setTimeout(checkExpiry, ms + 500);
        }

        return () => {
            window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionEnded);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', checkExpiry);
            if (exactTimer) clearTimeout(exactTimer);
        };
    }, [token]);

    const isAdmin = !!token;

    if (!isAdmin) {
        return (
            <div className="min-h-[80vh]">
                <div className="max-w-7xl mx-auto px-4 pt-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Lock className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Configuración Restringida</h1>
                            <p className="text-sm text-gray-500">Esta sección requiere autenticación de administrador</p>
                        </div>
                    </div>
                </div>
                <Login onLogin={handleLogin} notice={sessionNotice} />
            </div>
        );
    }

    const tabs = [
        { id: 'base', label: 'Base y Dólar' },
        { id: 'propuesta', label: '📌 Propuesta' },
        { id: 'stock', label: 'iPhones (Stock)' },
        { id: 'trade', label: 'Trade-In (Toma)' },
        { id: 'finance', label: 'Financiación' },
        { id: 'gallery', label: 'Galería Clientes' },
        { id: 'store', label: '🏗️ Local' },
        { id: 'iphones', label: '📱 iPhones' },
        { id: 'accessories', label: '🎧 Accesorios' },
        { id: 'faqs', label: '❓ FAQs' },
        { id: 'users', label: '👤 Usuarios' },
    ];


    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header with session info */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Panel de Administración</h1>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <LogIn className="w-4 h-4" />
                        Sesión activa como <span className="font-semibold text-black ml-1">{username}</span>
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-100 transition-colors text-sm border border-red-100"
                >
                    Cerrar Sesión
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-max px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-white shadow-sm text-black'
                            : 'text-gray-500 hover:text-black'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'base' && <AdminBase />}
            {activeTab === 'propuesta' && <AdminPropuesta />}
            {activeTab === 'stock' && <AdminStock />}
            {activeTab === 'trade' && <AdminTradeIn />}
            {activeTab === 'finance' && <AdminFinance />}
            {activeTab === 'gallery' && <AdminGallery />}
            {activeTab === 'store' && <AdminStoreGallery />}
            { activeTab === 'iphones' && <AdminLandingIphones /> }
            {activeTab === 'accessories' && <AdminLandingAccessories />}
            {activeTab === 'faqs' && <AdminFaqs />}
            {activeTab === 'users' && <AdminUsers currentUsername={username || ''} />}
        </div>

    );
}

// ─── Base y Dólar ─────────────────────────────────────────────────────────────

function AdminBase() {
    const { data, loaded, refreshData } = useData();
    // Se guarda como texto para poder distinguir "vacío" de "0" (Number('') === 0).
    const [dolar, setDolar] = useState(String(data.config.dollar_value));
    const [touched, setTouched] = useState(false);

    // Este panel se monta antes de que llegue /api/data: sin esto el campo quedaría con el valor
    // por defecto (1000) y un "Guardar" pisaría la cotización real.
    useEffect(() => {
        if (!touched) setDolar(String(data.config.dollar_value));
    }, [data.config.dollar_value, touched]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entityType, setEntityType] = useState<'model' | 'capacity' | 'battery'>('model');
    const [modalTitle, setModalTitle] = useState('');
    const [modalLabel, setModalLabel] = useState('');
    const [modalPlaceholder, setModalPlaceholder] = useState('');
    const [modalInputType, setModalInputType] = useState<'text' | 'number'>('text');

    const openAddModal = (entity: 'model' | 'capacity' | 'battery', title: string, label: string, placeholder: string, type: 'text' | 'number' = 'text') => {
        setEntityType(entity);
        setModalTitle(title);
        setModalLabel(label);
        setModalPlaceholder(placeholder);
        setModalInputType(type);
        setIsModalOpen(true);
    };

    const handleAddBase = async (value: string): Promise<boolean> => {
        try {
            await apiFetch(`/base/${entityType}`, { method: 'POST', body: { value } });
            await refreshData();
            return true;
        } catch (e) {
            showError(e, 'Error al guardar. Es posible que ya exista.');
            return false;
        }
    };

    const saveDolar = async () => {
        const nuevo = Number(dolar);
        const actual = data.config.dollar_value;
        if (!Number.isFinite(nuevo) || nuevo <= 0) {
            alert('Ingresá un valor de dólar mayor a 0.');
            return;
        }
        // Un salto grande recalcula TODOS los precios del sitio: pedimos confirmación explícita.
        const delta = Math.abs(nuevo - actual) / (actual || 1);
        if (delta > 0.2 && !confirm(
            `Vas a cambiar el dólar de AR$ ${actual.toLocaleString('es-AR')} a AR$ ${nuevo.toLocaleString('es-AR')} (${Math.round(delta * 100)}% de diferencia).\n\nEsto recalcula TODOS los precios del sitio. ¿Confirmás?`
        )) return;

        try {
            await apiFetch('/config', { method: 'POST', body: { dollar_value: nuevo } });
            await refreshData();
            setTouched(false);
            alert('Cotización guardada exitosamente.');
        } catch (e) {
            showError(e, 'No se pudo guardar la cotización.');
        }
    };

    const removeBase = async (entity: string, val: any) => {
        try {
            await apiFetch(`/base/${entity}`, { method: 'DELETE', body: { value: val } });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar.');
        }
    };

    const dolarInvalid = dolar === '' || !(Number(dolar) > 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border shadow-sm col-span-full mb-4 flex items-end gap-4">
                <div>
                    <h3 className="font-semibold text-lg mb-2">Valor Dólar a ARS</h3>
                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={dolar}
                        onChange={e => { setTouched(true); setDolar(e.target.value); }}
                        className="border rounded-lg px-4 py-2 w-full md:w-64"
                    />
                    {!loaded && <p className="text-xs text-gray-400 mt-1">Cargando cotización actual…</p>}
                </div>
                <button
                    onClick={saveDolar}
                    disabled={!loaded || dolarInvalid}
                    className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" /> Guardar Dólar
                </button>
            </div>

            <ListEditor title="Modelos" items={data.models} onAdd={() => openAddModal('model', 'Agregar Nuevo Modelo', 'Nombre del Modelo', 'Ej: iPhone 16 Pro Max', 'text')} onRemove={(v) => removeBase('model', v)} />
            <ListEditor title="Capacidades (GB)" items={data.capacities} onAdd={() => openAddModal('capacity', 'Agregar Nueva Capacidad', 'Capacidad en GB', 'Ej: 256', 'number')} onRemove={(v) => removeBase('capacity', v)} />
            <ListEditor title="Baterías" items={data.batteries} onAdd={() => openAddModal('battery', 'Agregar Rango/Estado de Batería', 'Estado/Rango de Batería', 'Ej: +90% o 85% - 89%', 'text')} onRemove={(v) => removeBase('battery', v)} />

            <SingleInputModal
                isOpen={isModalOpen}
                title={modalTitle}
                label={modalLabel}
                placeholder={modalPlaceholder}
                inputType={modalInputType}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddBase}
            />
        </div>
    );
}

function ListEditor({ title, items, onAdd, onRemove }: { title: string, items: any[], onAdd: () => void, onRemove: (v: any) => void }) {
    return (
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">{title}</h3>
                <button onClick={onAdd} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm border border-gray-100">
                        <span>{item}</span>
                        <button onClick={() => onRemove(item)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                {items.length === 0 && <span className="text-sm text-gray-400">Sin datos</span>}
            </div>
        </div>
    );
}

// ─── Stock ────────────────────────────────────────────────────────────────────

function AdminStock() {
    const { data, refreshData } = useData();
    const [model, setModel] = useState(data.models[0] || "");
    const [cap, setCap] = useState(data.capacities[0] || 0);
    const [bat, setBat] = useState(data.batteries[0] || "");
    const [price, setPrice] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterModel, setFilterModel] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        if (!model && data.models.length > 0) setModel(data.models[0]);
        if (cap === 0 && data.capacities.length > 0) setCap(data.capacities[0]);
        if (!bat && data.batteries.length > 0) setBat(data.batteries[0]);
    }, [data.models, data.capacities, data.batteries]);

    const handleQuickAddModel = () => {
        setIsModalOpen(true);
    };

    const handleAddQuickModel = async (name: string): Promise<boolean> => {
        try {
            await apiFetch('/base/model', { method: 'POST', body: { value: name } });
            await refreshData();
            setModel(name);
            return true;
        } catch (e) {
            showError(e, 'Error al guardar el modelo. Es posible que ya exista.');
            return false;
        }
    };

    const handleSave = async () => {
        if (!model || cap === 0 || !bat || price === 0) return alert("Completa todos los campos con valores válidos");
        
        const payload = { model, capacity_gb: cap, battery_status: bat, price_usd: price };
        
        try {
            if (editingId) {
                await apiFetch(`/stock/${editingId}`, { method: 'PUT', body: payload });
                alert("Stock actualizado en la base de datos");
                setEditingId(null);
            } else {
                await apiFetch('/stock', { method: 'POST', body: payload });
                alert("Stock agregado a la base de datos");
            }
            
            // Reset fields
            setPrice(0);
            await refreshData();
        } catch (e) {
            showError(e, 'Error al guardar stock');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setModel(data.models[0] || "");
        setCap(data.capacities[0] || 0);
        setBat(data.batteries[0] || "");
        setPrice(0);
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setModel(item.model);
        setCap(item.capacity_gb);
        setBat(item.battery_status);
        setPrice(item.price_usd);
    };

    const removeStock = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este registro de stock?")) {
            try {
                await apiFetch(`/stock/${id}`, { method: 'DELETE' });
                if (editingId === id) {
                    cancelEdit();
                }
                await refreshData();
            } catch (e) {
                showError(e, 'No se pudo eliminar el registro.');
            }
        }
    };

    // Filter stock
    const filteredStock = data.iphoneStock.filter(s => {
        const matchesModel = filterModel ? s.model === filterModel : true;
        const query = searchTerm.toLowerCase();
        const matchesQuery = (
            s.model.toLowerCase().includes(query) ||
            s.capacity_gb.toString().includes(query) ||
            s.battery_status.toLowerCase().includes(query)
        );
        return matchesModel && matchesQuery;
    });

    // Chronological Sort: newest model to oldest model
    const sortedStock = [...filteredStock].sort((a, b) => {
        const weightA = getModelOrderWeight(a.model);
        const weightB = getModelOrderWeight(b.model);
        if (weightA !== weightB) {
            return weightB - weightA; // Newer first
        }
        if (a.capacity_gb !== b.capacity_gb) {
            return b.capacity_gb - a.capacity_gb; // Larger capacity first
        }
        return b.price_usd - a.price_usd; // Higher price first
    });

    // Pagination
    const totalItems = sortedStock.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedStock = sortedStock.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-4 self-start">
                <h3 className="font-semibold text-lg mb-4">{editingId ? 'Editar Combinación (Venta)' : 'Alta de Combinación (Venta)'}</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 items-center w-full">
                        <select value={model} onChange={e => setModel(e.target.value)} className="border p-2 rounded flex-1 bg-white">
                            <option value="">Seleccionar Modelo...</option>
                            {data.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button
                            type="button"
                            onClick={handleQuickAddModel}
                            className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 border flex items-center justify-center shrink-0"
                            title="Alta Rápida de Modelo"
                        >
                            <Plus className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <select value={cap} onChange={e => setCap(Number(e.target.value))} className="border p-2 rounded w-full bg-white">
                        <option value={0}>Seleccionar Capacidad...</option>
                        {data.capacities.map(c => <option key={c} value={c}>{c} GB</option>)}
                    </select>
                    <select value={bat} onChange={e => setBat(e.target.value)} className="border p-2 rounded w-full bg-white">
                        <option value="">Seleccionar Batería...</option>
                        {data.batteries.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="mt-2">
                        <label className="text-xs text-gray-500">Precio de Venta (USD)</label>
                        <input type="number" value={price === 0 ? '' : price} onChange={e => setPrice(Number(e.target.value))} className="border p-2 rounded w-full" placeholder="Ej: 1100" />
                    </div>
                    <button onClick={handleSave} className="mt-2 w-full bg-black text-white p-2 text-sm rounded-lg hover:bg-gray-800">
                        {editingId ? 'Guardar Cambios' : 'Agregar Stock'}
                    </button>
                    {editingId && (
                        <button onClick={cancelEdit} className="w-full text-gray-500 text-sm hover:underline mt-1">
                            Cancelar Edición
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h3 className="font-semibold text-lg">Stock en Base de Datos</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select
                            value={filterModel}
                            onChange={e => {
                                setFilterModel(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="border px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        >
                            <option value="">Todos los Modelos</option>
                            {data.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="w-full sm:w-64">
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar..." 
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full border px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
                    {paginatedStock.length === 0 && <p className="text-gray-400 text-center py-4">No se encontraron equipos en stock</p>}
                    {paginatedStock.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50">
                            <div>
                                <span className="font-semibold">{s.model} {s.capacity_gb}GB</span> - <span className="text-sm font-medium text-blue-600 px-2 py-1 bg-blue-50 rounded">{s.battery_status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right mr-2">
                                    <div className="font-bold">U$D {s.price_usd}</div>
                                </div>
                                <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => removeStock(s.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Mostrando <span className="font-semibold text-gray-900">{Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> a <span className="font-semibold text-gray-900">{Math.min(totalItems, currentPage * ITEMS_PER_PAGE)}</span> de <span className="font-semibold text-gray-900">{totalItems}</span> registros
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Anterior
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                                        currentPage === p 
                                            ? 'bg-black text-white' 
                                            : 'border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <QuickAddModelModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onAdd={handleAddQuickModel} 
            />
        </div>
    );
}

// ─── Trade-In ─────────────────────────────────────────────────────────────────

function AdminTradeIn() {
    const { data, refreshData } = useData();
    const [model, setModel] = useState(data.models[0] || "");
    const [cap, setCap] = useState(data.capacities[0] || 0);
    const [bat, setBat] = useState(data.batteries[0] || "");
    const [price, setPrice] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterModel, setFilterModel] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        if (!model && data.models.length > 0) setModel(data.models[0]);
        if (cap === 0 && data.capacities.length > 0) setCap(data.capacities[0]);
        if (!bat && data.batteries.length > 0) setBat(data.batteries[0]);
    }, [data.models, data.capacities, data.batteries]);

    const handleQuickAddModel = () => {
        setIsModalOpen(true);
    };

    const handleAddQuickModel = async (name: string): Promise<boolean> => {
        try {
            await apiFetch('/base/model', { method: 'POST', body: { value: name } });
            await refreshData();
            setModel(name);
            return true;
        } catch (e) {
            showError(e, 'Error al guardar el modelo. Es posible que ya exista.');
            return false;
        }
    };

    const handleSave = async () => {
        if (!model || cap === 0 || !bat || price === 0) return alert("Completa todos los campos con valores válidos");
        
        const payload = { model, capacity_gb: cap, battery_range: bat, price_usd: price };
        
        try {
            if (editingId) {
                await apiFetch(`/tradein/${editingId}`, { method: 'PUT', body: payload });
                alert("Precio de toma actualizado en la base de datos");
                setEditingId(null);
            } else {
                await apiFetch('/tradein', { method: 'POST', body: payload });
                alert("Precio de toma agregado a la base de datos");
            }
            
            // Reset fields
            setPrice(0);
            await refreshData();
        } catch (e) {
            showError(e, 'Error al guardar precio de toma');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setModel(data.models[0] || "");
        setCap(data.capacities[0] || 0);
        setBat(data.batteries[0] || "");
        setPrice(0);
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setModel(item.model);
        setCap(item.capacity_gb);
        setBat(item.battery_range);
        setPrice(item.price_usd);
    };

    const removeTradeIn = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este precio de toma?")) {
            try {
                await apiFetch(`/tradein/${id}`, { method: 'DELETE' });
                if (editingId === id) {
                    cancelEdit();
                }
                await refreshData();
            } catch (e) {
                showError(e, 'No se pudo eliminar el precio de toma.');
            }
        }
    };

    // Filter trade-in prices
    const filteredTradeIn = data.tradeInPrices.filter(s => {
        const matchesModel = filterModel ? s.model === filterModel : true;
        const query = searchTerm.toLowerCase();
        const matchesQuery = (
            s.model.toLowerCase().includes(query) ||
            s.capacity_gb.toString().includes(query) ||
            s.battery_range.toLowerCase().includes(query)
        );
        return matchesModel && matchesQuery;
    });

    // Chronological Sort: newest model to oldest model
    const sortedTradeIn = [...filteredTradeIn].sort((a, b) => {
        const weightA = getModelOrderWeight(a.model);
        const weightB = getModelOrderWeight(b.model);
        if (weightA !== weightB) {
            return weightB - weightA; // Newer first
        }
        if (a.capacity_gb !== b.capacity_gb) {
            return b.capacity_gb - a.capacity_gb; // Larger capacity first
        }
        return b.price_usd - a.price_usd; // Higher price first
    });

    // Pagination
    const totalItems = sortedTradeIn.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedTradeIn = sortedTradeIn.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-4 self-start">
                <h3 className="font-semibold text-lg mb-4">{editingId ? 'Editar Precio de Toma (Trade-In)' : 'Alta Precio de Toma (Trade-In)'}</h3>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 items-center w-full">
                        <select value={model} onChange={e => setModel(e.target.value)} className="border p-2 rounded flex-1 bg-white">
                            <option value="">Seleccionar Modelo...</option>
                            {data.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <button
                            type="button"
                            onClick={handleQuickAddModel}
                            className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 border flex items-center justify-center shrink-0"
                            title="Alta Rápida de Modelo"
                        >
                            <Plus className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <select value={cap} onChange={e => setCap(Number(e.target.value))} className="border p-2 rounded w-full bg-white">
                        <option value={0}>Seleccionar Capacidad...</option>
                        {data.capacities.map(c => <option key={c} value={c}>{c} GB</option>)}
                    </select>
                    <select value={bat} onChange={e => setBat(e.target.value)} className="border p-2 rounded w-full bg-white">
                        <option value="">Seleccionar Batería...</option>
                        {data.batteries.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="mt-2">
                        <label className="text-xs text-gray-500">Precio de toma USD</label>
                        <input type="number" value={price === 0 ? '' : price} onChange={e => setPrice(Number(e.target.value))} className="border p-2 rounded w-full" placeholder="Ej: 300" />
                    </div>
                    <button onClick={handleSave} className="mt-2 w-full bg-black text-white p-2 text-sm rounded-lg hover:bg-gray-800">
                        {editingId ? 'Guardar Cambios' : 'Agregar Toma DB'}
                    </button>
                    {editingId && (
                        <button onClick={cancelEdit} className="w-full text-gray-500 text-sm hover:underline mt-1">
                            Cancelar Edición
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h3 className="font-semibold text-lg">Catálogo de Tomas</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select
                            value={filterModel}
                            onChange={e => {
                                setFilterModel(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="border px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white"
                        >
                            <option value="">Todos los Modelos</option>
                            {data.models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="w-full sm:w-64">
                            <input 
                                type="text" 
                                placeholder="🔍 Buscar..." 
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full border px-3 py-1.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2">
                    {paginatedTradeIn.length === 0 && <p className="text-gray-400 text-center py-4">No se encontraron precios de toma</p>}
                    {paginatedTradeIn.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50">
                            <div>
                                <span className="font-semibold">{s.model} {s.capacity_gb}GB</span> - {s.battery_range}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="font-bold mr-2">U$D {s.price_usd}</div>
                                <button onClick={() => startEdit(s)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => removeTradeIn(s.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            Mostrando <span className="font-semibold text-gray-900">{Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> a <span className="font-semibold text-gray-900">{Math.min(totalItems, currentPage * ITEMS_PER_PAGE)}</span> de <span className="font-semibold text-gray-900">{totalItems}</span> registros
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 text-sm font-medium border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Anterior
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                                        currentPage === p 
                                            ? 'bg-black text-white' 
                                            : 'border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 text-sm font-medium border rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <QuickAddModelModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onAdd={handleAddQuickModel} 
            />
        </div>
    );
}

// ─── Financiación ─────────────────────────────────────────────────────────────

function AdminFinance() {
    const { data, refreshData } = useData();

    // Modal state for adding a Card
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);

    // Modal state for adding a Plan
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedCardName, setSelectedCardName] = useState("");

    const handleAddCard = async (name: string, baseFactor: number): Promise<boolean> => {
        try {
            await apiFetch('/cards', { method: 'POST', body: { card_name: name, base_factor: baseFactor } });
            await refreshData();
            return true;
        } catch (e) {
            showError(e, 'Error al agregar la tarjeta. Es posible que ya exista.');
            return false;
        }
    };

    const handleAddPlan = async (cardName: string, installments: number, surchargeCoefficient: number): Promise<boolean> => {
        try {
            await apiFetch('/plans', { method: 'POST', body: { card_name: cardName, installments, surcharge_coefficient: surchargeCoefficient } });
            await refreshData();
            return true;
        } catch (e) {
            showError(e, 'Error al agregar el plan. Es posible que ya exista.');
            return false;
        }
    };

    const removeCard = async (card_name: string) => {
        if (confirm(`¿Estás seguro de eliminar la tarjeta ${card_name}?`)) {
            try {
                await apiFetch(`/cards/${encodeURIComponent(card_name)}`, { method: 'DELETE' });
                await refreshData();
            } catch (e) {
                showError(e, 'No se pudo eliminar la tarjeta.');
            }
        }
    };

    const handleEditCard = async (card_name: string, currentFactor: number) => {
        const val = prompt(`Nuevo coeficiente base para ${card_name}`, String(currentFactor));
        if (val === null) return;
        const newFactor = Number(val);
        if (val.trim() === '' || !Number.isFinite(newFactor) || newFactor <= 0) return alert("Debe ser un número válido mayor a 0");

        try {
            await apiFetch(`/cards/${encodeURIComponent(card_name)}`, { method: 'PUT', body: { base_factor: newFactor } });
            await refreshData();
            alert("Coeficiente actualizado.");
        } catch (e) { showError(e, "No se pudo actualizar el coeficiente."); }
    };

    const removePlan = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este plan?")) {
            try {
                await apiFetch(`/plans/${id}`, { method: 'DELETE' });
                await refreshData();
            } catch (e) {
                showError(e, 'No se pudo eliminar el plan.');
            }
        }
    };

    const handleEditPlan = async (id: string, currentInst: number, currentCoeff: number) => {
        const val = prompt(`Nuevo coeficiente para el plan de ${currentInst} cuotas`, String(currentCoeff));
        if (val === null) return;
        const newCoeff = Number(val);
        if (val.trim() === '' || !Number.isFinite(newCoeff) || newCoeff <= 0) return alert("Debe ser un número válido mayor a 0");

        try {
            await apiFetch(`/plans/${id}`, { method: 'PUT', body: { installments: currentInst, surcharge_coefficient: newCoeff } });
            await refreshData();
            alert("Coeficiente actualizado.");
        } catch (e) { showError(e, "No se pudo actualizar el coeficiente."); }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
                <div>
                    <h2 className="text-xl font-bold">Tarjetas y Planes DB</h2>
                    <p className="text-gray-500 text-sm">Gestiona financiamiento remoto.</p>
                </div>
                <button onClick={() => setIsCardModalOpen(true)} className="bg-black text-white px-4 py-2 font-medium rounded-lg hover:bg-gray-800">
                    Nueva Tarjeta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.cards.map(c => (
                    <div key={c.card_name} className="bg-white p-6 rounded-2xl border shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <div>
                                <h3 className="font-bold text-lg">{c.card_name}</h3>
                                <p className="text-xs text-gray-500">Base factor: {c.base_factor}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditCard(c.card_name, c.base_factor)} className="text-blue-500 bg-blue-50 p-2 rounded hover:bg-blue-100" title="Editar Factor"><Pencil className="w-5 h-5" /></button>
                                <button onClick={() => removeCard(c.card_name)} className="text-red-500 bg-red-50 p-2 rounded hover:bg-red-100" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mb-4">
                            {data.plans.filter(p => p.card_name === c.card_name).map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                                    <span className="font-medium">{p.installments} Cuotas</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-blue-600">x{p.surcharge_coefficient}</span>
                                        <button onClick={() => handleEditPlan(p.id, p.installments, p.surcharge_coefficient)} className="text-blue-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => removePlan(p.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => { setSelectedCardName(c.card_name); setIsPlanModalOpen(true); }} className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-600 hover:border-gray-500">
                            + Añadir Plan
                        </button>
                    </div>
                ))}
            </div>

            <AddCardModal
                isOpen={isCardModalOpen}
                onClose={() => setIsCardModalOpen(false)}
                onAdd={handleAddCard}
            />

            <AddPlanModal
                isOpen={isPlanModalOpen}
                cardName={selectedCardName}
                onClose={() => setIsPlanModalOpen(false)}
                onAdd={handleAddPlan}
            />
        </div>
    );
}

// ─── Galería ──────────────────────────────────────────────────────────────────

function AdminGallery() {
    const { data, refreshData } = useData();
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [successModal, setSuccessModal] = useState(false);

    const handleSave = async () => {
        if (!file && !editingId) return alert("Selecciona una imagen");
        const formData = new FormData();
        if (file) formData.append('image', file);
        formData.append('description', description);

        const path = editingId ? `/gallery/${editingId}` : '/gallery';
        const method = editingId ? 'PUT' : 'POST';

        try {
            await apiFetch(path, { method, body: formData });
        } catch (e) {
            showError(e, 'No se pudo guardar la imagen.');
            return;
        }
        await refreshData();
        setFile(null);
        setDescription("");
        setEditingId(null);
        setSuccessModal(true);
        setTimeout(() => setSuccessModal(false), 2500);
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setDescription(item.description || "");
        setFile(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar imagen?")) return;
        try {
            await apiFetch(`/gallery/${id}`, { method: 'DELETE' });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar la imagen.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            {successModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl transition-all scale-100 w-full max-w-sm">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">¡Cargado Exitosamente!</h3>
                        <p className="text-gray-500 font-medium">La galería fue actualizada correctamente.</p>
                    </div>
                </div>
            )}
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-4 self-start">
                <h3 className="font-semibold text-lg mb-4">{editingId ? 'Editar Imagen' : 'Nueva Imagen'}</h3>
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Imagen</label>
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="border p-2 rounded w-full text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Descripción</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="border p-2 rounded w-full text-sm" placeholder="Ej: Cliente feliz con su iPhone 15" />
                    </div>
                    <button onClick={handleSave} className="mt-2 w-full bg-black text-white p-2 text-sm rounded-lg hover:bg-gray-800">
                        {editingId ? 'Actualizar' : 'Subir Imagen'}
                    </button>
                    {editingId && <button onClick={() => { setEditingId(null); setDescription(""); setFile(null); }} className="w-full text-gray-500 text-sm hover:underline mt-2">Cancelar Edición</button>}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-8">
                <h3 className="font-semibold text-lg mb-4">Fotos de la Galería</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.gallery?.map(g => (
                        <div key={g.id} className="border rounded-xl overflow-hidden shadow-sm flex flex-col">
                            <div className="h-48 bg-gray-100 relative">
                                <img src={`${BASE_URL}${g.image_url}`} alt={g.description} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3 bg-white flex flex-col flex-1 justify-between">
                                <p className="text-sm text-gray-700 italic mb-3">"{g.description}"</p>
                                <div className="flex justify-between items-center mt-auto">
                                    <button onClick={() => handleEdit(g)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Editar</button>
                                    <button onClick={() => handleDelete(g.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!data.gallery || data.gallery.length === 0) && <p className="text-gray-400 p-4">No hay fotos en la galería.</p>}
                </div>
            </div>
        </div>
    );
}

// ─── Gestión de Usuarios ──────────────────────────────────────────────────────

interface UserEntry {
    id: string;
    username: string;
}

function AdminUsers({ currentUsername }: { currentUsername: string }) {
    const [users, setUsers] = useState<UserEntry[]>([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchUsers = async () => {
        try {
            setUsers(await apiFetch('/users'));
        } catch (e) {
            showError(e, 'No se pudo cargar la lista de usuarios.');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !newPassword.trim()) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const data = await apiFetch('/users', { method: 'POST', body: { username: newUsername.trim(), password: newPassword } });
            setSuccess(`Usuario "${data.username}" creado exitosamente.`);
            setNewUsername('');
            setNewPassword('');
            await fetchUsers();
        } catch (e) {
            // Si la sesión terminó, el panel ya pasa al login: no mostramos un error suelto.
            if (!(e instanceof ApiError && e.sessionEnded)) {
                setError(e instanceof Error ? e.message : 'Error al crear usuario');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (username === currentUsername) {
            alert('No puedes eliminar tu propio usuario.');
            return;
        }
        if (!confirm(`¿Eliminar el usuario "${username}"? Esta acción no se puede deshacer.`)) return;
        try {
            await apiFetch(`/users/${id}`, { method: 'DELETE' });
            await fetchUsers();
        } catch (e) {
            showError(e, 'No se pudo eliminar el usuario.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create user form */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-4 self-start">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg">Nuevo Usuario</h3>
                </div>
                <form onSubmit={handleCreate} className="flex flex-col gap-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Nombre de usuario</label>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            className="border p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            placeholder="Ej: JuanAdmin"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="border p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            placeholder="Contraseña segura"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                    {success && <p className="text-green-600 text-xs bg-green-50 px-3 py-2 rounded-lg">{success}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full bg-black text-white p-2.5 text-sm rounded-xl hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {loading ? 'Creando...' : 'Dar de Alta'}
                    </button>
                </form>
                <p className="mt-4 text-xs text-gray-400 leading-relaxed">Todos los usuarios pueden acceder y gestionar la configuración completa del sistema.</p>
            </div>

            {/* Users list */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-8">
                <h3 className="font-semibold text-lg mb-4">
                    Usuarios del Sistema
                    <span className="ml-2 text-sm font-normal text-gray-400">({users.length} usuarios)</span>
                </h3>
                <div className="flex flex-col gap-3">
                    {users.map(u => (
                        <div
                            key={u.id}
                            className="flex justify-between items-center p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold">{u.username}</p>
                                    {u.username === currentUsername && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Tu sesión actual</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(u.id, u.username)}
                                disabled={u.username === currentUsername}
                                className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={u.username === currentUsername ? 'No puedes eliminarte a ti mismo' : `Eliminar ${u.username}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {users.length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-8">No hay usuarios cargados.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Propuesta (Nuestra Garantía cards) ──────────────────────────────────────

const ICON_OPTIONS = ['Package', 'ShieldCheck', 'RefreshCw', 'MessageCircleHeart', 'Star', 'Zap', 'Award', 'Heart'];

function AdminPropuesta() {
    const { data, refreshData } = useData();
    const [cards, setCards] = useState(() => data.feature_cards);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const updateCard = (index: number, field: 'title' | 'desc' | 'icon', value: string) => {
        setCards(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiFetch('/feature-cards', { method: 'POST', body: { feature_cards: cards } });
            await refreshData();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            showError(e, 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
                <div>
                    <h2 className="text-xl font-bold">Sección "Nuestra Garantía"</h2>
                    <p className="text-gray-500 text-sm mt-1">Editá los 4 cards que se muestran en la landing page.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-black text-white hover:bg-gray-900'} disabled:opacity-50`}
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-sm">{i + 1}</div>
                            <h3 className="font-bold text-gray-700">Card {i + 1}</h3>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ícono</label>
                            <select
                                value={card.icon}
                                onChange={e => updateCard(i, 'icon', e.target.value)}
                                className="border rounded-xl px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {ICON_OPTIONS.map(icon => (
                                    <option key={icon} value={icon}>{icon}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Título</label>
                            <input
                                type="text"
                                value={card.title}
                                onChange={e => updateCard(i, 'title', e.target.value)}
                                className="border rounded-xl px-3 py-2.5 w-full text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Ej: Garantía Oficial"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Descripción</label>
                            <textarea
                                value={card.desc}
                                onChange={e => updateCard(i, 'desc', e.target.value)}
                                rows={3}
                                className="border rounded-xl px-3 py-2.5 w-full text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Describí este beneficio..."
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Store Gallery ─────────────────────────────────────────────────────────────

function AdminStoreGallery() {
    const { data, refreshData } = useData();
    const [uploading, setUploading] = useState(false);
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);
        if (description) formData.append('description', description);
        try {
            await apiFetch('/store-gallery', { method: 'POST', body: formData });
            setDescription('');
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            await refreshData();
        } catch (e) {
            showError(e, 'Error al subir la imagen.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta foto del local?')) return;
        try {
            await apiFetch(`/store-gallery/${id}`, { method: 'DELETE' });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar la foto.');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="text-xl font-bold mb-1">Fotos del Local</h2>
                <p className="text-gray-500 text-sm mb-6">Subí fotos del interior. Aparecerán en la sección "Nuestro Local" de la landing, desplazándose de derecha a izquierda.</p>
                <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={e => setFile(e.target.files?.[0] ?? null)}
                        className="flex-1 border rounded-xl px-3 py-2.5 text-sm"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Descripción (opcional)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="flex-1 border rounded-xl px-3 py-2.5 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={uploading}
                        className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {uploading ? 'Subiendo...' : 'Subir Foto'}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(data.storeGallery ?? []).map(item => (
                    <div key={item.id} className="bg-white rounded-2xl overflow-hidden border shadow-sm group relative">
                        <img
                            src={`${BASE_URL}${item.image_url}`}
                            alt={item.description || 'Local'}
                            className="w-full aspect-[3/4] object-cover"
                        />
                        <div className="p-3">
                            <p className="text-xs text-gray-500 truncate">{item.description || '—'}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                {(data.storeGallery ?? []).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-full text-center py-12">Todavía no hay fotos del local cargadas.</p>
                )}
            </div>
        </div>
    );
}

// ─── Landing Iphones Management ────────────────────────────────────────────────

function AdminLandingIphones() {
    const { data, refreshData } = useData();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [order, setOrder] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file && !name) return;
        setLoading(true);
        const formData = new FormData();
        if (file) formData.append('image', file);
        formData.append('name', name);
        formData.append('price_string', price);
        formData.append('order_index', String(order));

        try {
            await apiFetch('/landing-iphones', { method: 'POST', body: formData });
            setName('');
            setPrice('');
            setOrder(0);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            await refreshData();
        } catch (e) {
            showError(e, 'Error al guardar el iPhone.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este iPhone de la landing?')) return;
        try {
            await apiFetch(`/landing-iphones/${id}`, { method: 'DELETE' });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar el iPhone.');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="text-xl font-bold mb-1">Catálogo de iPhones (Landing)</h2>
                <p className="text-gray-500 text-sm mb-6">Gestioná los modelos que aparecen en la sección destacada de la página principal.</p>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Modelo / Nombre</label>
                        <input
                            type="text"
                            placeholder="Ej: iPhone 17 Pro"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Precio (Texto)</label>
                        <input
                            type="text"
                            placeholder="Ej: Desde $799.999 (Opcional)"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Orden</label>
                        <input
                            type="number"
                            value={order}
                            onChange={e => setOrder(Number(e.target.value))}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Imagen del Producto</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                            className="border rounded-xl px-3 py-2 text-sm w-full"
                            required
                        />
                    </div>
                    <div className="flex items-end md:col-span-1">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {loading ? 'Guardando...' : 'Agregar iPhone'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(data.landingIphones ?? []).map(item => (
                    <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden border shadow-sm group relative flex flex-col">
                        <div className="aspect-square bg-[#f5f5f7] p-8 flex items-center justify-center">
                            <img
                                src={`${BASE_URL}${item.image_url}`}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-5 flex-1 flex flex-col items-center text-center">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Orden: {item.order_index}</span>
                            <h4 className="font-bold text-lg mb-1">{item.name}</h4>
                            <p className="text-gray-500 text-sm font-medium">{item.price_string}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="absolute top-4 right-4 bg-white/80 backdrop-blur-md text-red-500 p-2 rounded-full shadow-md hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {(data.landingIphones ?? []).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-full text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed">No hay iPhones cargados para la landing.</p>
                )}
            </div>
        </div>
    );
}

// ─── Landing Accessories Management ────────────────────────────────────────────

function AdminLandingAccessories() {
    const { data, refreshData } = useData();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [order, setOrder] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file && !name) return;
        setLoading(true);
        const formData = new FormData();
        if (file) formData.append('image', file);
        formData.append('name', name);
        formData.append('price_string', price);
        formData.append('order_index', String(order));

        try {
            await apiFetch('/landing-accessories', { method: 'POST', body: formData });
            setName('');
            setPrice('');
            setOrder(0);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            await refreshData();
        } catch (e) {
            showError(e, 'Error al guardar el accesorio.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este accesorio de la landing?')) return;
        try {
            await apiFetch(`/landing-accessories/${id}`, { method: 'DELETE' });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar el accesorio.');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h2 className="text-xl font-bold mb-1">Catálogo de Accesorios (Landing)</h2>
                <p className="text-gray-500 text-sm mb-6">Gestioná los modelos que aparecen en la sección destacada de accesorios de la página principal.</p>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Modelo / Nombre</label>
                        <input
                            type="text"
                            placeholder="Ej: AirPods Pro"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Precio (Texto)</label>
                        <input
                            type="text"
                            placeholder="Ej: Desde $299.999 (Opcional)"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Orden</label>
                        <input
                            type="number"
                            value={order}
                            onChange={e => setOrder(Number(e.target.value))}
                            className="border rounded-xl px-3 py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Imagen del Producto</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            onChange={e => setFile(e.target.files?.[0] ?? null)}
                            className="border rounded-xl px-3 py-2 text-sm w-full"
                            required
                        />
                    </div>
                    <div className="flex items-end md:col-span-1">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            {loading ? 'Guardando...' : 'Agregar Accesorio'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {(data.landingAccessories ?? []).map(item => (
                    <div key={item.id} className="bg-white rounded-[2rem] overflow-hidden border shadow-sm group relative flex flex-col">
                        <div className="aspect-square bg-[#f5f5f7] p-8 flex items-center justify-center">
                            <img
                                src={`${BASE_URL}${item.image_url}`}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="p-5 flex-1 flex flex-col items-center text-center">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Orden: {item.order_index}</span>
                            <h4 className="font-bold text-lg mb-1">{item.name}</h4>
                            <p className="text-gray-500 text-sm font-medium">{item.price_string}</p>
                        </div>
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="absolute top-4 right-4 bg-white/80 backdrop-blur-md text-red-500 p-2 rounded-full shadow-md hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {(data.landingAccessories ?? []).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-full text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed">No hay accesorios cargados para la landing.</p>
                )}
            </div>
        </div>
    );
}

// ─── FAQ Management ────────────────────────────────────────────────────────────

function AdminFaqs() {
    const { data, refreshData } = useData();
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [order, setOrder] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question || !answer) return;
        setLoading(true);
        const payload = { question, answer, order: Number(order) };
        const path = editingId ? `/faqs/${editingId}` : '/faqs';
        const method = editingId ? 'PUT' : 'POST';

        try {
            await apiFetch(path, { method, body: payload });
            setQuestion('');
            setAnswer('');
            setOrder(0);
            setEditingId(null);
            await refreshData();
        } catch (e) {
            showError(e, 'Error al guardar la FAQ.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (faqi: any) => {
        setEditingId(faqi.id);
        setQuestion(faqi.question);
        setAnswer(faqi.answer);
        setOrder(faqi.order);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta pregunta frecuente?')) return;
        try {
            await apiFetch(`/faqs/${id}`, { method: 'DELETE' });
            await refreshData();
        } catch (e) {
            showError(e, 'No se pudo eliminar la pregunta.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-4 self-start">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-lg">{editingId ? 'Editar FAQ' : 'Nueva FAQ'}</h3>
                </div>
                <form onSubmit={handleSave} className="flex flex-col gap-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Pregunta</label>
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            className="border p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            placeholder="¿Cuál es la garantía?"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Respuesta</label>
                        <textarea
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            className="border p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                            rows={4}
                            placeholder="La garantía es de 12 meses..."
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Orden</label>
                        <input
                            type="number"
                            value={order}
                            onChange={e => setOrder(Number(e.target.value))}
                            className="border p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full bg-black text-white p-2.5 text-sm rounded-xl hover:bg-gray-900 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Guardando...' : editingId ? 'Actualizar FAQ' : 'Agregar FAQ'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={() => { setEditingId(null); setQuestion(''); setAnswer(''); setOrder(0); }}
                            className="text-gray-500 text-xs hover:underline mt-1"
                        >
                            Cancelar edición
                        </button>
                    )}
                </form>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm lg:col-span-8">
                <h3 className="font-semibold text-lg mb-4">Listado de Preguntas Frecuentes</h3>
                <div className="flex flex-col gap-4">
                    {(data.faqs ?? []).map(f => (
                        <div key={f.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between gap-4 group hover:bg-white transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold border text-gray-500">Pos: {f.order}</span>
                                    <h4 className="font-bold text-gray-900">{f.question}</h4>
                                </div>
                                <p className="text-sm text-gray-600 font-medium">{f.answer}</p>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <button
                                    onClick={() => handleEdit(f)}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(f.id)}
                                    className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(data.faqs?.length === 0) && (
                        <p className="text-gray-400 text-center py-12 border border-dashed rounded-2xl">No hay preguntas frecuentes cargadas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

