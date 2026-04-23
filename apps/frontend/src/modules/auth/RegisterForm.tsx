import React, { useState } from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';

interface RegisterFormProps {
  alVolver: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ alVolver }) => {
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
          <h3 className="mb-1 text-xl font-bold text-text">Registrarse</h3>
          <p className="text-sm text-gray-600">
            Por favor, introduce tu información personal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: 'Nombres', type: 'text' },
            { label: 'Apellidos', type: 'text' },
            { label: 'Nombre de usuario', type: 'text' },
            { label: 'Correo electrónico', type: 'email' },
            { label: 'Contraseña', type: 'password' },
          ].map((field) => (
            <div key={field.label} className="flex flex-col gap-1.5 text-left">
              <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-text">
                {field.label}
              </label>
              <input
                required
                type={field.type}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none transition-all focus:border-primary"
              />
            </div>
          ))}

          <div className="mt-2 flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="terms"
              required
              className="h-5 w-5 cursor-pointer accent-primary"
            />
            <label
              htmlFor="terms"
              className="cursor-pointer text-sm font-semibold text-text"
            >
              Acepto los términos del acuerdo
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-4 text-sm font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
            >
              Registrar
            </button>

            <button
              type="button"
              onClick={alVolver}
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-sm font-bold uppercase tracking-widest text-text hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </AuthLayout>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h4 className="mb-8 text-xl font-bold text-text">¿Confirmar registro?</h4>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-bold text-text hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-white hover:bg-primary-hover"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h4 className="mb-8 text-xl font-bold text-text">Registro exitoso</h4>
            <button
              onClick={alVolver}
              className="w-full rounded-2xl bg-primary py-4 font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
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