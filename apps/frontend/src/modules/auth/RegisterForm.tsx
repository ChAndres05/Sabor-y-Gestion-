import React, { useState } from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';
import { authApi } from './api/auth.api';

interface RegisterFormProps {
  onGoToLogin: () => void;
}

const initialForm = {
  nombre: '',
  apellido: '',
  username: '',
  correo: '',
  telefono: '',
  password: '',
  confirmPassword: '',
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onGoToLogin }) => {
  const [form, setForm] = useState(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenConfirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los términos del acuerdo');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmRegister = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authApi.register(form);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      setForm(initialForm);
      setAcceptedTerms(false);
    } catch (error) {
      setShowConfirmModal(false);

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se pudo completar el registro');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <AuthLayout>
        <div className="mb-6">
          <h3 className="mb-1 text-xl font-bold text-text">Registrarse</h3>
          <p className="text-sm text-gray-600">
            Por favor, introduce tu información personal
          </p>
        </div>

        <form onSubmit={handleOpenConfirm} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Nombres
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Apellidos
            </label>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => updateField('apellido', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Nombre de usuario
            </label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => updateField('username', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Correo electrónico
            </label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => updateField('correo', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Introduzca su número de teléfono
            </label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Introduzca la contraseña
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-text">
              Vuelve a introducir la contraseña
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 outline-none focus:border-primary"
              required
            />
          </div>

          <div className="mt-2 flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-5 w-5 cursor-pointer accent-primary"
            />
            <label
              htmlFor="terms"
              className="cursor-pointer text-sm font-semibold text-text"
            >
              Acepto los términos del acuerdo
            </label>
          </div>

          {errorMessage && (
            <p className="text-sm font-medium text-alert">{errorMessage}</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="submit"
              className="w-full rounded-2xl bg-primary py-4 text-sm font-bold uppercase tracking-widest text-white hover:bg-primary-hover"
            >
              Registrar
            </button>

            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-sm font-bold uppercase tracking-widest text-text hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </AuthLayout>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h4 className="mb-8 text-xl font-bold text-text">¿Confirmar registro?</h4>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-black-200 py-3 font-bold text-text hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmRegister}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[340px] rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h4 className="mb-8 text-xl font-bold text-text">Registro exitoso</h4>

            <button
              onClick={() => {
                setShowSuccessModal(false);
                onGoToLogin();
              }}
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