import React, { useState } from 'react';
import { AuthLayout } from '../../shared/components/AuthLayout';

type RecoveryStep = 'email' | 'code' | 'reset';

const ForgotPassword = ({ alVolver }: { alVolver: () => void }) => {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  
  // Estados para los modales finales
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const manejarGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmarReseteo = () => {
    setShowConfirm(false);
    setShowSuccess(true);
  };

  return (
    <div className="relative min-h-screen">
      <AuthLayout onBack={step === 'email' ? alVolver : () => setStep('email')}>
        
        {/* PASO 1: Ingresar Correo */}
        {step === 'email' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-text-dark mb-2">Recuperar contraseña</h3>
            <p className="text-text-muted text-sm mb-8">
              Ingresa tu correo electrónico a continuación para recuperar cuenta
            </p>
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-text-dark uppercase tracking-widest ml-1">Correo electrónico</label>
                <input 
                  type="email" 
                  placeholder="ejemplo@prisma.com"
                  className="w-full p-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setStep('code')}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all uppercase text-sm tracking-widest"
              >
                Enviar código de acceso
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Verificar Código */}
        {step === 'code' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-bold text-text-dark mb-2">Recuperar contraseña</h3>
            <p className="text-text-muted text-sm mb-8">
              Por favor, introduzca el código de 4 dígitos enviado a <br/>
              <span className="font-bold text-text-dark">{email || 'tu correo'}</span>
            </p>
            <div className="space-y-8 text-left">
              <div className="flex justify-between gap-3 px-4">
                {[1, 2, 3, 4].map((i) => (
                  <input 
                    key={i}
                    type="text" 
                    maxLength={1}
                    className="w-14 h-14 text-center text-xl font-bold bg-gray-50 border border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  />
                ))}
              </div>
              <div className="space-y-4">
                <button 
                  onClick={() => setStep('reset')}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all uppercase text-sm tracking-widest"
                >
                  Enviar
                </button>
                <p className="text-center text-sm font-medium">
                  ¿No recibiste el código? {' '}
                  <button className="text-primary font-bold hover:underline">Reenviar</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Nueva Contraseña */}
        {step === 'reset' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-xl font-bold text-text-dark mb-2">Recuperar contraseña</h3>
            <p className="text-text-muted text-sm mb-8">
              Elija una nueva contraseña para su cuenta
            </p>
            <form className="space-y-5 text-left" onSubmit={manejarGuardar}>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-text-dark uppercase tracking-widest ml-1">Nueva contraseña</label>
                <input 
                  required
                  type="password" 
                  placeholder="••••••••"
                  className="w-full p-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-text-dark uppercase tracking-widest ml-1">Confirmar contraseña</label>
                <input 
                  required
                  type="password" 
                  placeholder="••••••••"
                  className="w-full p-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* Botones Corregidos */}
              <div className="flex flex-col gap-3 mt-6">
                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all uppercase text-sm tracking-widest"
                >
                  Guardar contraseña
                </button>
                <button 
                  type="button"
                  onClick={alVolver}
                  className="w-full py-4 bg-white text-text-dark border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all uppercase text-sm tracking-widest"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </AuthLayout>

      {/* --- MODAL 1: ¿Confirmar nueva contraseña? --- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[340px] p-8 rounded-[2.5rem] shadow-2xl text-center scale-up-center">
            <h4 className="text-xl font-bold text-text-dark mb-8">¿Confirmar nueva contraseña?</h4>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-text-dark hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarReseteo}
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
          <div className="bg-white w-full max-w-[340px] p-8 rounded-[2.5rem] shadow-2xl text-center">
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

export default ForgotPassword;