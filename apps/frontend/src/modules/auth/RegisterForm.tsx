import React, { useState } from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';

interface RegisterFormProps {
  alVolver: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ alVolver }) => {
  // Estados para el flujo de ventanas
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    setShowSuccess(true);
  };

  return (
    <div className="relative min-h-screen">
      <AuthLayout onBack={alVolver}>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-text-dark mb-1">Registrarse</h3>
          <p className="text-text-muted text-sm">
            Por favor, introduzca su información personal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Nombres', type: 'text' },
            { label: 'Apellidos', type: 'text' },
            { label: 'Nombre de usuario', type: 'text' },
            { label: 'Correo electrónico', type: 'email' },
          ].map((field) => (
            <div key={field.label} className="flex flex-col gap-1.5 text-left">
              <label className="text-[11px] font-black text-text-dark uppercase tracking-widest ml-1">
                {field.label}
              </label>
              <input
                required
                type={field.type}
                className="w-full p-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-300"
              />
            </div>
          ))}

          <div className="flex items-center gap-3 mt-2 px-1">
            <input 
              type="checkbox" 
              id="terms"
              required
              className="w-5 h-5 accent-primary rounded-md cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-text-dark font-semibold cursor-pointer">
              Acepto los términos del acuerdo
            </label>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button 
              type="submit" 
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
            >
              Registrar
            </button>
            
            <button 
              type="button"
              onClick={alVolver}
              className="w-full py-4 bg-white text-text-dark border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all uppercase tracking-widest text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </AuthLayout>

      {/* --- MODAL 1: ¿Confirmar registro? --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] p-8 rounded-[2rem] shadow-2xl text-center scale-up-center">
            <h4 className="text-xl font-bold text-text-dark mb-8">¿Confirmar registro?</h4>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-text-dark hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Registro exitoso --- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] p-8 rounded-[2rem] shadow-2xl text-center">
            <h4 className="text-xl font-bold text-text-dark mb-8">Registro exitoso</h4>
            <button 
              onClick={alVolver}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all uppercase tracking-widest"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;