import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { PricesMeta } from '../context/DataContext';
import { fmtNum, nowArgentina } from '../lib/format';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ShoppingCart, Calculator, ArrowRight, CheckCircle2, Smartphone, HelpCircle, ChevronUp } from 'lucide-react';

const WHATSAPP_NUMBER = '5493855953712';

export default function SimulationPanel() {
    const { data, meta, loaded, error, refreshData, ensureFresh } = useData();

    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(1);

    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [selectedCapacity, setSelectedCapacity] = useState<number | null>(null);
    const [selectedBattery, setSelectedBattery] = useState<string | null>(null);

    const [hasTradeIn, setHasTradeIn] = useState<boolean | null>(null);
    const [tradeInModel, setTradeInModel] = useState<string | null>(null);
    const [tradeInCapacity, setTradeInCapacity] = useState<number | null>(null);
    const [tradeInBattery, setTradeInBattery] = useState<string | null>(null);

    const [cashAdvanceUSD, setCashAdvanceUSD] = useState<number | ''>('');
    const [cashAdvanceARS, setCashAdvanceARS] = useState<number | ''>('');

    const [selectedCard, setSelectedCard] = useState<string | null>(null);
    const [selectedInstallments, setSelectedInstallments] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    // Verificación de precios justo antes de abrir WhatsApp.
    const [checkingPrices, setCheckingPrices] = useState(false);
    const [priceAlert, setPriceAlert] = useState<string | null>(null);
    // Hora de respaldo (solo si el servidor no mandó la suya).
    const [fallbackQuotedAt, setFallbackQuotedAt] = useState(() => nowArgentina());

    // Resumen fijo inferior (mobile): visible solo mientras el simulador está en pantalla.
    const rootRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(() => !('IntersectionObserver' in window));
    const [summaryOpen, setSummaryOpen] = useState(false);

    useEffect(() => {
        const el = rootRef.current;
        if (!el || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useBodyScrollLock(isModalOpen);

    // --- DERIVED DATA ---
    const availableCapacities = useMemo(() => {
        if (!selectedModel) return [];
        const caps = data.iphoneStock
            .filter(s => s.model === selectedModel)
            .map(s => s.capacity_gb);
        return Array.from(new Set(caps)).sort((a, b) => a - b);
    }, [selectedModel, data.iphoneStock]);

    const availableBatteries = useMemo(() => {
        if (!selectedModel || !selectedCapacity) return [];
        const bats = data.iphoneStock
            .filter(s => s.model === selectedModel && s.capacity_gb === selectedCapacity)
            .map(s => s.battery_status);
        return Array.from(new Set(bats));
    }, [selectedModel, selectedCapacity, data.iphoneStock]);

    const matchedIphone = useMemo(() => {
        if (!selectedModel || !selectedCapacity || !selectedBattery) return null;
        // Buscamos ignorando el color
        return data.iphoneStock.find(s =>
            s.model === selectedModel &&
            s.capacity_gb === selectedCapacity &&
            s.battery_status === selectedBattery
        );
    }, [selectedModel, selectedCapacity, selectedBattery, data.iphoneStock]);

    const tradeInDiscountUSD = useMemo(() => {
        if (!hasTradeIn || !tradeInModel || !tradeInCapacity || !tradeInBattery) return 0;
        const match = data.tradeInPrices.find(b =>
            b.model === tradeInModel &&
            b.capacity_gb === tradeInCapacity &&
            b.battery_range === tradeInBattery
        );
        return match ? match.price_usd : 0;
    }, [hasTradeIn, tradeInModel, tradeInCapacity, tradeInBattery, data.tradeInPrices]);
    const tradeInDiscountARS = tradeInDiscountUSD * data.config.dollar_value;

    const subtotalIphoneUSD = matchedIphone ? matchedIphone.price_usd : 0;
    const subtotalIphoneARS = subtotalIphoneUSD * data.config.dollar_value;

    const totalPurchaseARS = subtotalIphoneARS;

    const cashAdvanceResolvedUSD = Number(cashAdvanceUSD) || 0;
    const cashAdvanceResolvedARSFromUSD = cashAdvanceResolvedUSD * data.config.dollar_value;
    const cashAdvanceResolvedARSFromARS = Number(cashAdvanceARS) || 0;

    const contribTradeInARS = tradeInDiscountARS;
    const contribCashARS = cashAdvanceResolvedARSFromUSD + cashAdvanceResolvedARSFromARS;

    const missingBeforeCardARS = Math.max(0, totalPurchaseARS - contribTradeInARS - contribCashARS);
    const contribCardARS = selectedCard ? missingBeforeCardARS : 0;
    const remainingToCoverARS = Math.max(0, missingBeforeCardARS - contribCardARS);

    // Si se financia, hay que haber elegido también la cantidad de cuotas: sin eso el resumen y el
    // mensaje de WhatsApp saldrían con "null cuotas".
    const canCheckout = (totalPurchaseARS > 0) && (remainingToCoverARS === 0) && (contribCardARS === 0 || !!selectedInstallments);

    const financingPlan = useMemo(() => {
        if (!selectedCard || !selectedInstallments) return null;
        return data.plans.find(f => f.card_name === selectedCard && f.installments === selectedInstallments);
    }, [selectedCard, selectedInstallments, data.plans]);

    const cardConfig = useMemo(() => {
        if (!selectedCard) return null;
        return data.cards.find(c => c.card_name === selectedCard);
    }, [selectedCard, data.cards]);

    const finalFinancedTotalARS = useMemo(() => {
        if (!financingPlan || !cardConfig) return contribCardARS;
        return contribCardARS * cardConfig.base_factor * financingPlan.surcharge_coefficient;
    }, [contribCardARS, financingPlan, cardConfig]);

    const monthlyInstallmentARS = financingPlan ? finalFinancedTotalARS / financingPlan.installments : finalFinancedTotalARS;

    // Si una actualización de precios en segundo plano deja la cotización sin stock/sin datos válidos
    // mientras el modal está abierto, se cierra: si no, quedaría "abierto" pero invisible y trabaría
    // el scroll de la página. (Ajuste de estado durante el render, el patrón que React recomienda.)
    if (isModalOpen && !canCheckout) {
        setIsModalOpen(false);
        setPriceAlert('Los precios se actualizaron y tu cotización cambió. Revisala y volvé a finalizar.');
    }

    // --- HANDLERS ---
    const resetAll = () => {
        setCurrentStep(1);
        setSelectedModel(null);
        setSelectedCapacity(null);
        setSelectedBattery(null);
        setHasTradeIn(null);
        setTradeInModel(null);
        setTradeInCapacity(null);
        setTradeInBattery(null);
        setCashAdvanceUSD('');
        setCashAdvanceARS('');
        setSelectedCard(null);
        setSelectedInstallments(null);
        setIsModalOpen(false);
        setPriceAlert(null);
        setSummaryOpen(false);
    };

    // La tarjeta y las cuotas dependen del monto a financiar. Si el cliente vuelve y cambia algo que
    // altera ese monto (equipo, canje o efectivo), lo elegido antes deja de ser válido: se borra para
    // que lo vuelva a confirmar en el paso de cuotas, en vez de terminar financiando algo que no vio.
    const resetFinancing = () => {
        setSelectedCard(null);
        setSelectedInstallments(null);
    };

    const openQuoteModal = () => {
        setFallbackQuotedAt(nowArgentina());
        setPriceAlert(null);
        setIsModalOpen(true);
    };

    const handleNextStep = () => {
        if (canCheckout && (currentStep === 4 || currentStep === 5)) {
            openQuoteModal();
        } else if (currentStep === 2) {
            if (hasTradeIn) {
                setCurrentStep(3);
            } else {
                setCurrentStep(4);
            }
        } else if (currentStep < 5) {
            setCurrentStep(s => s + 1);
        }
    };

    const handlePrevStep = () => {
        if (currentStep === 4 && !hasTradeIn) {
            setCurrentStep(2);
        } else {
            setCurrentStep(prev => Math.max(1, prev - 1));
        }
    };

    // Datos de la cotización: los manda el servidor (hora argentina + código de versión de precios).
    const buildWhatsAppMessage = (m: PricesMeta | null): string => {
        const when = m?.quoted_at_ar ?? fallbackQuotedAt;
        const lines: string[] = [
            '¡Hola Apple Office! 👋 Hice una cotización en la web y quiero avanzar:',
            '',
            '📱 *NUEVO EQUIPO*',
            `${selectedModel} ${selectedCapacity}GB · Batería ${selectedBattery}`,
            `U$D ${fmtNum(subtotalIphoneUSD)} · AR$ ${fmtNum(subtotalIphoneARS)}`,
            ''
        ];

        if (contribTradeInARS > 0) {
            lines.push(
                '🔄 *ENTREGO EN CANJE*',
                `${tradeInModel} ${tradeInCapacity}GB · Batería ${tradeInBattery}`,
                `- U$D ${fmtNum(tradeInDiscountUSD)} · - AR$ ${fmtNum(contribTradeInARS)}`,
                ''
            );
        } else {
            lines.push('🔄 *CANJE:* no entrego equipo', '');
        }

        if (contribCashARS > 0) {
            lines.push('💵 *ENTREGO EN EFECTIVO / TRANSFERENCIA*', `- AR$ ${fmtNum(contribCashARS)}`, '');
        }

        if (contribCardARS > 0) {
            lines.push(
                '💳 *FINANCIO EL RESTO*',
                `${selectedInstallments} cuotas de AR$ ${fmtNum(monthlyInstallmentARS)} con ${selectedCard}`,
                `Total financiado: AR$ ${fmtNum(finalFinancedTotalARS)}`,
                ''
            );
        } else {
            lines.push('💳 *TOTAL CUBIERTO* (sin financiación)', '');
        }

        lines.push(
            '──────────────',
            `Cotizado: ${when} hs`,
            '',
            '¿Me confirmás disponibilidad y los pasos a seguir? ¡Gracias!'
        );
        return lines.join('\n');
    };

    // Antes de mandar al cliente a WhatsApp se vuelven a pedir los precios: si cambiaron mientras
    // tenía la pestaña abierta, se le avisa y se recalcula en vez de enviar un presupuesto viejo.
    const handleWhatsApp = async () => {
        if (checkingPrices) return;

        // En compu abrimos la pestaña YA (dentro del gesto del click) para que el navegador no la
        // bloquee, y recién después de verificar le ponemos la dirección. En celular se navega en la
        // misma pestaña: WhatsApp abre su app y al volver los precios se revalidan solos.
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const popup = isTouch ? null : window.open('', '_blank');
        if (popup) popup.opener = null;

        setCheckingPrices(true);
        setPriceAlert(null);
        const fresh = await ensureFresh();
        setCheckingPrices(false);

        if (!fresh.offline) {
            const stillAvailable = fresh.data.iphoneStock.some(s =>
                s.model === selectedModel && s.capacity_gb === selectedCapacity && s.battery_status === selectedBattery
            );
            if (!stillAvailable) {
                popup?.close();
                setIsModalOpen(false);
                setCurrentStep(1);
                setSelectedBattery(null);
                setPriceAlert('Ese equipo ya no está disponible con esas características. Elegí otra configuración, por favor.');
                return;
            }
            if (fresh.changed) {
                popup?.close();
                setPriceAlert('Los precios se actualizaron hace un momento. Recalculamos tu cotización con los valores de hoy: revisala y volvé a tocar el botón.');
                return;
            }
        }
        // Sin conexión: no se bloquea el botón principal del negocio; el mensaje lleva la hora en que
        // se obtuvieron los precios, así el vendedor sabe de cuándo es.

        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage(fresh.meta ?? meta))}`;
        if (popup) {
            popup.location.href = url;
        } else {
            window.location.href = url;
        }
    };

    const TITLES = [
        "Equipo",
        "¿Canje?",
        "Detalle",
        "Efectivo",
        "Cuotas"
    ];

    // --- RESUMEN (se usa en la columna de escritorio y en la barra inferior de mobile) ---
    const isCovered = remainingToCoverARS === 0 && totalPurchaseARS > 0;
    const hasContributions = contribTradeInARS > 0 || contribCashARS > 0 || contribCardARS > 0;

    let barLabel = 'Tu resumen';
    let barValue = 'Elegí tu equipo';
    if (contribCardARS > 0 && selectedCard && selectedInstallments) {
        barLabel = `Tu cuota · ${selectedCard}`;
        barValue = `${selectedInstallments}x AR$ ${fmtNum(monthlyInstallmentARS)}`;
    } else if (totalPurchaseARS > 0 && !hasContributions) {
        barLabel = 'Precio del equipo';
        barValue = `AR$ ${fmtNum(totalPurchaseARS)}`;
    } else if (totalPurchaseARS > 0) {
        barLabel = isCovered ? '¡Monto cubierto!' : 'Restante';
        barValue = `AR$ ${fmtNum(remainingToCoverARS)}`;
    }

    const summaryCard = (
        <div className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-gray-100">
            <h3 className="text-xl font-black mb-6 lg:mb-8 text-gray-900 border-b border-gray-50 pb-4 flex justify-between">Tu Resumen {canCheckout && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">OK</span>}</h3>
            <div className="flex flex-col gap-5 lg:gap-6">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col"><span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Nuevo iPhone</span><span className="font-extrabold">{selectedModel || '---'} {selectedCapacity ? `${selectedCapacity}GB` : ''}</span></div>
                    <span className="font-extrabold text-gray-900 whitespace-nowrap">AR$ {fmtNum(subtotalIphoneARS)}</span>
                </div>
                {hasContributions && (
                    <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-3">
                        {contribTradeInARS > 0 && <div className="flex justify-between text-emerald-600 font-bold text-xs"><span>Canje ({tradeInModel})</span><span>- AR$ {fmtNum(contribTradeInARS)}</span></div>}
                        {contribCashARS > 0 && <div className="flex justify-between text-emerald-600 font-bold text-xs"><span>Efectivo/Pago Inic.</span><span>- AR$ {fmtNum(contribCashARS)}</span></div>}
                        {contribCardARS > 0 && <div className="flex justify-between text-gray-900 font-bold text-xs"><span>A Financiar</span><span>- AR$ {fmtNum(contribCardARS)}</span></div>}
                    </div>
                )}
                <div className={`p-5 lg:p-6 rounded-3xl border-4 flex justify-between items-center transition-all ${isCovered ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}>
                    <span className="font-black text-xs uppercase text-gray-500">Restante</span>
                    <span className={`font-black text-2xl ${isCovered ? 'text-emerald-500' : 'text-red-500'}`}>AR$ {fmtNum(remainingToCoverARS)}</span>
                </div>
                {contribCardARS > 0 && selectedCard && selectedInstallments && (
                    <div className="p-5 lg:p-6 bg-black rounded-[2rem] text-white shadow-xl">
                        <div className="text-[10px] font-black text-gray-500 mb-4 uppercase">Cuotas con {selectedCard}</div>
                        <div className="text-2xl font-black text-emerald-400">{selectedInstallments}x AR$ {fmtNum(monthlyInstallmentARS)}</div>
                        <div className="mt-4 pt-4 border-t border-gray-800 text-[10px] text-gray-400 font-bold uppercase">Total financiado: AR$ {fmtNum(finalFinancedTotalARS)}</div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div ref={rootRef} className="max-w-7xl mx-auto px-4 pt-8 pb-28 lg:pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">

            {/* Columna Izquierda: Flujo de Pasos */}
            <div className="lg:col-span-8 flex flex-col h-full relative">

                {/* Aviso si cambió el precio / dejó de haber stock mientras se cotizaba */}
                {priceAlert && !isModalOpen && (
                    <div role="alert" className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold px-4 py-3 rounded-2xl">
                        {priceAlert}
                    </div>
                )}

                {/* Indicadores de Progreso */}
                <p className="sm:hidden text-xs font-bold text-gray-500 mb-3">
                    Paso {currentStep} de 5 · <span className="text-black">{TITLES[currentStep - 1]}</span>
                </p>
                <div className="flex items-center justify-between mb-4 sm:mb-8 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full hidden sm:block"></div>

                    {TITLES.map((title, idx) => {
                        const stepNum = idx + 1;
                        const isPast = stepNum < currentStep;
                        const isActive = stepNum === currentStep;
                        const isSkipped = !hasTradeIn && stepNum === 3;

                        return (
                            <div key={title} className={`flex flex-col items-center gap-2 group relative z-0 cursor-default ${isSkipped ? 'opacity-30' : ''}`}>
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-[#fbfbfd] ${isActive ? 'bg-emerald-500 text-black shadow-lg scale-110' : isPast ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {isPast ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : stepNum}
                                </div>
                                <span className={`hidden sm:block text-xs font-bold text-center transition-all absolute -bottom-6 w-max ${isActive ? 'text-black' : isPast ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {title}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Contenedor del Paso Activo */}
                <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:min-h-[500px] flex flex-col border border-gray-50 mt-4">

                    {currentStep === 1 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 sm:mb-8 flex items-center gap-3">
                                <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500 shrink-0" />
                                Configurá tu nuevo iPhone
                            </h2>

                            {!loaded && (
                                <div role="status" className="mb-6 bg-gray-50 border border-gray-100 text-gray-500 text-sm font-semibold px-4 py-3 rounded-2xl flex items-center justify-between gap-3">
                                    <span>{error ? 'No pudimos cargar los precios. Revisá tu conexión.' : 'Cargando precios…'}</span>
                                    {error && <button onClick={() => refreshData()} className="text-emerald-600 font-black underline underline-offset-2 shrink-0">Reintentar</button>}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Modelo</label>
                                    <select
                                        value={selectedModel || ''}
                                        onChange={(e) => {
                                            setSelectedModel(e.target.value);
                                            resetFinancing();
                                            setSelectedCapacity(null);
                                            setSelectedBattery(null);
                                        }}
                                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 font-bold bg-white text-gray-900 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="" disabled>Seleccioná modelo</option>
                                        {data.models.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Capacidad</label>
                                    <select
                                        value={selectedCapacity === null ? '' : selectedCapacity}
                                        onChange={(e) => {
                                            setSelectedCapacity(Number(e.target.value));
                                            resetFinancing();
                                            setSelectedBattery(null);
                                        }}
                                        disabled={!selectedModel}
                                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 font-bold bg-white text-gray-900 focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>Seleccioná capacidad</option>
                                        {availableCapacities.map(c => <option key={c} value={c}>{c} GB</option>)}
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs md:text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Estado Batería</label>
                                    <select
                                        value={selectedBattery || ''}
                                        onChange={(e) => { setSelectedBattery(e.target.value); resetFinancing(); }}
                                        disabled={!selectedCapacity}
                                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 font-bold bg-white text-gray-900 focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>Seleccioná rango de batería</option>
                                        {availableBatteries.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                {selectedModel && selectedCapacity && selectedBattery ? (
                                    matchedIphone ? (
                                        <div className="flex justify-between items-center gap-3 bg-emerald-50 p-4 sm:p-6 rounded-2xl border border-emerald-100">
                                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                <div className="bg-white p-3 rounded-xl shadow-sm shrink-0"><Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500" /></div>
                                                <div className="min-w-0">
                                                    <h4 className="font-extrabold text-emerald-900 text-base sm:text-lg">Inversión del equipo</h4>
                                                    <p className="text-emerald-700 font-medium mt-1 text-sm sm:text-base">{matchedIphone.model} {matchedIphone.capacity_gb}GB</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-extrabold text-xl sm:text-2xl text-emerald-600">U$D {matchedIphone.price_usd}</p>
                                                <p className="text-sm font-bold text-emerald-800 opacity-70 mt-1">AR$ {fmtNum(matchedIphone.price_usd * data.config.dollar_value)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-600 font-semibold text-center">
                                            Lo sentimos. Esta combinación no está disponible en stock actualmente.
                                        </div>
                                    )
                                ) : (
                                    <div className="text-gray-400 font-medium text-center bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-100">
                                        Seleccioná modelo, capacidad y batería para ver el valor...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col items-center justify-center text-center py-6 sm:py-10">
                            <div className="bg-emerald-50 p-5 sm:p-6 rounded-full mb-6 sm:mb-8"><HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 text-emerald-500" /></div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">¿Tenés un iPhone para entregar?</h2>
                            <p className="text-gray-500 font-medium mb-8 sm:mb-12 max-w-md">Tomamos tu equipo actual como parte de pago para que te lleves el nuevo.</p>

                            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 sm:gap-6 w-full max-w-lg">
                                <button
                                    onClick={() => { if (hasTradeIn !== true) resetFinancing(); setHasTradeIn(true); setCurrentStep(3); }}
                                    className={`py-5 sm:py-6 rounded-3xl font-black text-lg sm:text-xl transition-all border-4 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 active:border-emerald-500 active:bg-emerald-50 ${hasTradeIn === true ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white'}`}
                                >
                                    SÍ, TENGO
                                </button>
                                <button
                                    onClick={() => { if (hasTradeIn !== false) resetFinancing(); setHasTradeIn(false); setCurrentStep(4); }}
                                    className={`py-5 sm:py-6 rounded-3xl font-black text-lg sm:text-xl transition-all border-4 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 active:border-emerald-500 active:bg-emerald-50 ${hasTradeIn === false ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 bg-white'}`}
                                >
                                    NO, SOLO COMPRA
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Detalles de tu Canje</h2>
                            <p className="text-gray-500 font-medium mb-6 sm:mb-8">Configurá el equipo que entregás para calcular su valor de toma.</p>

                            <div className="bg-gray-50 p-5 md:p-8 rounded-3xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Modelo</label>
                                    <select
                                        className="w-full border-gray-200 rounded-xl px-4 py-4 font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={tradeInModel || ""}
                                        onChange={e => { setTradeInModel(e.target.value); setTradeInCapacity(null); setTradeInBattery(null); resetFinancing(); }}
                                    >
                                        <option value="" disabled>Seleccioná modelo</option>
                                        {data.models.filter(m => data.tradeInPrices.some(b => b.model === m)).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Capacidad</label>
                                    <select
                                        className="w-full border-gray-200 rounded-xl px-4 py-4 font-semibold text-gray-800 bg-white disabled:opacity-50"
                                        value={tradeInCapacity || ""}
                                        onChange={e => { setTradeInCapacity(Number(e.target.value)); setTradeInBattery(null); resetFinancing(); }}
                                        disabled={!tradeInModel}
                                    >
                                        <option value="">--</option>
                                        {data.tradeInPrices.filter(b => b.model === tradeInModel).map(b => b.capacity_gb).filter((v, i, a) => a.indexOf(v) === i).map(c => <option key={c} value={c}>{c} GB</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Batería</label>
                                    <select
                                        className="w-full border-gray-200 rounded-xl px-4 py-4 font-semibold text-gray-800 bg-white disabled:opacity-50"
                                        value={tradeInBattery || ""}
                                        onChange={e => { setTradeInBattery(e.target.value); resetFinancing(); }}
                                        disabled={!tradeInCapacity}
                                    >
                                        <option value="">--</option>
                                        {data.tradeInPrices.filter(b => b.model === tradeInModel && b.capacity_gb === tradeInCapacity).map(b => b.battery_range).filter((v, i, a) => a.indexOf(v) === i).map(br => <option key={br} value={br}>{br}</option>)}
                                    </select>
                                </div>
                            </div>
                            {tradeInDiscountARS > 0 && (
                                <div className="mt-8 sm:mt-10 bg-emerald-50 text-emerald-900 p-5 sm:p-8 rounded-3xl border-2 border-emerald-500 flex items-center justify-between gap-3 shadow-xl">
                                    <div>
                                        <span className="font-bold text-base sm:text-lg">Te lo tomamos en:</span><br />
                                        <span className="text-xs sm:text-sm font-bold text-emerald-600 opacity-80 mt-1 block tracking-wider uppercase">U$D {tradeInDiscountUSD} COTIZADO</span>
                                    </div>
                                    <span className="font-black text-2xl sm:text-3xl whitespace-nowrap">AR$ {fmtNum(tradeInDiscountARS)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Efectivo / Transferencia</h2>
                            <p className="text-gray-500 font-medium mb-6 sm:mb-8">Ingresá si vas a realizar un pago inicial para reducir las cuotas.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 bg-gray-50 p-5 md:p-8 rounded-3xl border border-gray-100">
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Entrego en Dólares</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        onWheel={e => e.currentTarget.blur()}
                                        className="w-full px-5 py-4 border-gray-200 rounded-2xl text-xl font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="U$D 0"
                                        value={cashAdvanceUSD}
                                        onChange={e => { setCashAdvanceUSD(e.target.value === '' ? '' : Number(e.target.value)); resetFinancing(); }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Entrego en Pesos</label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        onWheel={e => e.currentTarget.blur()}
                                        className="w-full px-5 py-4 border-gray-200 rounded-2xl text-xl font-bold bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="AR$ 0"
                                        value={cashAdvanceARS}
                                        onChange={e => { setCashAdvanceARS(e.target.value === '' ? '' : Number(e.target.value)); resetFinancing(); }}
                                    />
                                </div>
                            </div>
                            {contribCashARS > 0 && (
                                <div className="mt-6 sm:mt-8 flex justify-between items-center gap-3 text-emerald-800 font-black p-5 sm:p-6 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                                    <span>Total aportado ahora:</span>
                                    <span className="text-xl sm:text-2xl whitespace-nowrap">AR$ {fmtNum(contribCashARS)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3"><Calculator className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-500 shrink-0" /> Saldo con Tarjeta</h2>
                            <p className="text-gray-500 font-medium mb-6 sm:mb-8">Si queda un resto pendiente, podés financiarlo acá.</p>
                            {missingBeforeCardARS === 0 ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-500 mb-4" />
                                    <h3 className="text-xl font-bold text-emerald-900 mb-2">¡Monto Cubierto!</h3>
                                    <p className="text-emerald-700 font-medium">No necesitás tarjeta para completar el pago de este equipo.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Elegí tu Tarjeta</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {data.cards.map(c => (
                                                <button key={c.card_name} onClick={() => { setSelectedCard(selectedCard === c.card_name ? null : c.card_name); setSelectedInstallments(null); }} className={`px-6 py-4 rounded-2xl border-4 text-left font-black transition-all ${selectedCard === c.card_name ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}>{c.card_name}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Planes de Cuotas</label>
                                        {selectedCard ? (
                                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                {data.plans.filter(f => f.card_name === selectedCard).map(f => (
                                                    <button key={f.id} onClick={() => setSelectedInstallments(f.installments)} className={`px-4 py-4 sm:py-5 rounded-2xl border-4 text-center font-black transition-all flex flex-col items-center justify-center ${selectedInstallments === f.installments ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                                                        <span className="text-3xl">{f.installments}</span><span className="text-xs font-bold uppercase text-emerald-600/70 mt-1">Cuotas</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : <div className="text-sm font-medium text-gray-400 bg-gray-50 rounded-2xl p-6 sm:p-8 border-2 border-dashed border-gray-200 h-full flex items-center justify-center text-center">Elegí un banco para ver los planes.</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navegación Inferior */}
                    <div className="mt-8 sm:mt-12 pt-6 border-t border-gray-100 flex justify-between items-center z-10 w-full">
                        <button onClick={handlePrevStep} className={`px-6 py-4 font-bold rounded-xl text-gray-500 hover:bg-gray-100 transition-colors ${currentStep === 1 ? 'invisible' : ''}`}>Volver</button>
                        <button
                            onClick={handleNextStep}
                            disabled={(currentStep === 1 && !matchedIphone) || (currentStep === 3 && !tradeInBattery) || (currentStep === 5 && !canCheckout)}
                            className={`px-8 py-4 rounded-xl font-black transition-all flex items-center gap-2 ${(currentStep === 2) ? 'hidden' : ((currentStep === 1 && !matchedIphone) || (currentStep === 5 && !canCheckout) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg')}`}
                        >
                            {currentStep >= 4 && canCheckout ? 'Finalizar' : 'Siguiente'}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Columna Derecha: Resumen Flotante (escritorio) */}
            <div className="hidden lg:block lg:col-span-4 sticky top-24">
                {summaryCard}
            </div>

            {/* Resumen fijo inferior (mobile): el cliente ve el precio mientras configura */}
            {inView && !isModalOpen && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
                    {summaryOpen && (
                        <div className="max-h-[55dvh] overflow-y-auto px-4 pt-4 pb-2 border-b border-gray-100">
                            {summaryCard}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setSummaryOpen(v => !v)}
                        aria-expanded={summaryOpen}
                        className="w-full pl-4 pr-24 py-3 flex items-center justify-between gap-3 text-left"
                    >
                        <span className="min-w-0">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">{barLabel}</span>
                            <span className={`block font-black text-xl leading-tight truncate ${isCovered && !hasContributions ? 'text-gray-900' : isCovered ? 'text-emerald-500' : 'text-gray-900'}`}>{barValue}</span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-gray-500">
                            {summaryOpen ? 'Cerrar' : 'Ver detalle'}
                            <ChevronUp className={`w-4 h-4 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
                        </span>
                    </button>
                </div>
            )}

            {/* MODAL DE ÉXITO */}
            {isModalOpen && canCheckout && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xl">
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] max-w-md w-full max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-white/20">
                        <div className="overflow-y-auto px-5 pt-7 pb-4 sm:p-10 custom-scrollbar flex-1 min-h-0">
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-8 shadow-lg"><CheckCircle2 className="w-9 h-9 sm:w-12 sm:h-12" /></div>
                            <h2 className="text-2xl sm:text-3xl font-black text-center mb-5 sm:mb-10 text-gray-900">¡Cotización Lista!</h2>
                            <div className="bg-gray-50 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col gap-5 mb-6">
                                {/* NUEVO EQUIPO */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nuevo Equipo</span>
                                    <div className="flex justify-between items-center gap-3 text-gray-900">
                                        <span className="font-extrabold text-base sm:text-lg">{selectedModel} {selectedCapacity}GB</span>
                                        <span className="font-black whitespace-nowrap">AR$ {fmtNum(subtotalIphoneARS)}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">Bateria {selectedBattery}</span>
                                </div>

                                <div className="h-px bg-gray-200"></div>

                                {/* CANJE (Si existe) */}
                                {contribTradeInARS > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entregás (Canje)</span>
                                        <div className="flex justify-between items-center gap-3 text-gray-600 font-bold">
                                            <span>{tradeInModel} {tradeInCapacity}GB</span>
                                            <span className="whitespace-nowrap">- AR$ {fmtNum(contribTradeInARS)}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">Bateria {tradeInBattery}</span>
                                    </div>
                                )}

                                {/* PAGOS */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-gray-300">
                                    {contribCashARS > 0 && (
                                        <div className="flex justify-between gap-3 text-sm font-bold text-gray-600 italic">
                                            <span>Entrega en Efectivo</span>
                                            <span className="whitespace-nowrap">- AR$ {fmtNum(contribCashARS)}</span>
                                        </div>
                                    )}
                                    {contribCardARS > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between gap-3 text-sm font-black text-emerald-600">
                                                <span>Financiado con {selectedCard}</span>
                                                <span className="whitespace-nowrap">{selectedInstallments}x AR$ {fmtNum(monthlyInstallmentARS)}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-400 text-right uppercase">Total financiado: AR$ {fmtNum(finalFinancedTotalARS)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* GIFT SECTION */}
                            <div className="animate-bounce-subtle">
                                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-[2px] rounded-3xl shadow-lg shadow-emerald-500/20">
                                    <div className="bg-white rounded-[calc(1.5rem-2px)] p-5 sm:p-6 text-center">
                                        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-600 rounded-full mb-3 sm:mb-4">
                                            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-tight tracking-tight">¡TENEMOS UN REGALO PARA VOS!</h3>
                                        <p className="text-gray-600 font-bold text-sm leading-relaxed px-2">
                                            Con tu compra, te regalamos {hasTradeIn ? '' : <span className="text-emerald-600">Cargador, </span>}
                                            cable, funda y film blindado!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WHATSAPP CTA: fuera del área con scroll, siempre a la vista */}
                        <div className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 sm:px-6 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-1">
                            {priceAlert && (
                                <div role="alert" className="mb-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold px-3 py-2.5 rounded-2xl">
                                    {priceAlert}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleWhatsApp}
                                disabled={checkingPrices}
                                className="w-full bg-[#25D366] text-white font-black text-lg sm:text-xl py-4 sm:py-5 rounded-[1.5rem] hover:bg-[#128C7E] active:scale-95 shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                            >
                                <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-8 sm:h-8 fill-current shrink-0">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                {checkingPrices ? 'Verificando precios…' : 'Continuar por WhatsApp'}
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setPriceAlert(null); }}
                                    className="text-gray-600 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-100 transition-all"
                                >
                                    ← Modificar
                                </button>
                                <button onClick={resetAll} className="text-gray-400 font-bold text-sm py-2.5 rounded-xl hover:bg-gray-100 hover:text-black transition-all">Hacer otra cotización</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
