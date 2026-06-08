import { useState, useMemo } from 'react';
import PageSectionTitle from '../../shared/components/PageSectionTitle';
import SectionCard from '../../shared/components/SectionCard';
import { MOCK_SERVICE_HISTORY } from '../../shared/mocks/historial-atencion.mock';
import { USER_ROLES } from '../../shared/constants/roles';

interface ServiceHistoryPageProps {
  onBack: () => void;
  userRole: string;
  userId: number;
}

export default function ServiceHistoryPage({ onBack, userRole, userId }: ServiceHistoryPageProps) {
  const [filterMeseroId, setFilterMeseroId] = useState<number | 'ALL'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const meseros = useMemo(() => {
    const uniqueMeseros = new Map<number, string>();
    MOCK_SERVICE_HISTORY.forEach((entry) => {
      uniqueMeseros.set(entry.meseroId, entry.meseroName);
    });
    return Array.from(uniqueMeseros.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  const filteredHistory = useMemo(() => {
    return MOCK_SERVICE_HISTORY.filter((entry) => {
      if (userRole === USER_ROLES.MESERO) {
        return entry.meseroId === userId;
      }
      if (filterMeseroId !== 'ALL') {
        return entry.meseroId === filterMeseroId;
      }
      return true;
    });
  }, [userRole, userId, filterMeseroId]);

  const filterLabel = useMemo(() => {
    if (filterMeseroId === 'ALL') return 'Todos';
    const mesero = meseros.find((m) => m.id === filterMeseroId);
    return mesero ? mesero.name : 'Todos';
  }, [filterMeseroId, meseros]);

  return (
    <div className="bg-background min-h-full">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-6">
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-4 text-2xl text-text"
          >
            ☰
          </button>

          <PageSectionTitle
            title="Historial de Atención"
            subtitle={userRole === USER_ROLES.ADMIN ? "Historial de todos los meseros" : "Tu historial de atención"}
          />

          {userRole === USER_ROLES.ADMIN && (
            <div className="relative mb-6 mt-6 max-w-xs">
              <label className="mb-2 block text-sm font-semibold text-text">Filtrar por Mesero</label>
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white"
              >
                <span>{filterLabel}</span>
                <span>˅</span>
              </button>

              {isFilterOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMeseroId('ALL');
                      setIsFilterOpen(false);
                    }}
                    className="block w-full px-4 py-3 text-left text-sm text-text hover:bg-gray-50"
                  >
                    Todos
                  </button>

                  {meseros.map((mesero) => (
                    <button
                      key={mesero.id}
                      type="button"
                      onClick={() => {
                        setFilterMeseroId(mesero.id);
                        setIsFilterOpen(false);
                      }}
                      className="block w-full px-4 py-3 text-left text-sm text-text hover:bg-gray-50"
                    >
                      {mesero.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 mt-6 border-t border-primary/20" />
        </div>

        <div className="pb-2">
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No hay historial disponible.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredHistory.map((entry) => {
                const durationMin = Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000);
                const startTimeStr = new Date(entry.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <SectionCard key={entry.id} className="relative bg-white shadow-sm rounded-[24px] p-5">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-text">Mesa {entry.tableNumber}</h3>
                        <p className="text-xs text-gray-500">#{entry.id} · {startTimeStr}</p>
                        {userRole === USER_ROLES.ADMIN && (
                          <p className="text-xs font-semibold text-amber-800 mt-1">MESERO: {entry.meseroName.toUpperCase()}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${entry.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.status === 'completed' ? 'COMPLETADO' : 'CANCELADO'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-[#FDF6ED] rounded-xl p-2.5 text-center">
                        <span className="block text-base font-bold text-text">{entry.customerCount}</span>
                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Clientes</span>
                      </div>
                      <div className="bg-[#FDF6ED] rounded-xl p-2.5 text-center">
                        <span className="block text-base font-bold text-text">{durationMin} min</span>
                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Tiempo</span>
                      </div>
                      <div className="bg-[#FDF6ED] rounded-xl p-2.5 text-center">
                        <span className="block text-base font-bold text-text">Bs {entry.totalAmount.toFixed(2)}</span>
                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">Total</span>
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
