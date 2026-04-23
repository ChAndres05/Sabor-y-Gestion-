import { useState } from 'react';
import { LoginForm } from './modules/auth/LoginForm';
import RegisterForm from './modules/auth/RegisterForm';

type AuthScreen = 'login' | 'register';

function App() {
  const [screen, setScreen] = useState<AuthScreen>('login');

  return (
    <main className="min-h-screen bg-background font-sans text-text antialiased">
      {screen === 'login' && (
        <LoginForm
          alEntrar={() => {
            console.log('login mock temporal');
          }}
          alRegistrar={() => setScreen('register')}
        />
      )}

      {screen === 'register' && (
        <RegisterForm alVolver={() => setScreen('login')} />
      )}
    </main>
  );
}

export default App;