/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: { bg: '#0f172a', surface: '#1e293b', border: '#334155' },
        light: { bg: '#f1f5f9', surface: '#ffffff', border: '#e2e8f0' },
        primary: { 500: '#3b82f6' }
      }
    },
  },
  plugins: [],
}
