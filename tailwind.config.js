/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './parks/**/*.html', './scripts/gen.js', './scripts/guides.js', './scripts/areas.js', './scripts/page-kit.js'],
  theme: {
    screens: {
      xs: '400px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        meadow: { DEFAULT: '#2E7D32', dark: '#1B5E20', deep: '#14532D', light: '#EAF6EC' },
        sky: { DEFAULT: '#0369A1', light: '#E0F2FE' },
        sun: { DEFAULT: '#D97706', light: '#FEF3C7' },
        bark: '#57534E',
        cream: '#FDFBF7',
        ink: '#1F2937',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,83,45,0.05), 0 8px 24px -12px rgba(20,83,45,0.18)',
        lift: '0 12px 32px -12px rgba(20,83,45,0.32)',
      },
    },
  },
};
