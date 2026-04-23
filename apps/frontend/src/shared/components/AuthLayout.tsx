import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-8 top-8 font-bold text-primary hover:scale-105"
        >
          ← VOLVER
        </button>
      )}

      <header className="mb-10 text-center">
        <h1 className="mb-2 text-title font-bold tracking-[0.2em] text-text">
          GESTIÓN Y SABOR
        </h1>
      </header>

      <div className="mb-8 flex w-full max-w-[320px] justify-center rounded-[3rem] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rotate-45 rounded-sm bg-primary" />
          <span className="text-xl font-bold tracking-tight text-text">
            PRISMA-BOL
          </span>
        </div>
      </div>

      <h2 className="mb-8 text-subtitle font-semibold text-text">¡Bienvenido!</h2>

      <div className="w-full max-w-md rounded-[2.5rem] border border-white/50 bg-white p-10 shadow-xl">
        {children}
      </div>
    </div>
  );
};