/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        baloo: ['"Baloo 2"', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        orange: '#FF6B35',
        purple: '#6C4BF6',
        pink: '#FF6B9D',
        teal: '#2DD4BF',
        pawbg: '#FFFBF7',
        pawborder: '#EDE8FF',
        pawlight: '#F3F0FF',
        pawdark: '#1E1347',
      },
    },
  },
  plugins: [],
}
