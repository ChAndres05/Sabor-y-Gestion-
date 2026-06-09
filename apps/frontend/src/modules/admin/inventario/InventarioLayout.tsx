import { useState } from 'react';
import CatalogoInsumos from './CatalogoInsumos';
import DashboardMovimientos from './DashboardMovimientos';

type TabView = 'dashboard' | 'catalogo';

interface InventarioLayoutProps {
  onBack: () => void;
}

export default function InventarioLayout({ onBack }: InventarioLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');

  return (
    <main className="min-h-full bg-background px-4 py-6 text-text flex flex-col font-sans">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col">
        
        {/* Cabecera Alineada */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-[28px] leading-none text-text hover:text-primary transition-colors"
          >
            ☰
          </button>

          <h1 className="text-title font-bold text-text">Gestión de inventario</h1>
          <p className="mt-1 text-[14px] leading-5 text-gray-500">
            Control de almacén, stock mínimo y catálogo de insumos.
          </p>

          {/* Pestañas estilo "píldora" */}
          <div className="mt-6 mb-2 flex rounded-2xl bg-white/70 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 rounded-xl px-4 py-2 text-[14px] font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard y Movimientos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalogo')}
              className={`flex-1 rounded-xl px-4 py-2 text-[14px] font-semibold transition-all ${
                activeTab === 'catalogo'
                  ? 'bg-white text-text shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Catálogo de Insumos
            </button>
          </div>
        </div>

        {/* Contenido Dinámico */}
        <div className="mt-4 flex-1">
          {activeTab === 'dashboard' ? <DashboardMovimientos /> : <CatalogoInsumos />}
        </div>
      </div>
    </main>
  );
}