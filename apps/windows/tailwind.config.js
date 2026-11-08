/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: '#0A0C10',
          elevated: '#141820',
          overlay: '#1A202C',
          subtle: '#222735',
          hover: '#2D3446',
        },
        brand: {
          primary: '#3B82F6',
          accent: '#6366F1',
          highlight: '#60A5FA',
        },
      },
    },
  },
  plugins: [],
}

