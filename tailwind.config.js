/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fffac2',
          200: '#fff185',
          300: '#ffe147',
          400: '#ffc745',
          500: '#f7a41b',
          600: '#d97d10',
          700: '#b45b0f',
          800: '#924613',
          900: '#783b14',
          950: '#461e07',
        },
        slate: {
          850: '#151e2e',
          950: '#070b12',
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideIn: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideUp: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}

