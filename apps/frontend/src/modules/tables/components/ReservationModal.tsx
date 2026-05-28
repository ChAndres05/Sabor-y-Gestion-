import { useState, useMemo, useEffect } from 'react';
import { clientFlowApi } from '../../../shared/api/client-flow.api';
import { FeedbackModal } from '../../../shared/components/FeedbackModal';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tableId: number;
  tableNumber: number;
  tableCapacity: number;
  waiterId: number;
  isClientRole?: boolean;
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export function ReservationModal({ 
  open, onClose, onSuccess, tableId, tableNumber, tableCapacity, waiterId, isClientRole = false
}: ReservationModalProps) {
  const [step, setStep] = useState<'TIME' | 'CLIENT'>('TIME');
  
  // --- ESTADO BASE DE TIEMPO ---
  // Memorizamos el momento exacto en el que se abre el modal
  const now = useMemo(() => new Date(), [open]);
  const currentMonthIdx = now.getMonth();
  const currentDay = now.getDate();
  const currentHour = now.getHours();

  const [mes, setMes] = useState(MONTHS[currentMonthIdx]);
  const [dia, setDia] = useState(String(currentDay));
  const [horaInicio, setHoraInicio] = useState('');

  // --- ESTADOS DE CLIENTE ---
  const [ci, setCi] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [customerData, setCustomerData] = useState({ id: null as number | null, nombre: '', apellido: '', contacto: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error'|'info', title: string, message: string} | null>(null);

  // 1. CÁLCULO DINÁMICO DE FECHAS (Bloqueo de "Viaje en el tiempo")
  const availableMonths = useMemo(() => MONTHS.slice(currentMonthIdx), [currentMonthIdx]);

  const availableDays = useMemo(() => {
    const selectedMonthIdx = MONTHS.indexOf(mes);
    const isCurrentMonth = selectedMonthIdx === currentMonthIdx;
    
    // Obtener la cantidad real de días del mes seleccionado (ej: Febrero 28, Mayo 31)
    const daysInMonth = new Date(now.getFullYear(), selectedMonthIdx + 1, 0).getDate();
    
    // Si es el mes actual y ya pasó la hora de cierre (23:00), el día de hoy ya no está disponible
    const startDay = (isCurrentMonth && currentHour >= 23) ? currentDay + 1 : (isCurrentMonth ? currentDay : 1);
    
    const days = [];
    for (let i = startDay; i <= daysInMonth; i++) days.push(String(i));
    return days;
  }, [mes, currentMonthIdx, currentDay, currentHour, now]);

  const availableHours = useMemo(() => {
    const selectedMonthIdx = MONTHS.indexOf(mes);
    const isCurrentDay = selectedMonthIdx === currentMonthIdx && Number(dia) === currentDay;
    
    // Si es hoy, la primera hora disponible es la hora actual + 1. (Nunca menor a las 8:00)
    const startHour = isCurrentDay ? Math.max(8, currentHour + 1) : 8;
    
    const hours = [];
    for (let h = startHour; h <= 23; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return hours;
  }, [mes, dia, currentMonthIdx, currentDay, currentHour]);

  // 2. AUTO-CORRECCIÓN DE ESTADOS
  // Si el usuario cambia a un mes donde el día seleccionado no es válido, lo corregimos
  useEffect(() => {
    if (availableDays.length > 0 && !availableDays.includes(dia)) {
      setDia(availableDays[0]);
    }
  }, [availableDays, dia]);

  // Si el usuario cambia de día/mes, ajustamos la hora a la primera disponible válida
  useEffect(() => {
    if (availableHours.length > 0 && !availableHours.includes(horaInicio)) {
      setHoraInicio(availableHours[0]);
    }
  }, [availableHours, horaInicio]);

  // Limpieza inicial
  useEffect(() => {
    if (open) {
      setStep('TIME');
      setCi('');
      setCustomerFound(false);
      setCustomerData({ id: null, nombre: '', apellido: '', contacto: '' });
      setMes(MONTHS[now.getMonth()]);
      setDia(String(now.getDate()));
    }
  }, [open, now]);

  const handleSearchCI = async () => {
    if (!ci.trim()) return;
    setIsSearching(true);
    try {
      const found = await clientFlowApi.findClientByCI(ci);
      if (found) {
        setCustomerData({ id: Number(found.id.replace('u-', '')), nombre: found.nombre, apellido: found.apellido, contacto: found.correo || '' });
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
        setCustomerData({ id: null, nombre: '', apellido: '', contacto: '' });
        setFeedback({ type: 'info', title: 'Modo Invitado', message: 'CI no registrado. Por favor completa los datos manualmente.' });
      }
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Fallo al buscar el cliente en el servidor.' });
    } finally { setIsSearching(false); }
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    try {
      const currentYear = now.getFullYear();
      const monthIdx = MONTHS.indexOf(mes) + 1;
      const formattedDate = `${currentYear}-${String(monthIdx).padStart(2, '0')}-${dia.padStart(2, '0')}`;
      
      const payload = {
        userId: isClientRole ? waiterId : customerData.id,
        registeredById: waiterId,
        table: { id: tableId },
        date: formattedDate,
        time: horaInicio,
        people: tableCapacity,
        observations: isClientRole 
          ? 'Reserva creada desde el panel de cliente.'
          : (customerData.id ? 'Reserva de cliente registrado.' : `INVITADO: ${customerData.nombre} ${customerData.apellido} | CI: ${ci} | Correo: ${customerData.contacto}`)
      };

      await clientFlowApi.createReservation(payload as never);
      setFeedback({ type: 'success', title: '¡Mesa Reservada!', message: 'La reserva se ha registrado exitosamente.' });
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo crear la reserva. Inténtalo de nuevo.' });
    } finally { setIsSubmitting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[360px] rounded-[24px] bg-[#F2E9DC] p-6 shadow-xl border-2 border-black relative font-sans">
        <button onClick={onClose} className="absolute right-4 top-4 text-black hover:bg-black/5 p-1 rounded-full transition-colors">✕</button>
        
        <h2 className="text-[26px] font-black text-[#1c1c1c] mb-1">Mesa {tableNumber}</h2>
        <p className="text-[14px] font-bold text-[#8c8c8c] mb-6">
          {step === 'TIME' ? 'Paso 1: ¿Cuándo?' : 'Paso 2: ¿Quién?'}
        </p>

        {step === 'TIME' ? (
          <div className="animate-in fade-in">
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase mb-1">MES</label>
                  <select value={mes} onChange={(e) => setMes(e.target.value)} className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2 text-[14px] font-bold bg-[#F2E9DC] outline-none focus:ring-2 focus:ring-[#c25134]">
                    {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-black uppercase mb-1">DÍA</label>
                  <select value={dia} onChange={(e) => setDia(e.target.value)} className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2 text-[14px] font-bold bg-[#F2E9DC] outline-none">
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">HORA DE INICIO (24H)</label>
                {availableHours.length > 0 ? (
                  <select value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2 text-[14px] font-bold bg-[#F2E9DC] outline-none">
                    {availableHours.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                ) : (
                  <div className="rounded-xl bg-red-100 p-3 border-2 border-red-200">
                    <p className="text-[12px] font-bold text-red-600 text-center">No hay horarios disponibles hoy.</p>
                  </div>
                )}
              </div>

              {/* CAPACIDAD FIJA */}
              <div className="rounded-xl bg-black/5 p-3 border-2 border-black/10">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Capacidad Definida</p>
                <p className="text-[16px] font-black text-[#1c1c1c]">{tableCapacity} Personas</p>
              </div>

              {/* AVISO DE TOLERANCIA */}
              <div className="rounded-[12px] bg-white/60 p-3 border-2 border-[#eab308] flex gap-2">
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] font-bold text-black/70 leading-tight">La reserva dura 1 hora. Si no hay consumo tras ese tiempo, la mesa volverá a estar LIBRE.</p>
              </div>

              <button 
                onClick={isClientRole ? handleFinalConfirm : () => setStep('CLIENT')}
                disabled={isSubmitting || availableHours.length === 0}
                className="w-full bg-[#c25134] text-white py-3.5 rounded-[12px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-[13px] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-x-0 disabled:active:translate-y-0"
              >
                {isSubmitting ? 'Procesando...' : (isClientRole ? 'Confirmar Reserva' : 'Siguiente')}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setStep('TIME')} className="text-[11px] font-black underline mb-4 uppercase">← Volver al tiempo</button>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black mb-1 uppercase">Documento CI / NIT</label>
                <div className="flex gap-2">
                  <input type="text" value={ci} onChange={(e) => setCi(e.target.value)} className="flex-1 bg-white border-2 border-black rounded-[12px] p-2 text-[14px] font-bold outline-none" placeholder="Buscar..." />
                  <button onClick={handleSearchCI} disabled={isSearching} className="bg-black text-white px-4 rounded-[12px] font-black text-[11px] uppercase">{isSearching ? '...' : 'Buscar'}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Nombre</label>
                  <input placeholder="NOMBRE" value={customerData.nombre} disabled={customerFound} onChange={(e) => setCustomerData({...customerData, nombre: e.target.value})} className="bg-white border-2 border-black rounded-[12px] p-2 text-[12px] font-bold disabled:opacity-50" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Apellido</label>
                  <input placeholder="APELLIDO" value={customerData.apellido} disabled={customerFound} onChange={(e) => setCustomerData({...customerData, apellido: e.target.value})} className="bg-white border-2 border-black rounded-[12px] p-2 text-[12px] font-bold disabled:opacity-50" />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-500">Correo Electrónico</label>
                <input type="email" placeholder="ejemplo@correo.com" value={customerData.contacto} onChange={(e) => setCustomerData({...customerData, contacto: e.target.value})} className="w-full bg-white border-2 border-black rounded-[12px] p-2 text-[12px] font-bold outline-none" />
              </div>

              <div className={`rounded-xl px-4 py-2 text-center border-2 ${customerFound ? 'bg-success/10 border-success text-success' : 'bg-gray-100 border-black text-gray-600'}`}>
                <p className="text-[10px] font-black uppercase">{customerFound ? 'Cliente Registrado ✅' : 'Modo Invitado 👤'}</p>
              </div>

              <button 
                onClick={handleFinalConfirm} 
                disabled={isSubmitting}
                className="w-full bg-[#c25134] text-white py-3.5 rounded-[12px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-[13px] mt-2 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-x-0 disabled:active:translate-y-0"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Reserva'}
              </button>
            </div>
          </div>
        )}
      </div>
      <FeedbackModal open={Boolean(feedback)} title={feedback?.title || ''} message={feedback?.message || ''} type={feedback?.type || 'info'} onClose={() => setFeedback(null)} />
    </div>
  );
}