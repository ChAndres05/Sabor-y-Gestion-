import React from 'react';
import type { AuthUser } from '../../modules/auth/types/auth.types';

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
              onClick={() => { onClose(); onLogout(); }}
              className="w-full bg-white text-[var(--color-primary)] py-2 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors shadow-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    </div>
  );
};
