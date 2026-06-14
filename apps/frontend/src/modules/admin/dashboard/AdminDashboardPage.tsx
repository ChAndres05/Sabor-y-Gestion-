import { useState } from 'react';
import { Menu, User, FileDown, Sheet, ArrowUp } from 'lucide-react';

interface AdminDashboardPageProps {
  onBack: () => void;
  userName?: string;
}

type TabType = 'hoy' | 'semana' | 'mes';

const MOCK_DATA = {
  hoy: {
    ventas: '$3,475.20',
    porcentaje: '+12%',
    platos: [
      { nombre: 'Carpaccio de Res', u: 120, pct: '80%' },
      { nombre: 'Salmón al Horno', u: 90, pct: '60%' },
      { nombre: 'Pique Macho', u: 60, pct: '45%' }
    ],
    horas: {
      pico: '01 PM',
      picoIndex: 3,
      barras: ['25%', '45%', '60%', '90%', '55%', '40%', '25%']
    },
    meseros: [
      { nombre: 'Juan Gómez', ventas: '$345.20', pedidos: 30, tipo: 'Frecuente' },
      { nombre: 'Ana Pérez', ventas: '$152.20', pedidos: 20, tipo: 'Nuevo' },
      { nombre: 'Luis Díaz', ventas: '$35.30', pedidos: 10, tipo: 'Ocasional' }
    ]
  },
  semana: {
    ventas: '$24,580.50',
    porcentaje: '+8%',
    platos: [
      { nombre: 'Pique Macho', u: 540, pct: '85%' },
      { nombre: 'Lomo Saltado', u: 420, pct: '65%' },
      { nombre: 'Carpaccio de Res', u: 310, pct: '50%' }
    ],
    horas: {
      pico: '02 PM',
      picoIndex: 4,
      barras: ['30%', '50%', '70%', '85%', '95%', '60%', '35%']
    },
    meseros: [
      { nombre: 'Ana Pérez', ventas: '$2,450.00', pedidos: 180, tipo: 'VIP' },
      { nombre: 'Juan Gómez', ventas: '$2,100.50', pedidos: 150, tipo: 'Frecuente' },
      { nombre: 'Luis Díaz', ventas: '$1,850.30', pedidos: 110, tipo: 'Nuevo' }
    ]
  },
  mes: {
    ventas: '$98,400.00',
    porcentaje: '+15%',
    platos: [
      { nombre: 'Pique Macho', u: 2100, pct: '90%' },
      { nombre: 'Chicharrón', u: 1850, pct: '75%' },
      { nombre: 'Salmón al Horno', u: 1500, pct: '60%' }
    ],
    horas: {
      pico: '01 PM',
      picoIndex: 3,
      barras: ['40%', '60%', '80%', '100%', '75%', '50%', '30%']
    },
    meseros: [
      { nombre: 'Juan Gómez', ventas: '$9,800.00', pedidos: 650, tipo: 'VIP' },
      { nombre: 'Luis Díaz', ventas: '$8,450.00', pedidos: 520, tipo: 'Frecuente' },
      { nombre: 'Ana Pérez', ventas: '$7,900.20', pedidos: 480, tipo: 'Ocasional' }
    ]
  }
};

const X_AXIS_LABELS = ['10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM'];

