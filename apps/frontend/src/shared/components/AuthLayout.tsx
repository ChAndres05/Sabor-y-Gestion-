import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, onBack }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-6 top-6 text-[14px] font-bold text-primary transition-transform hover:scale-105"
        >
          ← VOLVER
        </button>
      )}

      <header className="mb-8 text-center">
        <h1 className="text-title font-bold tracking-[0.2em] text-text">
          GESTIÓN Y SABOR
        </h1>
      </header>

      <div className="mb-6 flex w-full max-w-[320px] justify-center rounded-[3rem] bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rotate-45 rounded-sm bg-primary" />
          <span className="text-[20px] font-bold tracking-tight text-text">
            PRISMA-BOL
          </span>
        </div>
      </div>

      <h2 className="mb-6 text-subtitle font-semibold text-text">¡Bienvenido!</h2>

      <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
};