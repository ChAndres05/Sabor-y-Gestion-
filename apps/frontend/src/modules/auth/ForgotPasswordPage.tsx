import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../../shared/components/AuthLayout';
import { authApi } from './api/auth.api';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

type ForgotStep = 'request' | 'verify' | 'reset';

const CODE_LENGTH = 6;

export default function ForgotPasswordPage({
  onBackToLogin,
}: ForgotPasswordPageProps) {
  const [step, setStep] = useState<ForgotStep>('request');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(
    Array(CODE_LENGTH).fill('')
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = codeDigits.join('');

  const resetAll = () => {
    setStep('request');
    setEmail('');
    setCodeDigits(Array(CODE_LENGTH).fill(''));
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsSubmitting(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authApi.requestPasswordReset({ email });
      setStep('verify');
      setCodeDigits(Array(CODE_LENGTH).fill(''));

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 0);
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

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (code.length !== CODE_LENGTH) {
        throw new Error('Ingresa el código completo');
      }

      await authApi.verifyResetCode({
        email,
        code,
      });

      setStep('reset');
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

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authApi.resetPassword({
        email,
        code,
        newPassword,
        confirmPassword,
      });

      setSuccessMessage('Contraseña actualizada correctamente');
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

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await authApi.requestPasswordReset({ email });
      setCodeDigits(Array(CODE_LENGTH).fill(''));

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 0);
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

  const handleCodeChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/\D/g, '');
    const nextValue = rawValue.slice(-1);

    setCodeDigits((prev) => {
      const updated = [...prev];
      updated[index] = nextValue;
      return updated;
    });

    if (nextValue && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Backspace') {
      if (codeDigits[index]) {
        setCodeDigits((prev) => {
          const updated = [...prev];
          updated[index] = '';
          return updated;
        });
        return;
      }

      if (index > 0) {
        inputRefs.current[index - 1]?.focus();

        setCodeDigits((prev) => {
          const updated = [...prev];
          updated[index - 1] = '';
          return updated;
        });
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedValue = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH);

    if (!pastedValue) {
      return;
    }

    const nextDigits = Array(CODE_LENGTH).fill('');

    pastedValue.split('').forEach((digit, index) => {
      nextDigits[index] = digit;
    });

    setCodeDigits(nextDigits);

    const nextIndex =
      pastedValue.length >= CODE_LENGTH ? CODE_LENGTH - 1 : pastedValue.length;

    inputRefs.current[nextIndex]?.focus();
  };

  const closeSuccessModal = () => {
    setSuccessMessage('');
    resetAll();
    onBackToLogin();
  };

  return (
    <div className="relative">
      <AuthLayout>
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-[20px] font-bold text-text">
                Recuperar contraseña
              </h3>
              <p className="text-[14px] leading-6 text-gray-500">
                Ingresa tu correo electrónico para enviarte un código de acceso.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-text">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-text outline-none transition-all focus:border-primary"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar código de acceso'}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[16px] font-semibold text-text transition-all hover:bg-gray-50"
            >
              Cancelar
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
            <div>
              <h3 className="mb-2 text-[20px] font-bold text-text">
                Introduzca código de acceso
              </h3>
              <p className="text-[14px] leading-6 text-gray-500">
                Ingresa el código que enviamos a <span className="font-semibold">{email}</span>.
              </p>
            </div>

            <div className="flex justify-between gap-2">
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleCodeChange(index, event)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  onPaste={handleCodePaste}
                  className="h-12 w-12 rounded-xl border border-gray-200 bg-white text-center text-[20px] font-bold text-text outline-none transition-all focus:border-primary"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Validando...' : 'Enviar'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isSubmitting}
              className="text-center text-[14px] font-semibold text-text underline transition-colors hover:text-primary disabled:opacity-60"
            >
              Reenviar código de acceso
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[16px] font-semibold text-text transition-all hover:bg-gray-50"
            >
              Cancelar
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div>
              <h3 className="mb-2 text-[20px] font-bold text-text">
                Recuperar contraseña
              </h3>
              <p className="text-[14px] leading-6 text-gray-500">
                Introduzca su nueva contraseña.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-text">
                Introduzca la contraseña nueva
              </label>

              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="******"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-[14px] text-text outline-none transition-all focus:border-primary"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-primary"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-wide text-text">
                Vuelve a introducir la contraseña nueva
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="******"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-[14px] text-text outline-none transition-all focus:border-primary"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-primary"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[16px] font-semibold text-text transition-all hover:bg-gray-50"
            >
              Cancelar
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[14px] text-text">
          ¿No tienes una cuenta?{' '}
          <button
            type="button"
            onClick={onBackToLogin}
            className="font-bold underline transition-colors hover:text-primary"
          >
            Volver al inicio de sesión
          </button>
        </p>
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

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="relative w-full max-w-[340px] rounded-[2rem] bg-white px-6 pb-6 pt-10 text-center shadow-2xl">
            <button
              type="button"
              onClick={closeSuccessModal}
              className="absolute right-4 top-4 text-[18px] font-bold text-text hover:text-primary"
            >
              ✕
            </button>

            <p className="mb-6 text-[18px] font-semibold text-text">
              {successMessage}
            </p>

            <button
              type="button"
              onClick={closeSuccessModal}
              className="w-full rounded-2xl bg-primary px-6 py-3 text-[16px] font-bold text-white transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}