import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JornadaCaja } from '../modules/cajero/types';

interface CajaState {
  jornada: JornadaCaja | null;
  estaAbierta: boolean;
  abrirCaja: (nuevaJornada: JornadaCaja) => void;
  cerrarCaja: () => void;
}

export const useCajaStore = create<CajaState>()(
  persist(
    (set) => ({
      jornada: null,
      estaAbierta: false,
      abrirCaja: (nuevaJornada: JornadaCaja) =>
        set({ jornada: nuevaJornada, estaAbierta: true }),
      cerrarCaja: () => set({ jornada: null, estaAbierta: false }),
    }),
    {
      name: 'sabor-gestion-caja', // El nombre con el que se guardará en el localStorage
    }
  )
);