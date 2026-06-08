import React, { useState } from 'react';
import { useCajaStore } from '../../../store/cajaStore';

interface AperturaCajaProps {
  onClose?: () => void;
  id_usuario_cajero?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AperturaCaja: React.FC<AperturaCajaProps> = ({ onClose, id_usuario_cajero }) => {
  const [monto, setMonto] = useState<number>(0);
  const abrirCajaGlobal = useCajaStore((state) => state.abrirCaja);

  const handleApertura = async (): Promise<void> => {
    try {
      const userId = id_usuario_cajero || 28;
      const res = await fetch(`${API_URL}/api/cajero/apertura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario_apertura: userId,
          monto_inicial: monto
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al abrir la caja');
      }

      abrirCajaGlobal(data.jornada);
      if (onClose) onClose();

    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al abrir la caja en el servidor');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 border border-white/20 relative">
        {onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </button>
        )}
        <h1 className="text-2xl font-bold text-center text-[var(--color-primary)] mb-2 uppercase tracking-tight">
          Apertura de Caja
        </h1>
        <p className="text-sm font-medium text-gray-500 text-center mb-8">
          Ingresa el monto inicial para comenzar el turno.
        </p>

        <div className="mb-6">
          <input
            type="number"
            value={monto}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonto(Number(e.target.value))}
            className="w-full p-4 bg-gray-50 rounded-2xl mb-2 text-center text-3xl font-black border-2 border-transparent focus:border-[var(--color-primary)] outline-none transition-all"
            placeholder="0.00"
            min="0"
          />
          <label className="block text-xs font-bold text-gray-400 uppercase text-center mt-2">
            Monto Inicial (Bs)
          </label>
        </div>

        <button
          onClick={handleApertura}
          className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-2xl font-bold text-sm uppercase transition-colors shadow-lg"
        >
          Iniciar Jornada
        </button>
      </div>
    </div>
  );
};