import { useState, useEffect } from 'react';
import { clientFlowApi } from '../../../shared/api/client-flow.api';
import { FeedbackModal } from '../../../shared/components/FeedbackModal';

interface ReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tableId: number;
  tableNumber: number;
  tableCapacity: number; // Capacidad definida en la base de datos
  waiterId: number; // ID del mesero o cliente que registra
  isClientRole?: boolean; // Si es true, omite el paso 2
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const AVAILABLE_HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export function ReservationModal({ 
  open, 
  onClose, 
  onSuccess, 
  tableId, 
  tableNumber, 
  tableCapacity, 
  waiterId,
  isClientRole = false
}: ReservationModalProps) {
  const [step, setStep] = useState<'TIME' | 'CLIENT'>('TIME');
  
  // --- ESTADOS DE FECHA Y HORA ---
  const now = new Date();
  const [mes, setMes] = useState(MONTHS[now.getMonth()]);
  const [dia, setDia] = useState(String(now.getDate()));
  const [horaInicio, setHoraInicio] = useState('08:00');

  // --- ESTADOS DE CLIENTE ---
  const [ci, setCi] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [customerData, setCustomerData] = useState({ 
    id: null as number | null, 
    nombre: '', 
    apellido: '', 
    contacto: '' 
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success'|'error'|'info', title: string, message: string} | null>(null);

  // 1. LIMPIEZA DE DATOS: Reseteamos todo al abrir o cerrar el modal para evitar persistencia entre mesas
  useEffect(() => {
    if (open) {
      setStep('TIME');
      setCi('');
      setCustomerFound(false);
      setCustomerData({ id: null, nombre: '', apellido: '', contacto: '' });
      const currentNow = new Date();
      setMes(MONTHS[currentNow.getMonth()]);
      setDia(String(currentNow.getDate()));
    }
  }, [open]);


  const handleSearchCI = async () => {
    if (!ci.trim()) return;
    setIsSearching(true);
    try {
      const found = await clientFlowApi.findClientByCI(ci);
      if (found) {
        setCustomerData({ 
          id: Number(found.id.replace('u-', '')), 
          nombre: found.nombre, 
          apellido: found.apellido, 
          contacto: found.correo || '' 
        });
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
        setCustomerData({ id: null, nombre: '', apellido: '', contacto: '' });
        setFeedback({ type: 'info', title: 'Modo Invitado', message: 'CI no registrado. Por favor completa los datos manualmente.' });
      }
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'Fallo al buscar el cliente en el servidor.' });
    } finally { 
      setIsSearching(false); 
    }
  };

  const validateReservationDateTime = (): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthIdx = MONTHS.indexOf(mes);
    const dayNum = Number(dia);
    const [hourStr, minStr] = horaInicio.split(':');
    
    const reservationDate = new Date(currentYear, monthIdx, dayNum, Number(hourStr), Number(minStr), 0, 0);
    
    if (reservationDate < now) {
      const reservationDay = new Date(currentYear, monthIdx, dayNum, 0, 0, 0, 0);
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      
      if (reservationDay < todayDay) {
        setFeedback({
          type: 'error',
          title: 'Fecha no válida',
          message: 'No puedes realizar una reserva para un día anterior al actual.'
        });
      } else {
        setFeedback({
          type: 'error',
          title: 'Hora no válida',
          message: 'No puedes realizar una reserva para una hora en el pasado.'
        });
      }
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateReservationDateTime()) {
      setStep('CLIENT');
    }
  };

  const handleFinalConfirm = async () => {
    if (!validateReservationDateTime()) return;
    setIsSubmitting(true);
    try {
      const currentYear = new Date().getFullYear();
      const monthIdx = MONTHS.indexOf(mes) + 1;
      const formattedDate = `${currentYear}-${String(monthIdx).padStart(2, '0')}-${dia.padStart(2, '0')}`;
      
      const payload = {
        userId: isClientRole ? waiterId : customerData.id, // si es cliente, él mismo es el userId
        registeredById: waiterId,
        table: { id: tableId },
        date: formattedDate,
        time: horaInicio,
        people: tableCapacity, // Siempre usa la capacidad total de la mesa
        observations: isClientRole 
          ? 'Reserva creada desde el panel de cliente.'
          : (customerData.id 
            ? 'Reserva de cliente registrado.' 
            : `INVITADO: ${customerData.nombre} ${customerData.apellido} | CI: ${ci} | Correo: ${customerData.contacto}`)
      };

      // Usamos 'never' para evitar el error de 'any' en el lint
      await clientFlowApi.createReservation(payload as never);
      
      setFeedback({ type: 'success', title: '¡Mesa Reservada!', message: 'La reserva se ha registrado exitosamente.' });
      setTimeout(() => { 
        onSuccess(); 
        onClose(); 
      }, 1500);
    } catch {
      setFeedback({ type: 'error', title: 'Error', message: 'No se pudo crear la reserva. Inténtalo de nuevo.' });
    } finally { 
      setIsSubmitting(false); 
    }
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
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-black uppercase mb-1">DÍA</label>
                  <select value={dia} onChange={(e) => setDia(e.target.value)} className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2 text-[14px] font-bold bg-[#F2E9DC] outline-none">
                    {Array.from({length: 31}, (_, i) => <option key={i+1} value={String(i+1)}>{i+1}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase mb-1">HORA DE INICIO (24H)</label>
                <select value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="w-full appearance-none rounded-[12px] border-2 border-black px-3 py-2 text-[14px] font-bold bg-[#F2E9DC] outline-none">
                  {AVAILABLE_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
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
                onClick={isClientRole ? handleFinalConfirm : handleNextStep}
                disabled={isSubmitting}
                className="w-full bg-[#c25134] text-white py-3.5 rounded-[12px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-[13px] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-50"
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

              {/* INDICADOR DE TIPO DE CLIENTE */}
              <div className={`rounded-xl px-4 py-2 text-center border-2 ${customerFound ? 'bg-success/10 border-success text-success' : 'bg-gray-100 border-black text-gray-600'}`}>
                <p className="text-[10px] font-black uppercase">
                  {customerFound ? 'Cliente Registrado ✅' : 'Modo Invitado 👤'}
                </p>
              </div>

              <button 
                onClick={handleFinalConfirm} 
                disabled={isSubmitting}
                className="w-full bg-[#c25134] text-white py-3.5 rounded-[12px] font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase text-[13px] mt-2 active:shadow-none"
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