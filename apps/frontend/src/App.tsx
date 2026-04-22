import { useState } from 'react';
// Imports de Auth
import RoleSelection from './modules/auth/RoleSelection';
import { LoginForm } from './modules/auth/LoginForm';
import ForgotPassword from './modules/auth/ForgotPassword';
import { RegisterForm } from './modules/auth/RegisterForm';

// --- NUEVOS IMPORTS (Punto de entrada real) ---
import { CajeroDashboard } from './modules/cajero/CajeroDashboard';

function App() {
  const [step, setStep] = useState<'role' | 'login' | 'forgot' | 'register' | 'dashboard'>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const manejarEntrada = () => {
    setStep('dashboard');
  };

  const cerrarSesion = () => {
    setStep('role');
    setSelectedRole('');
  };

  return (
    <main className="min-h-screen bg-background font-sans text-text-dark antialiased">
      
      {/* FLUJO DE AUTENTICACIÓN */}
      {step === 'role' && (
        <RoleSelection onSelectRole={(role) => { setSelectedRole(role); setStep('login'); }} />
      )}
      
      {step === 'login' && (
        <LoginForm 
          rol={selectedRole}
          alVolver={() => setStep('role')}
          alOlvidar={() => setStep('forgot')}
          alRegistrar={() => setStep('register')}
          alEntrar={manejarEntrada} 
        />
      )}

      {/* FLUJO DINÁMICO POR CARPETAS */}
      {step === 'dashboard' && (
        <div className="animate-in fade-in duration-700 h-screen">
           {/* Aquí cargamos el componente real del Cajero */}
           {selectedRole === 'CAJA' ? (
             <CajeroDashboard alSalir={cerrarSesion} />
           ) : (
             /* Mensaje temporal para los roles que aún no desarrollamos */
             <div className="flex flex-col items-center justify-center h-full gap-4">
                <h2 className="text-2xl font-bold">Módulo {selectedRole} en desarrollo</h2>
                <button 
                  onClick={cerrarSesion} 
                  className="px-6 py-2 bg-primary text-white rounded-full font-bold"
                >
                  Cerrar Sesión
                </button>
             </div>
           )}
        </div>
      )}

      {/* FLUJO DE RECUPERACIÓN Y REGISTRO */}
      {step === 'forgot' && <ForgotPassword alVolver={() => setStep('login')} />}
      {step === 'register' && <RegisterForm alVolver={() => setStep('login')} />}

    </main>
  );
}

export default App;