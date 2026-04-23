import React from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';

interface LoginFormProps {
  alEntrar: () => void;
  alRegistrar: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  alEntrar,
  alRegistrar,
}) => {
  return (
    <AuthLayout>
      <h3 className="mb-2 text-lg font-bold uppercase text-text">
        Iniciar sesión
      </h3>

      <p className="mb-6 text-sm text-gray-600">
        Ingresa tu nombre de usuario o correo electrónico para acceder a tu cuenta.
      </p>

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          alEntrar();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-text">
            Nombre de usuario o correo electrónico
          </label>
          <input
            type="text"
            className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-text">
            Contraseña
          </label>
          <input
            type="password"
            className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-primary py-4 font-bold text-white hover:bg-primary-hover"
        >
          Iniciar sesión
        </button>

        <p className="mt-2 text-center text-sm text-text">
          ¿No tienes una cuenta?{' '}
          <button
            type="button"
            onClick={alRegistrar}
            className="font-bold underline hover:text-primary"
          >
            Regístrate
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};