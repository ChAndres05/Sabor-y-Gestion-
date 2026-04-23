/** @type {import('tailwindcss').Config} */
const COLORS = {
  primary: {
    DEFAULT: '#B44A24',
    hover: '#923b1d',
  },
  secondary: {
    DEFAULT: '#6B7A40',
  },
  background: {
    DEFAULT: '#F6EBDD',
  },
  text: {
    DEFAULT: '#000000',
  },
  alert: '#C94A3F',
  process: '#E28743',
  success: '#4F8A4B',
  info: '#4A7DA8',
};

const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
  },
  fontSize: {
    title: ['28px', { lineHeight: '36px', fontWeight: '700' }],
    subtitle: ['20px', { lineHeight: '28px', fontWeight: '600' }],
    content: ['16px', { lineHeight: '24px', fontWeight: '400' }],
  },
};

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: COLORS,
      fontFamily: TYPOGRAPHY.fontFamily,
      fontSize: TYPOGRAPHY.fontSize,
    },
  },
  plugins: [],
};