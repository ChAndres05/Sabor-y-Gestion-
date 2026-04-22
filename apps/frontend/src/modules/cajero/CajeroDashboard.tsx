import React from 'react';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';

const MESAS_MOCK = [
  { id: 1, nombre: 'Mesa 1', estado: 'Libre' },
  { id: 2, nombre: 'Mesa 2', estado: 'Ocupada' },
  { id: 3, nombre: 'Mesa 3', estado: 'Libre' },
  { id: 4, nombre: 'Mesa 4', estado: 'Ocupada' },
  { id: 5, nombre: 'Mesa 5', estado: 'Libre' },
  { id: 6, nombre: 'Mesa 6', estado: 'Libre' },
  { id: 7, nombre: 'Mesa 7', estado: 'Ocupada' },
  { id: 8, nombre: 'Mesa 8', estado: 'Libre' },
];

export const CajeroDashboard = ({ alSalir }: { alSalir: () => void }) => {
  return (
    <div className="flex h-screen bg-[#F6EBDD] overflow-hidden w-full">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white shadow-xl flex flex-col items-center py-8">
        <div className="mb-12 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-primary rotate-45 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold -rotate-45">P</span>
          </div>
          <span className="font-black text-xs tracking-[0.3em] text-primary">PRISMA-BOL</span>
        </div>
        <nav className="flex-1 w-full px-4 space-y-2">
          <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/20">
            <LayoutDashboard size={20}/>
            <span className="text-sm">Dashboard</span>
          </button>
          <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-text-muted hover:bg-gray-50 transition-all">
            <UtensilsCrossed size={20}/>
            <span className="text-sm">Mesas</span>
          </button>
        </nav>
        <button onClick={alSalir} className="mt-auto flex items-center gap-4 px-6 py-4 text-text-muted font-bold hover:text-red-500 transition-colors">
          <LogOut size={20}/>
          <span>Cerrar Sesión</span>
        </button>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 bg-white/50 backdrop-blur-md flex items-center justify-between px-10 border-b border-white">
          <h2 className="text-xl font-black text-text-dark uppercase tracking-widest">Panel de Mesas</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary leading-none uppercase">Cajero</p>
              <p className="text-sm font-bold text-text-dark">Cristhian G.</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-primary">
              <User size={20} />
            </div>
          </div>
        </header>

        <section className="p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {MESAS_MOCK.map((mesa) => (
              <div key={mesa.id} className="bg-white p-8 rounded-[2.5rem] shadow-premium hover:shadow-2xl transition-all border border-white">
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${mesa.estado === 'Libre' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <UtensilsCrossed className={mesa.estado === 'Libre' ? 'text-green-600' : 'text-red-600'} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-black text-text-dark">{mesa.nombre}</h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${mesa.estado === 'Libre' ? 'text-green-600' : 'text-red-600'}`}>
                      {mesa.estado}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};