/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#073b73',
          'blue-light': '#0b5b95',
          green: '#8bd329',
          'green-dark': '#5b9f18',
          sky: '#eaf5fb',
          ink: '#17324d',
          muted: '#65788a',
        }
      }
    },
  },
  plugins: [],
}