export default function AdminDashboardPage({ onBack, userName = 'Juanito Perez' }: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('hoy');
  const data = MOCK_DATA[activeTab];

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors">
          <Menu className="w-8 h-8" strokeWidth={2.5} />
        </button>
        <div className="flex-1 px-4">
          <h1 className="text-2xl font-bold leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 italic">Gestión y Sabor (BI)</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 bg-[#F4EFE6] rounded-full border border-gray-800 flex items-center justify-center overflow-hidden">
            <User className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
          </div>
          <span className="text-[10px] text-gray-800 mt-1">{userName}</span>
        </div>
      </div>

      <div className="px-6 pb-24 space-y-6 flex-1 overflow-y-auto">
        {/* Tabs */}
        <div className="bg-white rounded-full p-1.5 flex shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('hoy')}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'hoy' ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setActiveTab('semana')}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'semana' ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setActiveTab('mes')}
            className={`flex-1 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 ${
              activeTab === 'mes' ? 'bg-[#B3401B] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Este Mes
          </button>
        </div>

        {/* Net Sales */}
        <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Ventas Netas {activeTab === 'hoy' ? 'Hoy' : activeTab === 'semana' ? 'Esta Semana' : 'Este Mes'}</h3>
          <div className="flex items-center justify-center gap-3 transition-opacity duration-300">
            <span className="text-4xl font-bold text-[#B3401B] tracking-tight">{data.ventas}</span>
            <div className="flex items-center text-green-600">
              <ArrowUp className="w-4 h-4 mr-1" strokeWidth={3} />
              <span className="text-sm font-bold">({data.porcentaje})</span>
            </div>
          </div>
        </div>

        {/* Top Selling Dishes */}
        <div className="bg-[#48729A] rounded-2xl p-5 text-white shadow-md">
          <h3 className="text-sm mb-4">Platos Más Vendidos (Top 3)</h3>
          <div className="space-y-4">
            {data.platos.map((plato, idx) => (
              <div key={idx} className="flex items-center gap-4 transition-all duration-500">
                <span className="text-sm w-32 font-medium truncate">{plato.nombre}</span>
                <div className="flex-1 flex h-2.5 bg-[#F4EFE6] rounded-full overflow-hidden">
                  <div className="bg-[#B3401B] transition-all duration-1000 ease-out" style={{ width: plato.pct }}></div>
                </div>
                <span className="text-xs w-10 text-right">{plato.u} u.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-[#48729A] rounded-2xl p-5 shadow-md">
          <h3 className="text-sm text-white mb-8 text-center font-medium">Horas Pico de Ventas</h3>
          <div className="relative h-32 flex items-end justify-around px-2">
            {/* Tooltip for Peak */}
            <div 
              className="absolute top-2 -translate-x-1/2 bg-[#F4EFE6] text-gray-800 text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap z-10 transition-all duration-500"
              style={{ left: `calc((100% / 7) * ${data.horas.picoIndex} + (100% / 14))` }}
            >
              Pico: {data.horas.pico}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#F4EFE6] rotate-45"></div>
            </div>

            {/* Bars */}
            {data.horas.barras.map((height, idx) => (
              <div 
                key={idx} 
                className={`w-6 rounded-t-sm transition-all duration-1000 ease-out ${idx === data.horas.picoIndex ? 'bg-[#B3401B] relative z-0' : 'bg-[#F4EFE6]'}`} 
                style={{ height }}
              ></div>
            ))}
          </div>
          <div className="flex justify-around text-[10px] text-white mt-3 px-2 font-medium">
            {X_AXIS_LABELS.map((label, idx) => (
              <span key={idx} className="w-6 text-center">{label}</span>
            ))}
          </div>
        </div>

        {/* Waiter Performance */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-6 text-center">Rendimiento de Meseros (Top {activeTab === 'hoy' ? 'Hoy' : activeTab === 'semana' ? 'Semanal' : 'Mensual'})</h3>
          
          <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-2 mb-4 text-[11px] font-bold text-gray-800 uppercase tracking-wider text-center">
            <span className="text-left">Mesero</span>
            <span>Ventas</span>
            <span>Pedidos</span>
            <span>Tipo Cliente</span>
          </div>

          <div className="space-y-4">
            {data.meseros.map((mesero, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1.5fr] gap-2 items-center text-center transition-opacity duration-300">
                <div className="flex items-center gap-2 text-left overflow-hidden">
                  <div className="w-7 h-7 shrink-0 bg-transparent border-2 border-gray-800 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-800" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 truncate">{mesero.nombre}</span>
                </div>
                <span className="text-xs font-medium text-gray-800">{mesero.ventas}</span>
                <span className="text-xs font-medium text-gray-800">{mesero.pedidos}</span>
                <span className="text-xs font-medium text-[#B3401B]">{mesero.tipo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <button className="bg-[#B3401B] text-white rounded-xl py-3 px-2 flex items-center justify-center gap-2 text-[11px] font-bold shadow-md hover:bg-[#8A3114] transition-colors">
            DESCARGAR PDF
            <FileDown className="w-4 h-4" />
          </button>
          <button className="bg-[#CDE8D4] text-gray-800 rounded-xl py-3 px-2 flex items-center justify-center gap-2 text-[11px] font-bold shadow-md hover:bg-[#B5DAC0] transition-colors">
            EXPORTAR EXCEL
            <Sheet className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
