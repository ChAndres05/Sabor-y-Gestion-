import { useState, useMemo, useEffect } from 'react';
import SectionCard from '../../shared/components/SectionCard';
import { cajaApi, type CashTransaction } from '../../shared/api/caja.api';

interface CashHistoryPageProps {
  onBack: () => void;
}

type PaymentMethodFilter = 'ALL' | 'Efectivo' | 'QR';

export default function CashHistoryPage({ onBack }: CashHistoryPageProps) {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [cajeros, setCajeros] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCajeroId, setFilterCajeroId] = useState<number | 'ALL'>('ALL');
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD
  const [filterMethod, setFilterMethod] = useState<PaymentMethodFilter>('ALL');

  const [isCajeroFilterOpen, setIsCajeroFilterOpen] = useState(false);
  const [isMethodFilterOpen, setIsMethodFilterOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    cajaApi.getCashHistory()
      .then((data) => {
        if (isMounted) {
          setTransactions(data.transactions);
          setCajeros(data.cajeros);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Error al cargar el historial de caja');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter transactions
  const filteredHistory = useMemo(() => {
    return transactions.filter((entry) => {
      // Filter by cajero
      if (filterCajeroId !== 'ALL' && entry.cajeroId !== filterCajeroId) return false;
      
      // Filter by date
      if (filterDate) {
        const entryDate = entry.date.split('T')[0];
        if (entryDate !== filterDate) return false;
      }
      
      // Filter by payment method
      if (filterMethod !== 'ALL' && entry.paymentMethod !== filterMethod) return false;

      return true;
    });
  }, [transactions, filterCajeroId, filterDate, filterMethod]);

  // Calculate statistics based on filtered history
  const statistics = useMemo(() => {
    let total = 0;
    let totalEfectivo = 0;
    let totalQR = 0;

    filteredHistory.forEach(entry => {
      // Assuming only 'Ingreso' counts towards total in caja. 
      // If there are Egresos, maybe we subtract? Let's add Ingresos and subtract Egresos.
      const amount = entry.type === 'Ingreso' ? entry.amount : -entry.amount;
      
      total += amount;
      if (entry.paymentMethod === 'Efectivo') {
        totalEfectivo += amount;
      } else if (entry.paymentMethod === 'QR') {
        totalQR += amount;
      }
    });

    return { total, totalEfectivo, totalQR };
  }, [filteredHistory]);

  const cajeroLabel = useMemo(() => {
    if (filterCajeroId === 'ALL') return 'Todos los cajeros';
    const cajero = cajeros.find((c) => c.id === filterCajeroId);
    return cajero ? cajero.name : 'Todos los cajeros';
  }, [filterCajeroId, cajeros]);

  const methodLabel = useMemo(() => {
    if (filterMethod === 'ALL') return 'Ambos métodos';
    return filterMethod;
  }, [filterMethod]);

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6">
        <div className="shrink-0 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-xl hover:bg-black/5 text-2xl text-text"
            >
              ☰
            </button>
            <h1 className="text-2xl font-bold">Historial de Caja</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Transacciones generales y estadísticas de caja</p>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total General</span>
              <span className="text-3xl font-black text-text">Bs {statistics.total.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Efectivo</span>
              <span className="text-3xl font-black text-green-600">Bs {statistics.totalEfectivo.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">QR</span>
              <span className="text-3xl font-black text-blue-600">Bs {statistics.totalQR.toFixed(2)}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-[20px] p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
            {/* Cajero Filter */}
            <div className="relative w-full md:w-1/3">
              <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">Cajero</label>
              <button
                type="button"
                onClick={() => { setIsCajeroFilterOpen(!isCajeroFilterOpen); setIsMethodFilterOpen(false); }}
                className="flex w-full items-center justify-between rounded-xl bg-[#FDF6ED] border border-gray-200 px-4 py-3 text-sm font-semibold text-text"
              >
                <span>{cajeroLabel}</span>
                <span>˅</span>
              </button>
              {isCajeroFilterOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setFilterCajeroId('ALL'); setIsCajeroFilterOpen(false); }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-text hover:bg-gray-50"
                  >
                    Todos los cajeros
                  </button>
                  {cajeros.map((cajero) => (
                    <button
                      key={cajero.id}
                      type="button"
                      onClick={() => { setFilterCajeroId(cajero.id); setIsCajeroFilterOpen(false); }}
                      className="block w-full px-4 py-3 text-left text-sm font-medium text-text hover:bg-gray-50"
                    >
                      {cajero.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="w-full md:w-1/3">
              <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">Fecha</label>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-xl bg-[#FDF6ED] border border-gray-200 px-4 py-3 text-sm font-semibold text-text outline-none focus:border-primary"
              />
            </div>

            {/* Payment Method Filter */}
            <div className="relative w-full md:w-1/3">
              <label className="mb-2 block text-xs font-bold text-gray-500 uppercase">Método</label>
              <button
                type="button"
                onClick={() => { setIsMethodFilterOpen(!isMethodFilterOpen); setIsCajeroFilterOpen(false); }}
                className="flex w-full items-center justify-between rounded-xl bg-[#FDF6ED] border border-gray-200 px-4 py-3 text-sm font-semibold text-text"
              >
                <span>{methodLabel}</span>
                <span>˅</span>
              </button>
              {isMethodFilterOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setFilterMethod('ALL'); setIsMethodFilterOpen(false); }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-text hover:bg-gray-50"
                  >
                    Ambos métodos
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilterMethod('Efectivo'); setIsMethodFilterOpen(false); }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-text hover:bg-gray-50"
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilterMethod('QR'); setIsMethodFilterOpen(false); }}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-text hover:bg-gray-50"
                  >
                    QR
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pb-2">
          <h2 className="text-lg font-bold text-text mb-4">Lista de transacciones</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">Cargando transacciones...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No hay transacciones con los filtros seleccionados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredHistory.map((entry) => {
                const dateObj = new Date(entry.date);
                const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                const isIngreso = entry.type === 'Ingreso';
                
                return (
                  <SectionCard key={entry.id} className="relative bg-white shadow-sm rounded-[24px] p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-bold text-text line-clamp-1">{entry.description}</h3>
                          <p className="text-xs text-gray-500">#{entry.id} · {dateStr} {timeStr}</p>
                          <p className="text-[10px] font-bold text-amber-800 mt-1 uppercase tracking-wider">CAJERO: {entry.cajeroName}</p>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isIngreso ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {isIngreso ? 'INGRESO' : 'EGRESO'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="bg-[#FDF6ED] rounded-xl p-2.5 text-center flex flex-col justify-center">
                        <span className={`block text-lg font-bold ${entry.paymentMethod === 'Efectivo' ? 'text-green-600' : 'text-blue-600'}`}>
                          {entry.paymentMethod}
                        </span>
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Método</span>
                      </div>
                      <div className="bg-[#FDF6ED] rounded-xl p-2.5 text-center flex flex-col justify-center">
                        <span className={`block text-lg font-black ${isIngreso ? 'text-text' : 'text-red-500'}`}>
                          {isIngreso ? '' : '-'}Bs {entry.amount.toFixed(2)}
                        </span>
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Monto</span>
                      </div>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
