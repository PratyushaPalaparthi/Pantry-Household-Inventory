/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
            // Matched to the shared design tokens in the portal's theme.css.
            // Previously cyan, which made this app read as a different product
            // the moment you arrived from the launcher.
            50: '#eef7f1',
            100: '#d6ecdf',
            200: '#aedcbf',
            300: '#85c99e',
            400: '#6cc08a',
            500: '#4aa06c',
            600: '#2f7a4f',
            700: '#266241',
            800: '#1f4e34',
            900: '#1a4029',
            950: '#0d2317',
          },
        dark: {
          50: '#f8fafc',
          100: '#e6ecf3',
          200: '#cfd8e4',
          300: '#a8b4c6',
          400: '#77869e',
          500: '#55647d',
          600: '#3c4b63',
          700: '#2a364b',
          800: '#1d2738',
          900: '#131a28',
          950: '#0a0f19',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        heading: ['Sora', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'soft-pulse': 'softPulse 2.2s ease-in-out infinite',
        'float': 'float 7s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
