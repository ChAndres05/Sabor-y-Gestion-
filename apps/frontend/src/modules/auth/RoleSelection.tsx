import React from 'react';

const ROLES = ["USUARIO", "DELIVERY", "MESERO", "CAJA", "ADMINISTRADOR"];

interface RoleSelectionProps {
  onSelectRole: (role: string) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-12 px-4">
      <h1 className="text-[28px] font-bold text-text-dark uppercase mb-12 tracking-widest">
        GESTION Y SABOR
      </h1>

      <div className="bg-white w-40 h-40 rounded-full flex items-center justify-center mb-10 shadow-sm border border-gray-100">
        <span className="text-gray-300 font-bold italic text-xl">LOGO</span>
      </div>

      <h2 className="text-[24px] font-semibold text-text-dark mb-8">¡Bienvenido!</h2>

      <div className="flex flex-col gap-4 w-full max-w-[280px]">
        {ROLES.map((rol) => (
          <button
            key={rol}
            onClick={() => onSelectRole(rol)}
            className="bg-primary hover:bg-primary-hover text-white py-3 rounded-full font-bold shadow-md transition-all active:scale-95 uppercase text-[14px] tracking-wider"
          >
            {rol}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelection; // <--- Asegúrate de que esta línea esté presente