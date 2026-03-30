/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f9f5',
          100: '#e1f2e7',
          200: '#c3e4d1',
          300: '#97ceb1',
          400: '#64b18c',
          500: '#40926d',
          600: '#2e7556',
          700: '#265d46',
          800: '#204a39',
          900: '#1b3d2f',
          950: '#0e221b',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}