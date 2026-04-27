import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CAMBIA ESTA LÍNEA: de './index.css' a './styles/globals.css'
import './styles/globals.css' 
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)