/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
        galaxy: {
          bg: '#0a0a1a',
          deep: '#050510',
          card: 'rgba(15, 15, 35, 0.6)',
          glass: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(139, 92, 246, 0.15)',
          hover: 'rgba(139, 92, 246, 0.08)',
          glow: 'rgba(139, 92, 246, 0.4)',
          nebula1: 'rgba(139, 92, 246, 0.12)',
          nebula2: 'rgba(59, 130, 246, 0.10)',
          nebula3: 'rgba(236, 72, 153, 0.08)',
          star: 'rgba(255, 255, 255, 0.7)',
        },
        dark: {
          bg: '#0a0a1a',
          card: 'rgba(15, 15, 35, 0.6)',
          border: 'rgba(139, 92, 246, 0.15)',
          hover: 'rgba(139, 92, 246, 0.08)',
        }
      },
      fontFamily: {
        vazirmatn: ['Vazirmatn', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};
