/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#25D366',
          teal: '#128C7E',
          darkTeal: '#075E54',
          lightGreen: '#d9fdd3',
          bgDark: '#111b21',
          panelDark: '#202c33',
          borderDark: '#222d34',
          chatBgDark: '#0b141a',
          bubbleOutDark: '#005c4b',
          bubbleInDark: '#202c33',
          tickBlue: '#53bdeb',
          tickGray: '#8696a0'
        }
      }
    },
  },
  plugins: [],
}
