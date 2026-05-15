import React, { useState } from 'react';
import { useCajaStore } from '../../../store/cajaStore';
import type { JornadaCaja } from '../types';

export const AperturaCaja: React.FC = () => {
  const [monto, setMonto] = useState<number>(0);
  const abrirCajaGlobal = useCajaStore((state) => state.abrirCaja);

  const handleApertura = (): void => {
    // Simulamos la creación de jornada siguiendo el esquema de la BD [cite: 22, 24]
    const nuevaJornada: JornadaCaja = {
      id_jornada_caja: Math.floor(Math.random() * 1000),
      id_asignacion_caja_turno: 1,
      id_usuario_apertura: 1, 
      monto_inicial: monto, 
      estado: 'ABIERTA',
      fecha_hora_apertura: new Date().toISOString(),
    };

    abrirCajaGlobal(nuevaJornada);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--color-background)]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border-2 border-[var(--color-primary)]">
        <h1 className="text-[var(--text-title)] font-bold text-center text-[var(--color-primary)] mb-2">
          Apertura de Caja
        </h1>
        <p className="text-[var(--text-content)] text-gray-600 text-center mb-8">
          Ingresa el monto inicial para comenzar el turno.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monto Inicial (Bs)
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonto(Number(e.target.value))}
            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-[var(--color-primary)] outline-none transition-all text-2xl font-bold text-center"
            placeholder="0.00"
            min="0"
          />
        </div>

        <button
          onClick={handleApertura}
          className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white rounded-xl font-bold text-lg transition-colors shadow-md"
        >
          Iniciar Jornada
        </button>
      </div>
    </div>
  );
};