/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        barolo: {
          navy: 'var(--barolo-navy, #1B2A4A)',
          'navy-dark': 'var(--barolo-navy-dark, #0F172A)',
          'navy-light': 'var(--barolo-navy-light, #2D4373)',
          gold: 'var(--barolo-gold, #C5A059)',
          'gold-light': 'var(--barolo-gold-light, #E8D5AC)',
          'gold-soft': 'var(--barolo-gold-soft, #FEF9EE)',
          'gold-dark': 'var(--barolo-gold-dark, #967432)',
          surface: 'var(--barolo-surface, #F8FAFC)',
          card: 'var(--barolo-card, #FFFFFF)',
          border: 'var(--barolo-border, #E2E8F0)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Montserrat"', 'sans-serif'],
        brand: ['"Montserrat"', 'sans-serif'],
        montserrat: ['"Montserrat"', 'sans-serif'],
        script: ['"Lobster"', 'cursive'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -5px rgba(27, 42, 74, 0.08), 0 4px 6px -2px rgba(27, 42, 74, 0.04)',
        'luxury-hover': '0 20px 35px -5px rgba(27, 42, 74, 0.12), 0 8px 10px -4px rgba(27, 42, 74, 0.06)',
      }
    },
  },
  plugins: [],
}
