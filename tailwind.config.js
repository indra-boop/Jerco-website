/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './404.html',
    './layanan/**/*.html',
    './services/**/*.html',
    './js/**/*.js',
    './css/**/*.css',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        jerco: {
          navy: '#0F3C5C',
          blue: '#1BA0D7',
          cyan: '#22D3EE',
          orange: '#F97316',
          dark: '#082032',
          soft: '#EAF6FB',
        },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(15, 23, 42, 0.08)',
        glow: '0 0 35px rgba(34, 211, 238, 0.25)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
