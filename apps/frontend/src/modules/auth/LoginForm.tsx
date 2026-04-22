import React from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';

export const LoginForm = ({ rol, alEntrar, alVolver, alOlvidar, alRegistrar }: any) => {
  return (
    <AuthLayout rol={rol} onBack={alVolver}>
      <h3 className="text-[18px] font-bold uppercase mb-2">INICIAR SESION</h3>
      <p className="text-text-muted text-sm mb-6">
        Ingresa tu nombre de usuario o correo electrónico a continuación para acceder a tu cuenta
      </p>

      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); alEntrar(); }}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-text-dark uppercase">Nombre de usuario o correo electronico</label>
          <input type="text" className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none" />
        </div>

        <div className="relative flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-text-dark uppercase">Contraseña</label>
            <button type="button" onClick={alOlvidar} className="text-[11px] text-text-dark font-bold hover:text-primary transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <input type="password" className="w-full p-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl outline-none" />
        </div>

        <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 mt-2">
          Iniciar sesión
        </button>

        <p className="text-center text-sm font-medium text-text-dark mt-2">
          ¿No tienes una cuenta?{' '}
          <button 
            type="button" 
            onClick={alRegistrar} 
            className="text-text-dark font-bold underline hover:text-primary transition-colors"
          >
            Regístrate
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};