/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './App.jsx'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#090A0F',
          surface: '#121520',
          border: '#1F2438',
          accent: '#FF2E4C',
          hover: '#E50914'
        }
      }
    }
  },
  plugins: []
};
