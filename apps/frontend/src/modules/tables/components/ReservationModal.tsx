import { useState } from 'react';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mes: string, dia: string, hora: string) => void;
  isLoading?: boolean;
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export function ReservationModal({ open, onClose, onConfirm, isLoading }: ReservationModalProps) {
  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const currentDay = String(now.getDate());

  const [mes, setMes] = useState(currentMonth);
  const [dia, setDia] = useState(currentDay);
  const [horaInicio, setHoraInicio] = useState('08:00');

  if (!open) return null;

  const isToday = mes === currentMonth && dia === currentDay;
  const startHour24 = isToday ? Math.max(8, now.getHours() + 1) : 8;

  const availableHours = [];
  for (let h = 8; h <= 23; h++) {
    if (h >= startHour24) {
      availableHours.push(`${h.toString().padStart(2, '0')}:00`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[340px] rounded-[24px] bg-[#F2E9DC] p-6 shadow-xl relative border-2 border-black">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#1c1c1c] hover:bg-black/5 p-1 rounded-xl transition-colors"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className="text-[28px] font-bold tracking-tight text-[#1c1c1c]">Reserva</h2>
        <p className="mt-1 text-[15px] font-medium text-[#8c8c8c] mb-6">Fecha de reserva</p>

        <div className="mb-6">
          <p className="mb-3 text-[10px] font-black tracking-wide text-[#1c1c1c] uppercase">FECHA</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[13px] font-bold text-[#1c1c1c] mb-1.5">Mes</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2.5 text-[15px] font-bold text-[#1c1c1c] bg-[#F2E9DC] outline-none focus:ring-2 focus:ring-[#c25134]"
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                >
                  {['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#1c1c1c]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 11l-5-5-5 5M17 13l-5 5-5-5" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="w-[100px]">
              <label className="block text-[13px] font-bold text-[#1c1c1c] mb-1.5">Dia</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2.5 text-[15px] font-bold text-[#1c1c1c] bg-[#F2E9DC] outline-none focus:ring-2 focus:ring-[#c25134]"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                >
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#1c1c1c]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 11l-5-5-5 5M17 13l-5 5-5-5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-3 text-[10px] font-black tracking-wide text-[#1c1c1c] uppercase">TIEMPO DE RESERVA</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[13px] font-bold text-[#1c1c1c] mb-1.5">Hora Inicio</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2.5 text-[15px] font-bold text-[#1c1c1c] bg-[#F2E9DC] outline-none focus:ring-2 focus:ring-[#c25134]"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                >
                  {availableHours.length > 0 ? availableHours.map(time => (
                    <option key={time} value={time}>{time}</option>
                  )) : (
                    <option value="" disabled>No hay horas disponibles hoy</option>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#1c1c1c]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 11l-5-5-5 5M17 13l-5 5-5-5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[12px] bg-white p-3 border-2 border-[#eab308] flex items-start gap-3">
          <svg className="w-5 h-5 text-[#eab308] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-[12px] font-bold text-[#1c1c1c] leading-tight">
            Tiene una hora de tolerancia para llegar al restaurante, de lo contrario la reserva se cancelará automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-[12px] border-2 border-black bg-[#F2E9DC] py-2.5 text-[14px] font-bold text-[#1c1c1c] transition-colors hover:bg-black/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(mes, dia, horaInicio)}
            disabled={isLoading}
            className="flex-1 rounded-[12px] border-2 border-[#c25134] bg-[#c25134] py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#a6432b] hover:border-[#a6432b] disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
