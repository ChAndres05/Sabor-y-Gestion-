import React, { useState } from 'react';
import type { AuthUser } from '../../modules/auth/types/auth.types';
import { useCajaStore } from '../../store/cajaStore';

interface SidebarOption {
  key: string;
  label: string;
  onClick: () => void;
  active?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  options: SidebarOption[];
  sessionNumber?: string | number;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user, options, sessionNumber, onLogout }) => {
  const [showCajaAlert, setShowCajaAlert] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex">
      <div className="bg-[var(--color-primary)] w-72 h-full p-6 text-white shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-10">
          <span className="font-bold text-lg uppercase tracking-tight">Sabor & Gestión</span>
          <button onClick={onClose} className="text-2xl font-bold">&times;</button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto pr-2">
          {options.map((option) => (
            <button
              key={option.key}
              onClick={option.onClick}
              className={`w-full text-left p-4 rounded-2xl font-bold transition-all ${option.active ? 'bg-white/20 border-l-4 border-white' : 'hover:bg-white/5'
                }`}
            >
              {option.label}
            </button>
          ))}
        </nav>
        {/* PERFIL EN SIDEBAR */}
        <div className="mt-auto pt-6 border-t border-white/20">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                {user.nombre.charAt(0)}{user.apellido.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm">{user.nombre} {user.apellido}</p>
                <p className="text-xs opacity-70">Rol: {user.rol}</p>
              </div>
            </div>
            {sessionNumber && (
              <p className="mb-3 text-[10px] uppercase font-bold tracking-widest opacity-50">Sesión #{sessionNumber}</p>
            )}
            <button
              onClick={() => {
                if (user.rol === 'CAJERO' && useCajaStore.getState().estaAbierta) {
                  setShowCajaAlert(true);
                  return;
                }
                onClose();
                onLogout();
              }}
              className="w-full bg-white text-[var(--color-primary)] py-2 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* CUSTOM APP ALERT FOR CAJA */}
      {showCajaAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in zoom-in-95 text-center">
            <div className="w-16 h-16 bg-[var(--color-alert)]/10 text-[var(--color-alert)] rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
              ⚠️
            </div>
            <h3 className="text-gray-800 text-lg font-black uppercase tracking-tight mb-3">
              Caja Activa
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium">
              No puedes cerrar sesión sin antes haber cerrado la caja de tu turno.
            </p>
            <button
              onClick={() => setShowCajaAlert(false)}
              className="w-full bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-[var(--color-primary)]/90 transition-all hover:scale-[1.02]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
