/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: '#ff6b18',
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#ff6b18',
          600: '#e65100',
        },
        navy: {
          DEFAULT: '#0d2238',
          900: '#091726',
          800: '#0d2238',
          700: '#1e293b',
        },
        emerald: {
          DEFAULT: '#0b9e58',
          50: '#e8f7ee',
          500: '#0b9e58',
          600: '#098047',
        }
      }
    },
  },
  plugins: [],
}
