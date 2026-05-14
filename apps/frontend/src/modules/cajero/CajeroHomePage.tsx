import React, { useState, useMemo } from 'react';
import { useCajaStore } from '../../store/cajaStore';
import { AperturaCaja } from './components/AperturaCaja';
import { ModalProcesarPago } from './components/ModalProcesarPago';
import { Sidebar } from '../../shared/components/Sidebar';
import { mockMesasFacturacion, mockDetallesMesa5, mockMovimientosDia } from '../../shared/mocks/cajaMocks';
import type { AuthUser } from '../auth/types/auth.types';
import type { PagoConfirmacion, MesaCajero } from './types';

interface CajeroHomeProps { user: AuthUser; onLogout: () => void; onOpenSidebar: () => void; defaultView?: ViewState; }
type ViewState = 'facturacion' | 'cierre';

export const CajeroHomePage: React.FC<CajeroHomeProps> = ({ user, onLogout, onOpenSidebar, defaultView }) => {
  const { estaAbierta, jornada, cerrarCaja } = useCajaStore();
  const [activeView, setView] = useState<ViewState>(defaultView || 'facturacion');
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaCajero | null>(null);

  React.useEffect(() => {
    if (defaultView) {
      setView(defaultView);
    }
  }, [defaultView]);

  const [movimientos, setMovimientos] = useState(mockMovimientosDia);
  const [montoContado, setMontoContado] = useState<number>(0);
  const [showConfirmCierre, setShowConfirmCierre] = useState(false);
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({ motivo: '', monto: 0 });

  const stats = useMemo(() => {
    const ventasEfectivo = movimientos.filter(m => m.tipo === 'efectivo' && m.monto > 0).reduce((acc, curr) => acc + curr.monto, 0);
    const ventasTransf = movimientos.filter(m => m.tipo === 'transferencia').reduce((acc, curr) => acc + curr.monto, 0);
    const gastosTotal = Math.abs(movimientos.filter(m => m.monto < 0).reduce((acc, curr) => acc + curr.monto, 0));
    const efectivoEnCaja = (jornada?.monto_inicial || 0) + ventasEfectivo - gastosTotal;
    const totalVentas = ventasEfectivo + ventasTransf;
    const ventasTotales = totalVentas + (jornada?.monto_inicial || 0);
    return { totalVentas, ventasEfectivo, ventasTransf, efectivoEnCaja, gastos: gastosTotal, ventasTotales };
  }, [jornada, movimientos]);

  if (!estaAbierta) return <AperturaCaja />;

  const handleFinalizarPago = (datos: PagoConfirmacion): void => {
    const trx = { id: `TRX-${Date.now()}`, referencia: `Mesa ${mesaSeleccionada?.numero}`, tipo: datos.metodo_pago.toLowerCase() as 'efectivo' | 'transferencia', monto: datos.monto_pagado, hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMovimientos([trx, ...movimientos]);
    setMesaSeleccionada(null);
  };

  const registrarGasto = () => {
    if (nuevoGasto.motivo && nuevoGasto.monto > 0) {
      const gasto = { id: `GAS-${Date.now()}`, referencia: nuevoGasto.motivo, tipo: 'efectivo' as const, monto: -Math.abs(nuevoGasto.monto), hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMovimientos([gasto, ...movimientos]);
      setShowGastoModal(false);
      setNuevoGasto({ motivo: '', monto: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col font-sans">
      <header className="bg-white p-4 md:p-6 shadow-sm border-b flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <button onClick={onOpenSidebar} className="p-2 text-[var(--color-primary)] text-2xl">☰</button>
          <div>
            <h1 className="text-[var(--text-subtitle)] font-bold text-[var(--color-primary)] leading-tight">
              {activeView === 'facturacion' ? 'Facturación' : 'Cierre de Caja'}
            </h1>
            {/* AQUÍ USAMOS 'user' PARA QUE EL LINTER ESTÉ FELIZ */}
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Cajero: {user.nombre} {user.apellido}</p>
          </div>
        </div>
        <button onClick={onLogout} className="p-3 bg-[var(--color-alert)]/10 text-[var(--color-alert)] rounded-full hover:bg-[var(--color-alert)] hover:text-white transition-all shadow-sm">
          <span className="text-lg">⏻</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {activeView === 'facturacion' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockMesasFacturacion.map(mesa => (
                <button key={mesa.id_mesa} onClick={() => setMesaSeleccionada(mesa)} className="bg-[var(--color-primary)] p-6 rounded-3xl shadow-lg text-white text-left relative overflow-hidden transition-all hover:scale-105">
                  <h3 className="font-bold text-2xl mb-1">Mesa {mesa.numero}</h3>
                  <p className="text-3xl font-black">Bs {mesa.total_acumulado?.toFixed(2)}</p>
                  <div className="absolute -right-6 -bottom-6 bg-white/10 w-32 h-32 rounded-full blur-2xl" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[var(--color-primary)] text-white p-6 rounded-3xl flex justify-between items-center shadow-lg">
                <div><h2 className="text-xl font-bold">Jornada Activa ✓</h2><p className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Desde: {new Date(jornada?.fecha_hora_apertura || '').toLocaleTimeString()}</p></div>
                <button onClick={() => setShowConfirmCierre(true)} className="bg-white text-[var(--color-primary)] px-6 py-2 rounded-xl font-bold uppercase text-xs shadow-md">Cerrar Caja</button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-primary)] text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Efectivo Esperado</p>
                  <p className="text-2xl font-black text-[var(--color-process)]">Bs {stats.efectivoEnCaja.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-info)] text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Transferencias</p>
                  <p className="text-2xl font-black text-[var(--color-info)]">Bs {stats.ventasTransf.toFixed(2)}</p>
                </div>
                {/*Ventas Totales*/}

                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-primary)] text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ventas Turno</p>
                  <p className="text-2xl font-black text-[var(--color-primary)]">Bs {stats.totalVentas.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-[var(--color-success)] text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Ventas Totales</p>
                  <p className="text-2xl font-black text-[var(--color-success)]">Bs {stats.ventasTotales.toFixed(2)}</p>
                </div>

              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between mb-4">
                  <h3 className="font-bold text-[var(--color-primary)]">Movimientos</h3>
                  <button onClick={() => setShowGastoModal(true)} className="text-[10px] bg-[var(--color-alert)] text-white px-3 py-1 rounded-full uppercase font-bold hover:brightness-110">+ Gasto Extra</button>
                </div>
                <div className="space-y-2">
                  {movimientos.map(m => (
                    <div key={m.id} className="flex justify-between items-center p-4 border-b border-dashed last:border-0 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="text-sm"><b>{m.referencia}</b><p className="text-[10px] text-gray-400 uppercase font-medium">{m.hora} • {m.tipo}</p></div>
                      <div className={`font-bold ${m.monto > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-alert)]'}`}>
                        {m.monto > 0 ? '+' : ''}Bs {m.monto.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL GASTO EXTRA */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border border-white/20">
            <h2 className="text-xl font-bold text-[var(--color-primary)] mb-6 text-center uppercase tracking-tight">Registrar Gasto</h2>
            <input type="text" placeholder="Motivo" className="w-full p-4 bg-gray-50 rounded-2xl mb-4 outline-none border-2 border-transparent focus:border-[var(--color-primary)] font-medium" onChange={(e) => setNuevoGasto({ ...nuevoGasto, motivo: e.target.value })} />
            <input type="number" min="0" onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} placeholder="Monto (Bs)" className="w-full p-4 bg-gray-50 rounded-2xl mb-6 text-center text-2xl font-black border-2 border-transparent focus:border-[var(--color-primary)] outline-none" onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: Number(e.target.value) })} />
            <div className="flex gap-3">
              <button onClick={() => setShowGastoModal(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 uppercase text-xs">Cancelar</button>
              <button onClick={registrarGasto} className="flex-1 py-4 bg-[var(--color-primary)] text-white rounded-2xl font-bold shadow-lg uppercase text-xs">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIERRE FINAL */}
      {showConfirmCierre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--color-primary)] w-full max-w-md p-8 rounded-[3rem] text-white shadow-2xl border-2 border-white/10 animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-6 text-center tracking-tighter uppercase italic">Arqueo de Caja</h2>
            <div className="space-y-4 mb-8 text-sm opacity-90 border-b border-white/10 pb-6 font-bold text-center">
              <p>Efectivo Esperado: Bs {stats.efectivoEnCaja.toFixed(2)}</p>
              <p className="text-[9px] opacity-40 font-normal italic">* Transferencias (Bs {stats.ventasTransf.toFixed(2)}) auditadas digitalmente.</p>
            </div>
            <input type="number" autoFocus min="0" onKeyDown={(e) => ["-", "+", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => setMontoContado(Math.max(0, Number(e.target.value)))} className="w-full bg-black/20 p-5 rounded-3xl text-3xl font-black text-center border-2 border-white/20 outline-none mb-8 focus:border-white transition-all" placeholder="0.00" />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmCierre(false)} className="py-4 border border-white/30 rounded-2xl font-bold uppercase text-xs">Cancelar</button>
              <button onClick={() => { const dif = montoContado - stats.efectivoEnCaja; alert(`Cierre exitoso. Diferencia: Bs ${dif.toFixed(2)}`); cerrarCaja(); onLogout(); }} className="py-4 bg-white text-[var(--color-primary)] rounded-2xl font-black uppercase text-xs shadow-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {mesaSeleccionada && <ModalProcesarPago numeroMesa={mesaSeleccionada.numero} detalles={mockDetallesMesa5} ci_cliente={mesaSeleccionada.ci_cliente} nombre_cliente={mesaSeleccionada.nombre_cliente} onClose={() => setMesaSeleccionada(null)} onConfirmarPago={handleFinalizarPago} />}
    </div>
  );
};