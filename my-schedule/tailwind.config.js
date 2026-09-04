/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0f0f0f',
        'card-bg': '#1c1c1e',
        'card-bg-light': '#2c2c2e',
        'accent-blue': '#7a9fff',
      }
    },
  },
  plugins: [],
}