/** @type {import('tailwindcss').Config} */
export default {
  // AJUSTE AQUÍ: Aseguramos que busque en toda la carpeta src del frontend
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B44A24', // El naranja de tu Figma
          hover: '#923b1d',
        },
        secondary: {
          DEFAULT: '#6B7A40', // Verde de la paleta
        },
        background: {
          DEFAULT: '#F6EBDD', // El crema de fondo
        },
        text: {
          DEFAULT: '#2B2622', // El tono oscuro para letras
        },
        alert: '#C94A3F',
        process: '#E28743',
        success: '#4F8A4B',
        info: '#4A7DA8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Usamos nombres de clases que coincidan con tu código
      fontSize: {
        title: ['28px', { lineHeight: '36px', fontWeight: '700' }],
        subtitle: ['24px', { lineHeight: '32px', fontWeight: '600' }],
        content: ['16px', { lineHeight: '24px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
}