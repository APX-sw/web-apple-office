import { useState, lazy, Suspense } from 'react';
import { DataProvider } from './context/DataContext';
import LandingPage from './components/LandingPage';
// El panel de administración es grande y los clientes nunca lo abren: se descarga solo al entrar.
const AdminPanel = lazy(() => import('./components/AdminPanel'));

function MainApp() {
  const [view, setView] = useState<'simulation' | 'admin'>('simulation');

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      {view === 'simulation' ? (
        <LandingPage setView={setView} />
      ) : (
        <>
          {/* Admin top bar — same style as landing nav but simplified */}
          <header className="bg-black/90 backdrop-blur-xl sticky top-0 z-50 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              {/* Logo — same as landing */}
              <button
                onClick={() => setView('simulation')}
                className="flex items-center gap-2 group"
                title="Volver al inicio"
              >
                <img
                  src="/logo.png"
                  alt="Apple Office"
                  className="h-9 object-contain brightness-0 invert group-hover:opacity-70 transition-opacity"
                />
              </button>

              {/* Back to site */}
              <button
                onClick={() => setView('simulation')}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                ← Volver al sitio
              </button>
            </div>
          </header>

          <Suspense fallback={<div className="py-24 text-center text-gray-400 font-medium">Cargando panel…</div>}>
            <AdminPanel />
          </Suspense>
        </>
      )}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}
