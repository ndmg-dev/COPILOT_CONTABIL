/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'obsidian': {
          'deep': '#0F172A',
          'dark': '#0E1526',
          'panel': 'rgba(15, 23, 42, 0.75)',
          'surface': 'rgba(30, 41, 59, 0.5)',
        },
        'text': {
          'primary': '#E0E7FF',
          'secondary': '#94A3B8',
          'muted': '#475569',
        },
        'accent': {
          'teal': '#2DD4BF',
          'purple': '#818CF8',
          'purple-soft': '#6366F1',
          'neon-border': 'rgba(45, 212, 191, 0.15)',
        },
        'input': {
          'bg': 'rgba(15, 23, 42, 0.6)',
          'border': 'rgba(71, 85, 105, 0.4)',
          'focus': 'rgba(45, 212, 191, 0.3)',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        'mono': ['"Fira Code"', '"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        'glass': '20px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'glass-inset': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
        'neon': '0 0 40px rgba(45, 212, 191, 0.08), 0 0 80px rgba(129, 140, 248, 0.04)',
        'input': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'grid-move': 'gridMove 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gridMove: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(50px, 50px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}