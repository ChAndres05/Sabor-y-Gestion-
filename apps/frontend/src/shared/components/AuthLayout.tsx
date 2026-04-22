import React from 'react';

export const AuthLayout = ({ children, rol, onBack }: any) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Botón Volver sutil */}
      <button onClick={onBack} className="absolute top-8 left-8 text-primary font-bold hover:scale-105 transition-transform">
        ← VOLVER
      </button>

      <header className="text-center mb-10">
        <h1 className="text-2xl font-black tracking-[0.2em] mb-2">GESTIÓN Y SABOR</h1>
        {rol && <p className="text-text-muted font-bold uppercase tracking-widest text-sm">{rol}</p>}
      </header>

      {/* El contenedor del logo con la forma de tu Figma */}
      <div className="bg-white p-4 rounded-[3rem] shadow-sm mb-8 w-full max-w-[320px] flex justify-center">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rotate-45 rounded-sm" /> {/* Simboliza el rombo del logo */}
            <span className="font-bold text-xl tracking-tighter">PRISMA-BOL</span>
         </div>
      </div>

      <h2 className="text-3xl font-bold mb-8">¡Bienvenido!</h2>

      {/* Card Blanca con bordes extra suaves */}
      <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-premium border border-white/50">
        {children}
      </div>
    </div>
  );
};