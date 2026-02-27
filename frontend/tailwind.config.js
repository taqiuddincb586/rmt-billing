/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        teal: {
          300: '#7dd4e8',
          400: '#3dbfde',
          500: '#17a2c8',
          600: '#1480a0',
          700: '#115e78',
          800: '#0f3a52',
          900: '#0d2137',
          950: '#0a1628',
        },
        cream: '#faf8f4',
        gold: '#c9964a',
      },
    },
  },
  plugins: [],
}
