import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../shared/components/AuthLayout';
import { authApi } from './api/auth.api';
import type { AuthSession } from './types/auth.types';

interface LoginFormProps {
  onLoginSuccess: (session: AuthSession) => void;
  onGoToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  onGoToRegister,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const session = await authApi.login({
        identifier,
        password,
      });

      onLoginSuccess(session);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <AuthLayout>
        <h3 className="mb-2 text-[18px] font-bold uppercase text-text">
          Iniciar sesión
        </h3>

        <p className="mb-6 text-[14px] leading-6 text-gray-500">
          Ingresa tu nombre de usuario o correo electrónico para acceder a tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Nombre de usuario o correo electrónico
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="juanito123 o juanito@gmail.com"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Contraseña
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-[14px] text-text outline-none transition-all focus:border-primary"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-primary"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>

          <p className="mt-2 text-center text-[14px] text-text">
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={onGoToRegister}
              className="font-bold underline transition-colors hover:text-primary"
            >
              Regístrate
            </button>
          </p>
        </form>
      </AuthLayout>

      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-[340px] rounded-[2rem] bg-white px-6 pb-6 pt-10 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="absolute right-4 top-4 text-[18px] font-bold text-text hover:text-primary"
            >
              ✕
            </button>

            <p className="mb-6 text-[18px] font-semibold text-text">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};