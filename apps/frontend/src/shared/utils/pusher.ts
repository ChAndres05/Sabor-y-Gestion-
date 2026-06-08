import Pusher from 'pusher-js';

// Usamos las variables de entorno de Vite
export const pusherClient = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
});