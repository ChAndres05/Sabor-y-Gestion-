import React, { useState } from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';
import { authApi } from './api/auth.api';

interface RegisterFormProps {
  onGoToLogin: () => void;
}

export default function RegisterForm({ onGoToLogin }: RegisterFormProps) {
  const [ci, setCi] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [username, setUsername] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ci.trim()) {
      setErrorMessage('Ingresa tu CI');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los términos del acuerdo');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authApi.register({
        ci,
        nombre,
        apellido,
        username,
        telefono,
        correo,
        password,
        confirmPassword,
      });

      setShowSuccessModal(true);
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
      <AuthLayout onBack={onGoToLogin}>
        <h3 className="mb-2 text-subtitle font-semibold text-text">
          Registrarse
        </h3>

        <p className="mb-6 text-content text-gray-500">
          Por favor, introduzca su información personal
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              CI
            </label>
            <input
              type="text"
              value={ci}
              onChange={(e) => setCi(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="1234567"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Nombres
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="Juan"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Apellidos
            </label>
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="Gomez"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="juan_gomez"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Correo electrónico
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="juan@ejemplo.com"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Número de teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="70011223"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="******"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-wide text-text">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
              placeholder="******"
              required
            />
          </div>

          <label className="mt-2 flex items-center gap-3 text-[14px] text-text">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>Acepto los términos del acuerdo</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar'}
          </button>

          <button
            type="button"
            onClick={onGoToLogin}
            className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[16px] font-bold text-text transition-all hover:bg-gray-50"
          >
            Cancelar
          </button>
        </form>
      </AuthLayout>

      {errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-[340px] rounded-[2rem] bg-white px-6 pb-6 pt-10 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="absolute right-4 top-4 text-[18px] font-bold text-text transition-colors hover:text-primary"
              aria-label="Cerrar modal"
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

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-[340px] rounded-[2rem] bg-white px-6 pb-6 pt-10 text-center shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute right-4 top-4 text-[18px] font-bold text-text transition-colors hover:text-primary"
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            <p className="mb-6 text-[18px] font-semibold text-text">
              Registro exitoso
            </p>

            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Ir al login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}