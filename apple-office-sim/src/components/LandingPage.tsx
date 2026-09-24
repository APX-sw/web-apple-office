import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import SimulationPanel from './SimulationPanel';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Package, ShieldCheck, RefreshCw, MessageCircleHeart, MapPin, Clock, ArrowRight, Menu, X, Settings, Smartphone, Watch, Camera, HelpCircle } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
    Package: <Package />,
    ShieldCheck: <ShieldCheck />,
    RefreshCw: <RefreshCw />,
    MessageCircleHeart: <MessageCircleHeart />,
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Fondo del hero. La imagen fija SIEMPRE está: es lo que se ve al instante (adiós pantalla negra).
 * El video solo se monta en pantallas grandes: en el celular nunca se descarga, así el cliente que
 * llega desde un link de WhatsApp no gasta datos ni espera. Se renderiza condicionalmente (no se
 * oculta con CSS) porque un <video> oculto igual descarga su archivo.
 */
function HeroBackground() {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const playVideo = isDesktop && !reduceMotion && !saveData;
    const [videoReady, setVideoReady] = useState(false);

    return (
        <>
            <img
                src="/hero-poster.jpg"
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            {playVideo && (
                <video
                    src="/video-apple-office.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    aria-hidden="true"
                    onCanPlay={() => setVideoReady(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoReady ? 'opacity-60' : 'opacity-0'}`}
                />
            )}
        </>
    );
}

export default function LandingPage({ setView }: { setView: (v: 'simulation' | 'admin') => void }) {
    const { data } = useData();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useBodyScrollLock(mobileMenuOpen);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollTo = (id: string) => {
        setMobileMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="w-full bg-[#fbfbfd]">
            {/* STICKY NAV */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ease-in-out ${scrolled ? 'md:pt-4 md:px-4' : 'pt-4 px-4 md:pt-6'}`}>
                <div className={`mx-auto max-w-7xl transition-all duration-500 ease-in-out flex items-center justify-between ${scrolled ? 'bg-black/80 backdrop-blur-2xl md:border border-b sm:border-transparent border-white/10 md:rounded-[2rem] shadow-2xl py-3 px-5 md:px-10' : 'bg-transparent py-2 px-2 md:px-0'}`}>

                    {/* Logo Area */}
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <img src="/logo.png" alt="Apple Office" className="h-10 md:h-11 object-contain group-hover:opacity-80 transition-opacity drop-shadow-md brightness-0 invert" />
                    </div>

                    {/* Desktop Links */}
                    <div className={`hidden md:flex items-center gap-6 font-semibold text-sm ${scrolled ? 'text-gray-200' : 'text-gray-300'}`}>
                        <button onClick={() => scrollTo('propuesta')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Nuestra Garantía</button>
                        <button onClick={() => scrollTo('iphones')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> Iphones</button>
                        <button onClick={() => scrollTo('accesorios')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><Watch className="w-4 h-4" /> Accesorios</button>
                        <button onClick={() => scrollTo('simulador')} className="hover:text-emerald-300 hover:bg-emerald-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20"><RefreshCw className="w-4 h-4" /> Cotizá Seguro</button>
                        <button onClick={() => scrollTo('comunidad')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><MessageCircleHeart className="w-4 h-4" /> Clientes Felices</button>
                        <button onClick={() => scrollTo('local')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><Camera className="w-4 h-4" /> Nuestro Local</button>
                        <button onClick={() => scrollTo('ubicacion')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Visítanos</button>
                        <button onClick={() => scrollTo('faq')} className="hover:text-emerald-400 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> Preguntas</button>


                        <div className="w-px h-5 bg-gray-700 mx-1"></div>
                        <button onClick={() => setView('admin')} className="p-2 rounded-full bg-white/5 hover:bg-emerald-500 hover:text-black text-gray-400 transition-all" title="Configuración">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile Toggle */}
                    <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                // pt-24 deja libre la barra superior (que queda encima, z-50); overflow-y-auto porque en pantallas
                // bajas la lista no entra completa.
                <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl text-white z-40 px-8 pb-8 pt-24 overflow-y-auto overscroll-contain flex flex-col gap-1 font-bold text-xl md:hidden shadow-xl animate-in fade-in slide-in-from-top-10">
                    <button onClick={() => { scrollTo('propuesta'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><ShieldCheck className="text-emerald-500" /> Nuestra Garantía</button>
                    <button onClick={() => { scrollTo('iphones'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><Smartphone className="text-emerald-500" /> Iphones</button>
                    <button onClick={() => { scrollTo('accesorios'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><Watch className="text-emerald-500" /> Accesorios</button>
                    <button onClick={() => { scrollTo('simulador'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><RefreshCw className="text-emerald-500" /> Cotizá Seguro</button>
                    <button onClick={() => { scrollTo('comunidad'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><MessageCircleHeart className="text-emerald-500" /> Clientes Felices</button>
                    <button onClick={() => { scrollTo('local'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><Camera className="text-emerald-500" /> Nuestro Local</button>
                    <button onClick={() => { scrollTo('ubicacion'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><MapPin className="text-emerald-500" /> Visítanos</button>
                    <button onClick={() => { scrollTo('faq'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 border-b border-gray-800 hover:text-emerald-400"><HelpCircle className="text-emerald-500" /> Preguntas Frecuentes</button>

                    <button onClick={() => { setView('admin'); setMobileMenuOpen(false); }} className="flex items-center gap-3 text-left py-4 text-gray-400 mt-auto"><Settings className="w-5 h-5" /> Panel Admin</button>
                </div>
            )}

            {/* HERO SECTION */}
            <section className="relative w-full min-h-screen supports-[height:100svh]:min-h-[100svh] flex flex-col items-center justify-center pt-20 bg-black text-white px-4 border-b border-gray-900 border-opacity-50 overflow-hidden">
                {/* Botanical highlight */}
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-800/20 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse" style={{ animationDuration: '4s' }}></div>

                {/* Video Background */}
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
                    <HeroBackground />
                    {/* Gradients to ensure text readability and blend with the black theme */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_black_100%)] opacity-90 pointer-events-none"></div>
                </div>

                {/* Text Content */}
                <div className="z-10 flex flex-col items-center justify-center text-center w-full max-w-6xl relative mt-4">
                    <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tight leading-tight mb-6 drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                        iPhones nuevos<br /><span className="text-emerald-500">y usados premium.</span>
                    </h1>
                    <p className="text-gray-200 font-medium text-xl md:text-2xl max-w-2xl mx-auto mb-10 drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
                        Garantía oficial y atención premium.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-6 z-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700 fill-mode-both">
                        <button
                            onClick={() => scrollTo('simulador')}
                            className="bg-emerald-500 hover:bg-emerald-400 text-black px-10 py-5 rounded-full font-bold text-xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)] w-full sm:w-auto pointer-events-auto"
                        >
                            Cotizá tu equipo
                        </button>
                        <button
                            onClick={() => scrollTo('propuesta')}
                            className="bg-white hover:bg-gray-100 text-black px-10 py-5 rounded-full font-bold text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl w-full sm:w-auto pointer-events-auto"
                        >
                            Ver propuesta <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </section>

            {/* PROPOSAL */}
            <section id="propuesta" className="py-16 md:py-20 px-4 bg-white relative overflow-hidden">
                <div className="max-w-6xl mx-auto relative z-10">
                    <RevealOnScroll>
                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">¿Por qué Apple Office?</h2>
                            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Más que una tienda, un espacio diseñado para tu tranquilidad. Descubrí nuestro entorno lleno de vida.</p>
                        </div>
                    </RevealOnScroll>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {data.feature_cards.map((card, i) => (
                            <RevealOnScroll key={i} delay={i * 200}>
                                <FeatureCard
                                    icon={ICON_MAP[card.icon] ?? <Package />}
                                    title={card.title}
                                    desc={card.desc}
                                />
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </section>

            {/* IPHONE SHOWCASE (NEW) */}
            <section id="iphones" className="py-16 md:py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4">
                    <RevealOnScroll>
                        <div className="mb-16">
                            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">Modelos de iPhone disponibles</h2>
                            <p className="text-xl text-gray-500 max-w-2xl">Elegí el que mejor se adapte a vos. Todos con garantía y el respaldo de Apple Office.</p>
                        </div>
                    </RevealOnScroll>

                    <div className="relative group">
                        <div className="flex gap-6 overflow-x-auto pb-12 snap-x no-scrollbar -mx-4 px-4 scroll-smooth">
                            {(data.landingIphones ?? []).map((iphone, i) => (
                                <div key={iphone.id} className="min-w-[78vw] sm:min-w-[320px] md:min-w-[420px] snap-start h-full pb-4">
                                    <RevealOnScroll delay={i * 100} className="h-full">
                                        <div className="bg-[#f5f5f7] rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center text-center group/card transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] h-full">
                                            <div className="h-[250px] md:h-[320px] mb-8 relative flex items-center justify-center w-full mt-4">
                                                <img 
                                                    src={`${BASE_URL}${iphone.image_url}`} 
                                                    alt={iphone.name} 
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="max-w-full max-h-full object-contain group-hover/card:scale-110 transition-transform duration-700"
                                                />
                                            </div>
                                            <h3 className="text-3xl font-bold text-gray-900 mb-2">{iphone.name}</h3>
                                            <p className="text-gray-600 font-medium text-lg mb-8">{iphone.price_string}</p>
                                            <button 
                                                onClick={() => scrollTo('simulador')}
                                                className="mt-auto bg-[#0071e3] hover:bg-[#0077ed] text-white px-8 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                                            >
                                                Cotizar ahora
                                            </button>
                                        </div>
                                    </RevealOnScroll>
                                </div>
                            ))}
                            {(data.landingIphones ?? []).length === 0 && (
                                <div className="w-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-[3rem]">
                                    Próximamente más modelos disponibles.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ACCESSORIES SHOWCASE (NEW) */}
            <section id="accesorios" className="py-16 md:py-24 bg-[#fbfbfd] overflow-hidden">
                <div className="max-w-7xl mx-auto px-4">
                    <RevealOnScroll>
                        <div className="mb-16">
                            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-4">Accesorios</h2>
                            <p className="text-xl text-gray-500 max-w-2xl">Complementá tu equipo con accesorios de la máxima calidad y protección.</p>
                        </div>
                    </RevealOnScroll>

                    <div className="relative group">
                        <div className="flex gap-6 overflow-x-auto pb-12 snap-x no-scrollbar -mx-4 px-4 scroll-smooth">
                            {(data.landingAccessories ?? []).map((accessory, i) => (
                                <div key={accessory.id} className="min-w-[78vw] sm:min-w-[320px] md:min-w-[420px] snap-start h-full pb-4">
                                    <RevealOnScroll delay={i * 100} className="h-full">
                                        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center text-center group/card transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] h-full border border-gray-100">
                                            <div className="h-[250px] md:h-[320px] mb-8 relative flex items-center justify-center w-full mt-4">
                                                <img 
                                                    src={`${BASE_URL}${accessory.image_url}`} 
                                                    alt={accessory.name} 
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="max-w-full max-h-full object-contain group-hover/card:scale-110 transition-transform duration-700 mix-blend-multiply"
                                                />
                                            </div>
                                            <h3 className="text-3xl font-bold text-gray-900 mb-2">{accessory.name}</h3>
                                            <p className="text-gray-600 font-medium text-lg mb-8">{accessory.price_string}</p>
                                            <a 
                                                href="https://wa.me/5493855953712"
                                                target="_blank" rel="noreferrer"
                                                className="mt-auto bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg shadow-black/10"
                                            >
                                                Consultar stock
                                            </a>
                                        </div>
                                    </RevealOnScroll>
                                </div>
                            ))}
                            {(data.landingAccessories ?? []).length === 0 && (
                                <div className="w-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[3rem]">
                                    Próximamente catálogo de accesorios.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* SIMULATOR */}
            <section id="simulador" className="py-16 md:py-20 px-4 bg-gradient-to-b from-[#f2f2f7] to-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">Cotizador Interactivo</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">Configurá el iPhone de tus sueños, sumá tu equipo usado y armá tu plan de pagos al instante.</p>
                    </div>

                    <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden md:p-6 p-2">
                        {/* Simulation Embedded Widget */}
                        <SimulationPanel />
                    </div>
                </div>
            </section>

            {/* COMMUNITY MOSAIC */}
            <section id="comunidad" className="py-16 md:py-20 px-4 bg-[#f2f2f7]">
                <div className="max-w-7xl mx-auto">
                    <RevealOnScroll>
                        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
                            <div className="max-w-2xl">
                                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">La Familia Office</h2>
                                <p className="text-xl text-gray-500">Cientos de sonrisas y actualizaciones de equipos nos respaldan. Somos la confianza del norte argentino.</p>
                            </div>
                            <a href="https://www.instagram.com/appleoffice.sgo/" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold hover:underline flex items-center gap-2">
                                Ver más en Instagram <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll>
                        <div className="flex overflow-hidden relative w-full group -mx-4 px-4 pb-16">
                            {/* Wrapper for smooth infinitely scrolling items */}
                            <div className="flex animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap min-w-max pr-3 md:pr-6 gap-3 md:gap-6">
                                {(() => {
                                    const items = data.gallery && data.gallery.length > 0
                                        ? (data.gallery.length < 5 ? [...data.gallery, ...data.gallery, ...data.gallery] : data.gallery)
                                        : [1, 2, 3, 4, 5, 6];

                                    return items.map((g, i) => {
                                        const isDummy = typeof g === 'number';
                                        const imageUrl = isDummy
                                            ? `https://images.unsplash.com/photo-1512404514574-8b63adce7499?q=80&w=400&auto=format&fit=crop&sig=${g + 10}`
                                            : `${BASE_URL}${g.image_url}`;
                                        const description = isDummy ? undefined : g.description;

                                        return (
                                            <div key={isDummy ? `dummy-${g}-${i}` : `gal-${g.id}-${i}`} className="w-[60vw] md:w-[22vw] flex-shrink-0 whitespace-normal">
                                                <div className={`rounded-[2.5rem] overflow-hidden shadow-xl bg-black relative aspect-[3/4] group/card w-full h-full`}>
                                                    <img
                                                        src={imageUrl}
                                                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 opacity-90 group-hover/card:opacity-100"
                                                        alt={description || "Cliente Apple Office"}
                                                        draggable={false}
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    {description && (
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6 md:p-8 md:translate-y-4 md:group-hover/card:translate-y-0 md:opacity-0 md:group-hover/card:opacity-100 transition-all duration-300 pointer-events-none h-1/2">
                                                            <p className="text-white font-bold text-sm md:text-lg leading-snug">
                                                                {description}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                            {/* Duplicate for infinite effect */}
                            <div className="flex animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap min-w-max pr-3 md:pr-6 gap-3 md:gap-6" aria-hidden="true">
                                {(() => {
                                    const items = data.gallery && data.gallery.length > 0
                                        ? (data.gallery.length < 5 ? [...data.gallery, ...data.gallery, ...data.gallery] : data.gallery)
                                        : [1, 2, 3, 4, 5, 6];

                                    return items.map((g, i) => {
                                        const isDummy = typeof g === 'number';
                                        const imageUrl = isDummy
                                            ? `https://images.unsplash.com/photo-1512404514574-8b63adce7499?q=80&w=400&auto=format&fit=crop&sig=${g + 10}`
                                            : `${BASE_URL}${g.image_url}`;
                                        const description = isDummy ? undefined : g.description;

                                        return (
                                            <div key={isDummy ? `dummy-dup-${g}-${i}` : `gal-dup-${g.id}-${i}`} className="w-[60vw] md:w-[22vw] flex-shrink-0 whitespace-normal">
                                                <div className={`rounded-[2.5rem] overflow-hidden shadow-xl bg-black relative aspect-[3/4] group/card w-full h-full`}>
                                                    <img
                                                        src={imageUrl}
                                                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 opacity-90 group-hover/card:opacity-100"
                                                        alt={description || "Cliente Apple Office"}
                                                        draggable={false}
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    {description && (
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6 md:p-8 md:translate-y-4 md:group-hover/card:translate-y-0 md:opacity-0 md:group-hover/card:opacity-100 transition-all duration-300 pointer-events-none h-1/2">
                                                            <p className="text-white font-bold text-sm md:text-lg leading-snug">
                                                                {description}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </section>

            {/* STORE GALLERY */}
            {(data.storeGallery && data.storeGallery.length > 0) && (
                <section id="local" className="py-16 md:py-20 px-0 bg-[#1d1d1f] overflow-hidden">
                    <div className="max-w-6xl mx-auto px-4 mb-16">
                        <RevealOnScroll>
                            <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                                <div className="max-w-2xl">
                                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">Nuestro Local</h2>
                                    <p className="text-xl text-gray-400">Un espacio diseñado para que te sientas cómodo mientras elegís tu próximo equipo.</p>
                                </div>
                                <a href="https://maps.google.com/maps?q=Av.%20Moreno%20Sur%20828,%20Santiago%20Del%20Estero" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline flex items-center gap-2 shrink-0">
                                    Ver ubicación <ArrowRight className="w-4 h-4" />
                                </a>
                            </div>
                        </RevealOnScroll>
                    </div>

                    <RevealOnScroll>
                        <div className="flex overflow-hidden relative w-full group pb-16">
                            {/* Reverse marquee: right-to-left via scale(-1) trick on wrapper */}
                            <div className="flex animate-marquee-reverse group-hover:[animation-play-state:paused] whitespace-nowrap min-w-max pr-3 md:pr-6 gap-3 md:gap-6">
                                {(() => {
                                    const items = data.storeGallery.length < 5
                                        ? [...data.storeGallery, ...data.storeGallery, ...data.storeGallery]
                                        : data.storeGallery;
                                    return items.map((g, i) => (
                                        <div key={`store-${g.id}-${i}`} className="w-[60vw] md:w-[22vw] flex-shrink-0 whitespace-normal">
                                            <div className="rounded-[2.5rem] overflow-hidden shadow-xl bg-gray-900 relative aspect-[3/4] group/card w-full h-full">
                                                <img
                                                    src={`${BASE_URL}${g.image_url}`}
                                                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 opacity-80 group-hover/card:opacity-100"
                                                    alt={g.description || 'Apple Office Local'}
                                                    draggable={false}
                                                        loading="lazy"
                                                        decoding="async"
                                                />
                                                {g.description && (
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6 md:p-8 md:translate-y-4 md:group-hover/card:translate-y-0 md:opacity-0 md:group-hover/card:opacity-100 transition-all duration-300 pointer-events-none h-1/2">
                                                        <p className="text-white font-bold text-sm md:text-lg leading-snug">{g.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                            <div className="flex animate-marquee-reverse group-hover:[animation-play-state:paused] whitespace-nowrap min-w-max pr-3 md:pr-6 gap-3 md:gap-6" aria-hidden="true">
                                {(() => {
                                    const items = data.storeGallery.length < 5
                                        ? [...data.storeGallery, ...data.storeGallery, ...data.storeGallery]
                                        : data.storeGallery;
                                    return items.map((g, i) => (
                                        <div key={`store-dup-${g.id}-${i}`} className="w-[60vw] md:w-[22vw] flex-shrink-0 whitespace-normal">
                                            <div className="rounded-[2.5rem] overflow-hidden shadow-xl bg-gray-900 relative aspect-[3/4] group/card w-full h-full">
                                                <img
                                                    src={`${BASE_URL}${g.image_url}`}
                                                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 opacity-80 group-hover/card:opacity-100"
                                                    alt={g.description || 'Apple Office Local'}
                                                    draggable={false}
                                                        loading="lazy"
                                                        decoding="async"
                                                />
                                                {g.description && (
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-6 md:p-8 md:translate-y-4 md:group-hover/card:translate-y-0 md:opacity-0 md:group-hover/card:opacity-100 transition-all duration-300 pointer-events-none h-1/2">
                                                        <p className="text-white font-bold text-sm md:text-lg leading-snug">{g.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </RevealOnScroll>
                </section>
            )}

            {/* LOCATION */}
            <section id="ubicacion" className="py-16 md:py-20 px-4 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-block bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full font-bold text-sm mb-6">Visítanos</div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-8">Un espacio verde para tu tecnología.</h2>

                        <div className="flex items-start gap-5 mb-10 p-6 bg-gray-50 rounded-3xl">
                            <MapPin className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">Ubicación Oficial</h4>
                                <p className="text-gray-500 mt-2 text-lg">Av. Moreno Sur 828 <br /> (Entre Congreso y San Juan)<br />Santiago Del Estero, Argentina.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-5 p-6 bg-gray-50 rounded-3xl">
                            <Clock className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                            <div>
                                <h4 className="text-xl font-bold text-gray-900">Horarios</h4>
                                <ul className="text-gray-500 mt-2 text-lg space-y-3">
                                    <li className="flex justify-between border-b pb-2"><span>Lunes a Viernes</span> <strong className="text-gray-900">09:30 - 13:00 / 18:00 - 22:00</strong></li>
                                    <li className="flex justify-between border-b pb-2"><span>Sábados</span> <strong className="text-gray-900">10:00 - 13:00 / 18:00 - 21:15</strong></li>
                                    <li className="flex justify-between"><span>Domingos</span> <strong className="text-gray-400">Cerrado</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[3rem] overflow-hidden shadow-2xl h-[400px] md:h-[600px] border border-gray-100 relative group">
                        <div className="absolute inset-0 bg-emerald-600/10 pointer-events-none mix-blend-multiply z-10 group-hover:opacity-0 transition-opacity duration-700"></div>
                        <iframe
                            src="https://maps.google.com/maps?q=Av.%20Moreno%20Sur%20828,%20Santiago%20Del%20Estero&t=m&z=16&output=embed&iwloc=near"
                            width="100%"
                            height="100%"
                            className="absolute inset-0 z-0"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy">
                        </iframe>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            {(data.faqs && data.faqs.length > 0) && (
                <section id="faq" className="py-20 px-4 bg-[#fbfbfd]">
                    <div className="max-w-4xl mx-auto">
                        <RevealOnScroll>
                            <div className="text-center mb-16">
                                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">Preguntas Frecuentes</h2>
                                <p className="text-xl text-gray-500">Todo lo que necesitas saber antes de tu próxima compra.</p>
                            </div>
                        </RevealOnScroll>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.faqs.map((faq, i) => (
                                <RevealOnScroll key={faq.id} delay={i * 100}>
                                    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 h-full">
                                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-start gap-4">
                                            <span className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
                                                <HelpCircle className="w-5 h-5" />
                                            </span>
                                            {faq.question}
                                        </h3>
                                        <p className="text-gray-500 leading-relaxed font-medium">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </RevealOnScroll>
                            ))}
                        </div>
                    </div>
                </section>
            )}


            {/* FOOTER */}
            <footer className="bg-[#1d1d1f] py-16 px-4 text-center text-gray-400">
                <img src="/logo.png" alt="Apple Office Logo" className="w-16 h-16 mx-auto mb-8 object-contain opacity-50 hover:opacity-100 transition-opacity brightness-0 invert" />
                <h3 className="text-xl font-bold text-white mb-2">Apple Office</h3>
                <p className="mb-8">Av. Moreno Sur 828, Santiago del Estero, Argentina.</p>
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center w-full max-w-6xl mx-auto gap-4 text-xs md:text-sm px-4">
                    <p>© {new Date().getFullYear()} Apple Office. Todos los derechos reservados.</p>
                    <p className="flex items-center gap-1.5 text-gray-500">
                        Desarrollado con ❤️ por
                        <a href="https://wa.me/5493855200492" target="_blank" rel="noreferrer" className="text-emerald-500 font-bold hover:text-emerald-400 transition-colors bg-emerald-500/10 px-2 py-1 rounded-md">
                            APX Software
                        </a>
                    </p>
                </div>
            </footer>

            {/* SOCIAL FLOATING CTAs */}
            <div className="fixed bottom-6 right-4 md:right-6 z-50 flex flex-col gap-3 md:gap-4 scale-90 md:scale-100 origin-bottom-right">
                {/* INSTAGRAM */}
                <a
                    href="https://www.instagram.com/appleoffice.sgo/"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white p-4 rounded-full shadow-xl hover:scale-110 hover:-translate-x-1 transition-all duration-300 flex items-center justify-center group relative"
                >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    <span className="absolute right-20 bg-black text-white px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none">
                        Instagram
                    </span>
                </a>

                {/* WHATSAPP */}
                <a
                    href="https://wa.me/5493855953712"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500 text-white p-4 rounded-full shadow-xl hover:scale-110 hover:-translate-x-1 transition-all duration-300 flex items-center justify-center group relative"
                >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="absolute right-20 bg-black text-white px-3 py-1.5 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl pointer-events-none">
                        ¡Chateá con nosotros!
                    </span>
                </a>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col text-left p-8 bg-gray-50/50 rounded-[2.5rem] hover:bg-emerald-50 transition-colors duration-300 group border border-gray-100">
            <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
            <p className="text-gray-500 leading-relaxed text-lg">{desc}</p>
        </div>
    );
}

function RevealOnScroll({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        // En un navegador sin IntersectionObserver el contenido quedaría invisible para siempre.
        if (!('IntersectionObserver' in window)) {
            const t = setTimeout(() => setIsVisible(true), 0);
            return () => clearTimeout(t);
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
}
