import { create } from 'zustand';
import type { JornadaCaja } from '../modules/cajero/types';

interface CajaState {
  jornada: JornadaCaja | null;
  estaAbierta: boolean;
  abrirCaja: (nuevaJornada: JornadaCaja) => void;
  cerrarCaja: () => void;
}

export const useCajaStore = create<CajaState>()((set) => ({
  jornada: null,
  estaAbierta: false,
  abrirCaja: (nuevaJornada: JornadaCaja) =>
    set({ jornada: nuevaJornada, estaAbierta: true }),
  cerrarCaja: () => set({ jornada: null, estaAbierta: false }),
}));